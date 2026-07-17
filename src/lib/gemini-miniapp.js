/**
 * AI Helper — CDC Đà Nẵng Zalo Mini App
 * Tách biệt hoàn toàn với Zalo OA chatbot
 * - Dành riêng cho người dân (không có logic nội bộ)
 * - Nhận lịch sử hội thoại từ client (không đọc DB messageLog)
 * - Tự động tra cứu bảng giá, lịch làm việc, tổng đài từ DB
 * - Dùng chung pool API key với Zalo OA
 */

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

// ─── Dữ liệu mặc định (fallback khi DB chưa có) ─────────────────────────────
const DEFAULT_HOTLINES = [
  { name: "Tổng đài CDC Đà Nẵng", displayPhone: "1900.988.975", description: "Tư vấn dịch vụ y tế", hours: "T2–T6: 7:00–16:30 | T7, CN: sáng" },
  { name: "Tư vấn tiêm chủng", displayPhone: "1900.988.975 – Phím 1 hoặc 2", description: "Đặt lịch, tư vấn vắc xin", hours: "T2–T6: 7:00–16:30" },
  { name: "Tư vấn sức khỏe sinh sản", displayPhone: "1900.988.975 – Phím 3", description: "Tư vấn sức khỏe sinh sản", hours: "T2–T6: 7:00–16:30" },
  { name: "Tư vấn giun sán, viêm gan, côn trùng", displayPhone: "0236.3890.414", description: "Điều trị giun sán, viêm gan B/C, xử lý côn trùng", hours: "T2–T6: 7:00–16:30" },
  { name: "Tiêm chủng Cơ sở 2 (Bàn Thạch)", displayPhone: "0235.3852.786", description: "129 Trưng Nữ Vương", hours: "T2–T7: 7:00–11:30" },
];

const DEFAULT_SCHEDULES_TEXT = `💉 Lịch tiêm chủng:
  Thứ 2 – Thứ 6: Sáng 7:15–11:00 | Chiều 12:45–16:30
  Thứ 7, Chủ nhật, Lễ, Tết: Sáng 7:15–11:00 (chỉ buổi sáng)
  Lấy số: Sáng từ 7:00 | Chiều từ 13:00. Mỗi khách chỉ 1 số.

🔬 Lịch xét nghiệm:
  Thứ 2 – Thứ 6: Sáng 7:30–11:00 | Chiều 13:30–16:30
  Thứ 7, Chủ nhật: Sáng 7:30–11:00 (chỉ buổi sáng)
  Lễ, Tết: Nghỉ`;

// ─── Cache ────────────────────────────────────────────────────────────────────
let _contextCache = null;
let _contextCacheTime = 0;
const CONTEXT_TTL = 10 * 60 * 1000; // 10 phút

// ─── Key pools (dùng chung với gemini.js) ────────────────────────────────────
const _blacklist = new Map();
const BLACKLIST_TTL = 2 * 60 * 1000;

function _isBlacklisted(key) {
  const exp = _blacklist.get(key);
  if (!exp) return false;
  if (Date.now() > exp) { _blacklist.delete(key); return false; }
  return true;
}
function _blacklist_(key) {
  _blacklist.set(key, Date.now() + BLACKLIST_TTL);
}

let _geminiPool = [], _geminiPoolTime = 0, _geminiIdx = 0;
let _groqPool = [],   _groqPoolTime   = 0, _groqIdx   = 0;
let _provider = null, _providerTime   = 0;
const KEY_TTL = 5 * 60 * 1000;
const PROVIDER_TTL = 60 * 1000;

async function _loadPool(type) {
  const now = Date.now();
  if (type === "gemini") {
    if (_geminiPool.length > 0 && now - _geminiPoolTime < KEY_TTL) return _geminiPool;
    try { _geminiPool = await prisma.geminiApiKey.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }); }
    catch { _geminiPool = []; }
    _geminiPoolTime = now;
    return _geminiPool;
  } else {
    if (_groqPool.length > 0 && now - _groqPoolTime < KEY_TTL) return _groqPool;
    try { _groqPool = await prisma.groqApiKey.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }); }
    catch { _groqPool = []; }
    _groqPoolTime = now;
    return _groqPool;
  }
}

async function _getProvider() {
  const now = Date.now();
  if (_provider && now - _providerTime < PROVIDER_TTL) return _provider;
  try {
    const cfg = await prisma.systemConfig.findUnique({ where: { key: "ai_provider" } });
    _provider = cfg?.value || "gemini";
  } catch { _provider = "gemini"; }
  _providerTime = Date.now();
  return _provider;
}

// ─── Lấy context từ DB ───────────────────────────────────────────────────────
async function _loadMiniAppContext() {
  const now = Date.now();
  if (_contextCache && now - _contextCacheTime < CONTEXT_TTL) return _contextCache;

  try {
    // Lấy song song: bộ não riêng, hotlines, schedules, settings
    const [knowledgeCfg, hotlineCfg, scheduleCfg, settings] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: "mini_app_knowledge" } }),
      prisma.systemConfig.findUnique({ where: { key: "mini_app_hotlines" } }),
      prisma.systemConfig.findUnique({ where: { key: "mini_app_schedules" } }),
      prisma.systemConfig.findMany({
        where: { key: { in: ["hotline_main", "address", "ai_custom_prompt", "ai_footer_msg"] } }
      }),
    ]);

    const hotline = settings.find(s => s.key === "hotline_main")?.value || "1900.988.975";
    const address = settings.find(s => s.key === "address")?.value || "118 Lê Đình Lý, TP. Đà Nẵng";
    const customPrompt = settings.find(s => s.key === "ai_custom_prompt")?.value || "";
    const footerMsgRaw = settings.find(s => s.key === "ai_footer_msg")?.value;
    const footerMsg = footerMsgRaw
      ? footerMsgRaw.replace("{address}", address).replace("{hotline}", hotline)
      : `(CDC Đà Nẵng – Hotline: ${hotline})`;

    // Xử lý hotlines — dùng DB nếu có, fallback về default
    let hotlinesText = "";
    try {
      const hotlines = hotlineCfg?.value ? JSON.parse(hotlineCfg.value) : DEFAULT_HOTLINES;
      const list = hotlines.length > 0 ? hotlines : DEFAULT_HOTLINES;
      hotlinesText = "TỔNG ĐÀI TƯ VẤN:\n" + list.map(h =>
        `+ ${h.name}: ${h.displayPhone}${h.description ? ` (${h.description})` : ""}${h.hours ? ` — ${h.hours}` : ""}`
      ).join("\n");
    } catch { hotlinesText = "TỔNG ĐÀI TƯ VẤN:\n" + DEFAULT_HOTLINES.map(h => `+ ${h.name}: ${h.displayPhone}`).join("\n"); }

    // Xử lý lịch làm việc — dùng DB nếu có, fallback về default
    let schedulesText = "";
    try {
      const schedules = scheduleCfg?.value ? JSON.parse(scheduleCfg.value) : null;
      if (schedules && schedules.length > 0) {
        schedulesText = "LỊCH LÀM VIỆC:\n" + schedules.map(sch => {
          let s = `${sch.icon} ${sch.title}:\n`;
          for (const ses of sch.sessions) {
            s += `  ${ses.days}:\n`;
            for (const slot of ses.slots) s += `    - ${slot.label}: ${slot.time}\n`;
          }
          if (sch.queueInfo?.length > 0) {
            s += `  Lấy số thứ tự: ${sch.queueInfo.map(q => `${q.label} ${q.time}`).join(", ")}\n`;
          }
          if (sch.note) s += `  Lưu ý: ${sch.note}\n`;
          return s;
        }).join("\n");
      } else {
        schedulesText = `LỊCH LÀM VIỆC:\n${DEFAULT_SCHEDULES_TEXT}`;
      }
    } catch { schedulesText = `LỊCH LÀM VIỆC:\n${DEFAULT_SCHEDULES_TEXT}`; }

    // Bộ não AI riêng của Mini App — parse JSON topics
    let knowledgeText = "";
    try {
      if (knowledgeCfg?.value) {
        const topics = JSON.parse(knowledgeCfg.value);
        const activeTopics = topics.filter(t => t.active !== false);
        if (activeTopics.length > 0) {
          knowledgeText = "TÀI LIỆU MINI APP:\n" + activeTopics.map(t =>
            `[${t.category?.toUpperCase() || "CHUNG"}] ${t.title}:\n${t.content}`
          ).join("\n\n---\n");
        }
      }
    } catch {}
    // Fallback nếu DB rỗng hoặc parse lỗi
    if (!knowledgeText) {
      knowledgeText = `TÀI LIỆU MINI APP:\n[THÔNG TIN CHUNG]\nĐịa chỉ: ${address}\nHotline: ${hotline}\nWebsite: ksbtdanang.vn`;
    }

    const systemInstruction = `Bạn là Trợ lý AI chính thức của Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng (CDC Đà Nẵng) trên ứng dụng Zalo Mini App.
Nhiệm vụ của bạn là hỗ trợ người dân Đà Nẵng về các dịch vụ y tế công cộng.

THÔNG TIN LIÊN HỆ:
+ Địa chỉ: ${address}
+ Hotline chính: ${hotline}
+ Website: ksbtdanang.vn

${hotlinesText}

${schedulesText}

QUY TẮC BẮT BUỘC:
1. Chỉ hỗ trợ các vấn đề liên quan đến y tế, dịch vụ của CDC Đà Nẵng. Từ chối lịch sự các chủ đề khác.
2. Trả lời NGẮN GỌN, tối đa 5-7 dòng. Nếu danh sách dài, hỏi người dùng muốn xem mục nào.
3. TUYỆT ĐỐI không dùng Markdown (*, **, #, _, ---). Dùng số (1. 2.) hoặc dấu + để liệt kê.
4. Viết thường, thân thiện. Xưng "tôi", gọi người dùng là "bạn".
5. Nếu không có thông tin, hướng dẫn gọi hotline ${hotline}.
6. Không tự thêm footer — hệ thống tự gắn.
7. Nếu câu hỏi mơ hồ, hỏi lại 1 câu ngắn để làm rõ.
8. KHÔNG cung cấp thông tin nội bộ cán bộ, lương thưởng, tài liệu nội bộ.

${customPrompt ? `YÊU CẦU BỔ SUNG:\n${customPrompt}` : ""}

${knowledgeText}`;

    _contextCache = { systemInstruction, hotline, footerMsg };
    _contextCacheTime = now;
    return _contextCache;
  } catch (err) {
    console.error("[MiniApp AI] Lỗi load context:", err.message);
    return {
      systemInstruction: "Bạn là trợ lý AI của CDC Đà Nẵng. Hỗ trợ người dân về dịch vụ y tế.",
      hotline: "1900.988.975",
      footerMsg: "(CDC Đà Nẵng – Hotline: 1900.988.975)"
    };
  }
}

function _stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "+ ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .trim();
}

// ─── Hàm chính ────────────────────────────────────────────────────────────────
/**
 * @param {Array<{role:'user'|'assistant', content:string}>} chatHistory - Lịch sử từ client
 * @param {string} question - Tin nhắn mới nhất
 */
export async function askMiniAppAI(chatHistory = [], question) {
  const provider = await _getProvider();
  if (provider === "groq") {
    return await _askGroq(chatHistory, question);
  }
  return await _askGemini(chatHistory, question);
}

async function _askGemini(chatHistory, question) {
  const pool = await _loadPool("gemini");
  const fallbackKey = process.env.GEMINI_API_KEY;
  const ctx = await _loadMiniAppContext();
  const { systemInstruction, hotline, footerMsg } = ctx;

  // Xây contents từ lịch sử client
  const history = chatHistory.slice(-10).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const contents = [...history, { role: "user", parts: [{ text: question }] }];

  // Chọn keys
  const startIdx = pool.length > 0 ? (_geminiIdx % pool.length) : 0;
  const allKeys = [
    ...pool.slice(startIdx).map(k => k.apiKey),
    ...pool.slice(0, startIdx).map(k => k.apiKey),
    fallbackKey
  ].filter(Boolean);
  const activeKeys = allKeys.filter(k => !_isBlacklisted(k));
  if (pool.length > 0) _geminiIdx = (_geminiIdx + 1) % pool.length;

  if (activeKeys.length === 0) {
    console.warn("[MiniApp AI] Tất cả Gemini key bị rate-limit, thử Groq...");
    return await _askGroq(chatHistory, question, ctx);
  }

  let lastErr = null;
  for (const apiKey of activeKeys) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config: { systemInstruction, maxOutputTokens: 1024, temperature: 0.3 }
      });

      // Track usage
      const tokens = response.usageMetadata?.totalTokenCount || 0;
      if (tokens > 0) {
        const kObj = pool.find(k => k.apiKey === apiKey);
        if (kObj) prisma.geminiApiKey.update({
          where: { id: kObj.id },
          data: { usageTokens: { increment: tokens }, usageCount: { increment: 1 } }
        }).catch(() => {});
      }

      let answer = _stripMarkdown(response.text || "Xin lỗi, không có phản hồi.");
      if (footerMsg) answer += "\n\n" + footerMsg;
      return answer;
    } catch (err) {
      lastErr = err;
      const msg = err.message?.toLowerCase() || "";
      if (msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted")) {
        _blacklist_(apiKey); continue;
      }
      if (msg.includes("503") || msg.includes("unavailable") || msg.includes("404") || msg.includes("not found")) {
        continue;
      }
      throw err;
    }
  }

  console.warn("[MiniApp AI] Gemini thất bại, fallback Groq...", lastErr?.message);
  try { return await _askGroq(chatHistory, question, ctx); }
  catch { return `Hệ thống AI đang bận. Vui lòng thử lại sau hoặc gọi ${hotline}.`; }
}

async function _askGroq(chatHistory, question, ctxOverride) {
  const pool = await _loadPool("groq");
  if (pool.length === 0) throw new Error("Chưa cấu hình Groq API Key.");

  const ctx = ctxOverride || await _loadMiniAppContext();
  const { systemInstruction, hotline, footerMsg } = ctx;

  const messages = [
    { role: "system", content: systemInstruction },
    ...chatHistory.slice(-10).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    })),
    { role: "user", content: question }
  ];

  const startIdx = pool.length > 0 ? (_groqIdx % pool.length) : 0;
  const allKeys = [...pool.slice(startIdx), ...pool.slice(0, startIdx)].map(k => k.apiKey).filter(Boolean);
  const activeKeys = allKeys.filter(k => !_isBlacklisted(k));
  if (pool.length > 0) _groqIdx = (_groqIdx + 1) % pool.length;

  if (activeKeys.length === 0) {
    return `Hệ thống AI đang bận. Vui lòng thử lại sau hoặc gọi ${hotline}.`;
  }

  for (const apiKey of activeKeys) {
    try {
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 1024,
      });

      const tokens = completion.usage?.total_tokens || 0;
      if (tokens > 0) {
        const kObj = pool.find(k => k.apiKey === apiKey);
        if (kObj) prisma.groqApiKey.update({
          where: { id: kObj.id },
          data: { usageTokens: { increment: tokens }, usageCount: { increment: 1 } }
        }).catch(() => {});
      }

      let answer = _stripMarkdown(completion.choices[0]?.message?.content || "Xin lỗi.");
      if (footerMsg) answer += "\n\n" + footerMsg;
      return answer;
    } catch (err) {
      if (err.status === 429 || err.status === 503 || err.status === 500) {
        _blacklist_(apiKey); continue;
      }
      throw err;
    }
  }
  return `Hệ thống AI đang bận. Vui lòng thử lại sau hoặc gọi ${hotline}.`;
}

/** Xoá cache context (gọi sau khi admin cập nhật hotlines/schedules/knowledge) */
export function clearMiniAppAICache() {
  _contextCache = null;
  _contextCacheTime = 0;
}
