/**
 * AI Helper — CDC Đà Nẵng Zalo OA Chatbot
 * Hỗ trợ nhiều nhà cung cấp AI: Gemini & Groq
 */

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

// ============================================================
// CACHE KIẾN THỨC (30 phút)
// ============================================================
let knowledgeBaseCache = null;
let knowledgeCacheTime = 0;
const KNOWLEDGE_CACHE_TTL = 30 * 60 * 1000;

// ============================================================
// CACHE PROVIDER
// ============================================================
let cachedProvider = null;
let providerCacheTime = 0;
const PROVIDER_CACHE_TTL = 60 * 1000; // 1 phút

// ============================================================
// ROUND-ROBIN API KEY POOLS
// ============================================================
let geminiKeyPool = [];
let geminiKeyPoolTime = 0;
let geminiCurrentIndex = 0;
let geminiModelIndex = 0;

let groqKeyPool = [];
let groqKeyPoolTime = 0;
let groqCurrentIndex = 0;

const API_KEY_CACHE_TTL = 5 * 60 * 1000;

async function loadKeyPool(provider) {
  const now = Date.now();
  if (provider === "gemini") {
    if (geminiKeyPool.length > 0 && (now - geminiKeyPoolTime < API_KEY_CACHE_TTL)) return geminiKeyPool;
    try {
      geminiKeyPool = await prisma.geminiApiKey.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
      geminiKeyPoolTime = now;
    } catch (e) {}
    return geminiKeyPool;
  } else {
    if (groqKeyPool.length > 0 && (now - groqKeyPoolTime < API_KEY_CACHE_TTL)) return groqKeyPool;
    try {
      groqKeyPool = await prisma.groqApiKey.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
      groqKeyPoolTime = now;
    } catch (e) {}
    return groqKeyPool;
  }
}

export function clearApiKeyCache() {
  geminiKeyPool = [];
  geminiKeyPoolTime = 0;
  geminiCurrentIndex = 0;
  geminiModelIndex = 0;
}

export function clearGroqKeyCache() {
  groqKeyPool = [];
  groqKeyPoolTime = 0;
  groqCurrentIndex = 0;
}

// ============================================================
// LỊCH SỬ HỘI THOẠI
// ============================================================
const conversationHistory = new Map();
const conversationTimestamps = new Map();
const CONVERSATION_TTL = 30 * 60 * 1000;
const MAX_HISTORY_TURNS = 10;

export async function loadKnowledgeBase() {
  const now = Date.now();
  if (knowledgeBaseCache && (now - knowledgeCacheTime < KNOWLEDGE_CACHE_TTL)) return knowledgeBaseCache;

  try {
    const docs = await prisma.aiKnowledge.findMany({ orderBy: { createdAt: "desc" } });
    if (docs.length === 0) {
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
    return combinedText;
  } catch (err) {
    return knowledgeBaseCache || "";
  }
}

export function clearKnowledgeCache() {
  knowledgeBaseCache = null;
  knowledgeCacheTime = 0;
}

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

export function clearUserHistory(userId) {
  // Không cần xử lý ở đây vì memory map đã xoá.
  // Ghi chú: Nếu muốn thực sự reset, có thể chèn một tin nhắn "reset" vào DB hoặc xoá history của user đó trong DB
}

// ============================================================
// HÀM CHUNG LẤY THÔNG TIN
// ============================================================
async function prepareAIContext(userId, question) {
  const knowledgeText = await loadKnowledgeBase();
  let hotline = "1900988975";
  let address = "118 Lê Đình Lý, Phường Thanh Khê Đông, Quận Thanh Khê, Thành phố Đà Nẵng";
  try {
    const settings = await prisma.systemConfig.findMany({ where: { key: { in: ["hotline_main", "address"] } } });
    const h = settings.find(s => s.key === "hotline_main");
    if (h?.value) hotline = h.value;
    const a = settings.find(s => s.key === "address");
    if (a?.value) address = a.value;
  } catch (err) {}

  const systemInstruction = `Bạn là Trợ lý AI chính thức của Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng (CDC Đà Nẵng). Vai trò của bạn là hỗ trợ, giải đáp thắc mắc cho người dân thành phố Đà Nẵng về các vấn đề y tế, dịch tễ, phòng chống dịch bệnh và các dịch vụ của CDC Đà Nẵng.

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời dựa trên TÀI LIỆU CHUYÊN MÔN được cung cấp bên dưới. Không tự suy đoán.
2. Nếu câu hỏi KHÔNG liên quan đến y tế, dịch vụ của CDC Đà Nẵng, hãy trả lời: "Xin lỗi, tôi chỉ có thể hỗ trợ các vấn đề liên quan đến y tế và dịch vụ của CDC Đà Nẵng. Để được tư vấn thêm, vui lòng liên hệ CDC qua hotline ${hotline}."
3. Nếu tài liệu KHÔNG CÓ ĐỦ thông tin, hãy nói: "Về vấn đề này, tôi đề nghị bạn liên hệ trực tiếp CDC Đà Nẵng qua hotline ${hotline} hoặc đến địa chỉ ${address} để được giải đáp."
4. Khi tra cứu dữ liệu (điểm số, xếp loại, bảng giá...), PHẢI ĐỌC KỸ TOÀN BỘ TÀI LIỆU. Nếu một người/mục có NHIỀU DÒNG dữ liệu (ví dụ: xếp loại 3 tháng), phải tổng hợp và liệt kê ĐẦY ĐỦ tất cả các kết quả đó, TUYỆT ĐỐI không chỉ trả lời kết quả đầu tiên.
5. Người dùng có thể VIẾT SAI CHÍNH TẢ, viết tắt, hoặc VIẾT KHÔNG DẤU (ví dụ: "vacxin" = "vắc xin", "ho cong luong" = "Hồ Công Lượng"). Hãy tự động suy luận thông minh để tìm đúng dữ liệu tương ứng trong tài liệu.
6. KỸ NĂNG ĐỌC BẢNG: Khi trả lời thông tin từ dạng bảng (như bảng giá, danh sách), hãy trình bày thật chuyên nghiệp, dễ nhìn. Phân ô bằng khoảng trắng hoặc dấu gạch đứng (|), ví dụ: 
+ Vắc xin A: 500.000đ (Ghi chú: ...)
+ Vắc xin B: 400.000đ
KHÔNG viết dính liền thành 1 đoạn văn lộn xộn.
7. TUYỆT ĐỐI không dùng ký tự Markdown in đậm, in nghiêng (*, **, _, __, #, >, ---). KHÔNG dùng ký hiệu toán học.
8. Dùng số thứ tự (1. 2. 3.) hoặc ký tự + để liệt kê thay cho dấu gạch -.
9. Trả lời bằng tiếng Việt thân thiện, dễ hiểu, KHÔNG bao giờ bị cắt cụt.
10. Luôn kết thúc bằng: (Địa chỉ: ${address} - Hotline: ${hotline}).

TÀI LIỆU CHUYÊN MÔN:
${knowledgeText || `(Chưa có tài liệu. Vui lòng gọi ${hotline}.)`}`;

  // Lấy lịch sử 12 tin nhắn gần nhất từ Database
  const recentLogs = await prisma.messageLog.findMany({
    where: { zaloUserId: userId },
    orderBy: { receivedAt: "desc" },
    take: 12,
  });
  recentLogs.reverse(); // Sắp xếp lại theo trình tự thời gian

  const history = [];
  for (let i = 0; i < recentLogs.length; i++) {
    const log = recentLogs[i];
    // Bỏ qua tin nhắn cuối cùng nếu đó là câu hỏi hiện tại (do webhook đã lưu trước khi gọi AI)
    if (i === recentLogs.length - 1 && log.direction === "inbound") break;
    
    if (!log.content || !log.content.trim()) continue;
    const role = log.direction === "inbound" ? "user" : "model";
    
    if (history.length === 0) {
      if (role === "user") history.push({ role, parts: [{ text: log.content }] });
    } else {
      if (history[history.length - 1].role !== role) {
        history.push({ role, parts: [{ text: log.content }] });
      } else {
        history[history.length - 1].parts[0].text += "\n" + log.content;
      }
    }
  }

  return { systemInstruction, history, hotline, address };
}

// ============================================================
// HÀM XỬ LÝ CHÍNH
// ============================================================
export async function askAI(userId, question) {
  const now = Date.now();
  if (!cachedProvider || now - providerCacheTime > PROVIDER_CACHE_TTL) {
    try {
      const pc = await prisma.systemConfig.findUnique({ where: { key: "ai_provider" } });
      cachedProvider = pc?.value || "gemini";
      providerCacheTime = now;
    } catch (e) {
      cachedProvider = "gemini";
    }
  }

  if (cachedProvider === "groq") {
    return await askGroq(userId, question);
  } else {
    return await askGemini(userId, question);
  }
}

async function askGemini(userId, question) {
  const pool = await loadKeyPool("gemini");
  const fallbackKey = process.env.GEMINI_API_KEY;
  if (pool.length === 0 && !fallbackKey) throw new Error("Chưa có cấu hình Gemini API Key.");

  const { systemInstruction, history, hotline } = await prepareAIContext(userId, question);
  
  const contents = [...history, { role: "user", parts: [{ text: question }] }];
  
  const startIdx = pool.length > 0 ? (geminiCurrentIndex % pool.length) : 0;
  const orderedKeys = pool.length > 0
    ? [...pool.slice(startIdx).map(k => k.apiKey), ...pool.slice(0, startIdx).map(k => k.apiKey), fallbackKey].filter(Boolean)
    : [fallbackKey];

  const geminiModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b"
  ];

  if (pool.length > 0) geminiCurrentIndex = (geminiCurrentIndex + 1) % pool.length;

  let lastError = null;
  for (let i = 0; i < orderedKeys.length; i++) {
    const apiKey = orderedKeys[i];
    const currentModel = geminiModels[geminiModelIndex % geminiModels.length];
    geminiModelIndex++;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: currentModel,
        contents,
        config: { systemInstruction, maxOutputTokens: 2048, temperature: 0.3 }
      });

      const cleanedAnswer = stripMarkdown(response.text || "Xin lỗi, hệ thống bị lỗi.");
      return cleanedAnswer;
    } catch (err) {
      lastError = err;
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota")) continue;
      throw err;
    }
  }
  return "Hệ thống AI (Gemini) đang bận, vui lòng thử lại sau vài phút hoặc liên hệ CDC qua hotline " + hotline + ".";
}

async function askGroq(userId, question) {
  const pool = await loadKeyPool("groq");
  if (pool.length === 0) throw new Error("Chưa có cấu hình Groq API Key.");

  const { systemInstruction, history, hotline } = await prepareAIContext(userId, question);
  
  // Groq messages format: [{role: "system", content: "..."}, {role: "user", content: "..."}, {role: "assistant", content: "..."}]
  const groqMessages = [{ role: "system", content: systemInstruction }];
  for (const h of history) {
    groqMessages.push({
      role: h.role === "model" ? "assistant" : "user",
      content: h.parts[0].text
    });
  }
  groqMessages.push({ role: "user", content: question });

  const startIdx = pool.length > 0 ? (groqCurrentIndex % pool.length) : 0;
  const orderedKeys = [...pool.slice(startIdx).map(k => k.apiKey), ...pool.slice(0, startIdx).map(k => k.apiKey)].filter(Boolean);
  if (pool.length > 0) groqCurrentIndex = (groqCurrentIndex + 1) % pool.length;

  let lastError = null;
  for (let i = 0; i < orderedKeys.length; i++) {
    const apiKey = orderedKeys[i];
    try {
      const groq = new Groq({ apiKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: groqMessages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 2048,
      });

      const rawAnswer = chatCompletion.choices[0]?.message?.content || "Xin lỗi, không có phản hồi từ AI.";
      const cleanedAnswer = stripMarkdown(rawAnswer);
      return cleanedAnswer;
    } catch (err) {
      lastError = err;
      if (err.status === 429) continue;
      throw err;
    }
  }
  return "Hệ thống AI (Groq) đang bận, vui lòng thử lại sau vài phút hoặc liên hệ CDC qua hotline " + hotline + ".";
}
