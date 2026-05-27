/**
 * Gemini AI Helper — CDC Đà Nẵng Zalo OA Chatbot
 *
 * Chức năng:
 *  - loadKnowledgeBase(): Đọc tài liệu từ Database
 *  - askGemini(userId, question): Gọi Gemini API với Round-Robin key pool
 *
 * Lưu ý:
 *  - API Keys xoay vòng tự động, tự skip key bị rate-limit
 *  - Knowledge base được cache 30 phút trong memory
 *  - Lịch sử hội thoại per-user, tự xóa sau 30 phút không hoạt động
 *  - Mọi ký tự Markdown bị làm sạch trước khi trả về (Zalo không hỗ trợ)
 */

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

// ============================================================
// CACHE KIẾN THỨC (30 phút)
// ============================================================
let knowledgeBaseCache = null;
let knowledgeCacheTime = 0;
const KNOWLEDGE_CACHE_TTL = 30 * 60 * 1000;

// ============================================================
// ROUND-ROBIN API KEY POOL
// ============================================================
let apiKeyPool = [];           // [{id, apiKey, label}]
let apiKeyPoolTime = 0;
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // Cache danh sách key 5 phút
let currentKeyIndex = 0;       // Con trỏ xoay vòng

async function loadApiKeyPool() {
  const now = Date.now();
  if (apiKeyPool.length > 0 && (now - apiKeyPoolTime < API_KEY_CACHE_TTL)) {
    return apiKeyPool;
  }
  try {
    const keys = await prisma.geminiApiKey.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (keys.length > 0) {
      apiKeyPool = keys;
      apiKeyPoolTime = now;
      console.log(`[Gemini] Đã tải ${keys.length} API key từ Database.`);
    }
  } catch (err) {
    console.warn("[Gemini] Không thể tải API key từ DB:", err.message);
  }
  return apiKeyPool;
}

// Lấy key tiếp theo theo Round-Robin
function getNextKey(pool) {
  if (!pool || pool.length === 0) return null;
  const key = pool[currentKeyIndex % pool.length];
  currentKeyIndex = (currentKeyIndex + 1) % pool.length;
  return key;
}

// Xóa cache API key (gọi khi thêm/xóa key trong Dashboard)
export function clearApiKeyCache() {
  apiKeyPool = [];
  apiKeyPoolTime = 0;
  currentKeyIndex = 0;
}

// ============================================================
// LỊCH SỬ HỘI THOẠI PER-USER (30 phút)
// ============================================================
const conversationHistory = new Map();
const conversationTimestamps = new Map();
const CONVERSATION_TTL = 30 * 60 * 1000;
const MAX_HISTORY_TURNS = 10;

// ============================================================
// ĐỌC TÀI LIỆU KIẾN THỨC TỪ DATABASE
// ============================================================
export async function loadKnowledgeBase() {
  const now = Date.now();
  if (knowledgeBaseCache && (now - knowledgeCacheTime < KNOWLEDGE_CACHE_TTL)) {
    return knowledgeBaseCache;
  }

  try {
    const docs = await prisma.aiKnowledge.findMany({
      orderBy: { createdAt: "desc" }
    });

    if (docs.length === 0) {
      console.warn("[Gemini] Không có tài liệu nào trong Kho Tri Thức AI (Database).");
      knowledgeBaseCache = "";
      knowledgeCacheTime = now;
      return "";
    }

    let combinedText = "";
    for (const doc of docs) {
      combinedText += `\n\n[CHUYÊN MÔN: ${doc.category.toUpperCase()}]\n--- Tài liệu: ${doc.title} ---\n${doc.content}`;
    }

    knowledgeBaseCache = combinedText;
    knowledgeCacheTime = now;
    console.log(`[Gemini] Đã tải ${docs.length} tài liệu từ Kho Tri Thức AI, tổng ${combinedText.length} ký tự`);
    return combinedText;
  } catch (err) {
    console.error("[Gemini] Lỗi khi lấy Kho Tri Thức AI từ Database:", err.message);
    return knowledgeBaseCache || "";
  }
}

export function clearKnowledgeCache() {
  knowledgeBaseCache = null;
  knowledgeCacheTime = 0;
  console.log("[Gemini] Đã xóa cache kiến thức.");
}

// ============================================================
// DỌN DẸP LỊCH SỬ HỘI THOẠI QUÁ HẠN
// ============================================================
function cleanStaleConversations() {
  const now = Date.now();
  for (const [userId, ts] of conversationTimestamps.entries()) {
    if (now - ts > CONVERSATION_TTL) {
      conversationHistory.delete(userId);
      conversationTimestamps.delete(userId);
    }
  }
}

// ============================================================
// LÀM SẠCH KÝ TỰ MARKDOWN (Zalo không hỗ trợ)
// ============================================================
function stripMarkdown(text) {
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

// ============================================================
// GỌI GEMINI AI — ROUND-ROBIN + AUTO RETRY KHI BỊ RATE LIMIT
// ============================================================
export async function askGemini(userId, question) {
  // 1. Tải pool key từ DB
  const pool = await loadApiKeyPool();

  // 2. Fallback về key trong .env nếu không có key nào trong DB
  const fallbackKey = process.env.GEMINI_API_KEY;
  if (pool.length === 0 && !fallbackKey) {
    throw new Error("[Gemini] Chưa có API Key nào được cấu hình (DB hoặc .env).");
  }

  // 3. Tải kiến thức và config
  const knowledgeText = await loadKnowledgeBase();

  let hotline = "1900988975";
  let address = "118 Lê Đình Lý, Phường Thanh Khê Đông, Quận Thanh Khê, Thành phố Đà Nẵng";
  try {
    const settings = await prisma.systemConfig.findMany({
      where: { key: { in: ["hotline_main", "address"] } }
    });
    const h = settings.find(s => s.key === "hotline_main");
    if (h?.value) hotline = h.value;
    const a = settings.find(s => s.key === "address");
    if (a?.value) address = a.value;
  } catch (err) {
    console.warn("[Gemini] Lỗi đọc config từ DB, dùng thông tin liên hệ mặc định.");
  }

  const systemInstruction = `Bạn là Trợ lý AI chính thức của Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng (CDC Đà Nẵng). Vai trò của bạn là hỗ trợ, giải đáp thắc mắc cho người dân thành phố Đà Nẵng về các vấn đề y tế, dịch tễ, phòng chống dịch bệnh và các dịch vụ của CDC Đà Nẵng.

QUY TẮC BẮT BUỘC — KHÔNG ĐƯỢC VI PHẠM:
1. CHỈ trả lời dựa trên TÀI LIỆU CHUYÊN MÔN được cung cấp bên dưới. Không tự suy đoán thêm thông tin y tế ngoài tài liệu.
2. Nếu câu hỏi KHÔNG liên quan đến y tế, dịch bệnh, sức khỏe hoặc dịch vụ của CDC Đà Nẵng, hãy trả lời: "Xin lỗi, tôi chỉ có thể hỗ trợ các vấn đề liên quan đến y tế và dịch vụ của CDC Đà Nẵng. Để được tư vấn thêm, vui lòng liên hệ CDC qua hotline ${hotline}."
3. Nếu tài liệu KHÔNG CÓ ĐỦ thông tin để trả lời chính xác, hãy nói: "Về vấn đề này, tôi đề nghị bạn liên hệ trực tiếp CDC Đà Nẵng qua hotline ${hotline} hoặc đến địa chỉ ${address} để được giải đáp chính xác nhất."
4. TUYỆT ĐỐI không dùng bất kỳ ký tự Markdown nào (như *, **, _, __, #, ##, >, ---). Không dùng các ký hiệu toán học hoặc ký tự lạ (như °, ℃), hãy viết rõ bằng chữ (ví dụ: độ C).
5. Dùng số thứ tự (1. 2. 3.) hoặc ký tự + để liệt kê thay cho dấu gạch -.
6. Trả lời bằng tiếng Việt, ngôn ngữ thân thiện và dễ hiểu, phù hợp với người dân bình thường.
7. ĐẢM BẢO câu trả lời được viết TRỌN VẸN, KHÔNG bao giờ bị cắt cụt hay bỏ lửng giữa chừng.
8. Luôn kết thúc bằng thông tin liên hệ CDC nếu người dân cần hỗ trợ thêm (Địa chỉ: ${address} - Hotline: ${hotline}).

TÀI LIỆU CHUYÊN MÔN:
${knowledgeText || `(Hệ thống chưa có tài liệu chuyên môn. Vui lòng liên hệ CDC Đà Nẵng qua hotline ${hotline}.)`}`;

  // 4. Chuẩn bị lịch sử hội thoại
  cleanStaleConversations();
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  const history = conversationHistory.get(userId);
  conversationTimestamps.set(userId, Date.now());

  const contents = [
    ...history,
    { role: "user", parts: [{ text: question }] }
  ];

  // 5. Thử lần lượt các key trong pool (Round-Robin + Retry)
  const keysToTry = pool.length > 0
    ? [...pool.map(k => k.apiKey), fallbackKey].filter(Boolean)
    : [fallbackKey];

  // Bắt đầu từ vị trí hiện tại trong pool để Round-Robin thật sự
  const startIdx = pool.length > 0 ? (currentKeyIndex % pool.length) : 0;
  const orderedKeys = pool.length > 0
    ? [
        ...pool.slice(startIdx).map(k => k.apiKey),
        ...pool.slice(0, startIdx).map(k => k.apiKey),
        fallbackKey
      ].filter(Boolean)
    : [fallbackKey];

  // Cập nhật con trỏ sau khi dùng
  if (pool.length > 0) currentKeyIndex = (currentKeyIndex + 1) % pool.length;

  let lastError = null;
  for (let i = 0; i < orderedKeys.length; i++) {
    const apiKey = orderedKeys[i];
    const keyLabel = pool.find(k => k.apiKey === apiKey)?.label || ".env fallback";
    try {
      console.log(`[Gemini] Thử key: "${keyLabel}" (${i + 1}/${orderedKeys.length})`);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
          systemInstruction,
          maxOutputTokens: 2048,
          temperature: 0.3,
        }
      });

      const rawAnswer = response.text || "Xin lỗi, tôi không thể xử lý yêu cầu lúc này.";
      const cleanedAnswer = stripMarkdown(rawAnswer);

      // Lưu lịch sử hội thoại
      history.push({ role: "user", parts: [{ text: question }] });
      history.push({ role: "model", parts: [{ text: cleanedAnswer }] });
      while (history.length > MAX_HISTORY_TURNS * 2) history.splice(0, 2);
      conversationHistory.set(userId, history);

      console.log(`[Gemini] Thành công với key: "${keyLabel}"`);
      return cleanedAnswer;

    } catch (err) {
      lastError = err;
      const isRateLimit = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota");
      if (isRateLimit) {
        console.warn(`[Gemini] Key "${keyLabel}" bị rate limit (429). Chuyển sang key tiếp theo...`);
        continue; // Thử key tiếp theo
      }
      // Lỗi khác (không phải rate limit) → throw ngay
      throw err;
    }
  }

  // Tất cả key đều thất bại
  console.error("[Gemini] Tất cả API key đã bị rate limit!", lastError?.message);
  return "Hệ thống AI đang bận, vui lòng thử lại sau vài phút hoặc liên hệ CDC qua hotline " + hotline + ".";
}

// ============================================================
// XÓA LỊCH SỬ HỘI THOẠI CỦA USER (khi cần reset)
// ============================================================
export function clearUserHistory(userId) {
  conversationHistory.delete(userId);
  conversationTimestamps.delete(userId);
}
