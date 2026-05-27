/**
 * Gemini AI Helper — CDC Đà Nẵng Zalo OA Chatbot
 *
 * Chức năng:
 *  - loadKnowledgeBase(): Đọc tất cả file .pdf và .txt trong public/docs/
 *  - askGemini(userId, question): Gọi Gemini API với kiến thức CDC và lịch sử hội thoại
 *
 * Lưu ý:
 *  - Knowledge base được cache 30 phút trong memory
 *  - Lịch sử hội thoại per-user, tự xóa sau 30 phút không hoạt động
 *  - Mọi ký tự Markdown bị làm sạch trước khi trả về (Zalo không hỗ trợ)
 */

import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// ============================================================
// CACHE KIẾN THỨC (30 phút)
// ============================================================
let knowledgeBaseCache = null;
let knowledgeCacheTime = 0;
const KNOWLEDGE_CACHE_TTL = 30 * 60 * 1000; // 30 phút

// ============================================================
// LỊCH SỬ HỘI THOẠI PER-USER (30 phút)
// ============================================================
const conversationHistory = new Map();   // userId → [{role, parts}]
const conversationTimestamps = new Map(); // userId → timestamp
const CONVERSATION_TTL = 30 * 60 * 1000; // 30 phút
const MAX_HISTORY_TURNS = 10;            // Tối đa 10 lượt (20 entries)

// ============================================================
// ĐỌC TÀI LIỆU KIẾN THỨC TỪ public/docs/
// ============================================================
export async function loadKnowledgeBase() {
  const now = Date.now();

  // Trả về cache nếu còn mới
  if (knowledgeBaseCache !== null && (now - knowledgeCacheTime) < KNOWLEDGE_CACHE_TTL) {
    return knowledgeBaseCache;
  }

  const docsDir = path.join(process.cwd(), "public", "docs");

  if (!fs.existsSync(docsDir)) {
    console.warn("[Gemini] Thư mục public/docs/ không tồn tại.");
    knowledgeBaseCache = "";
    knowledgeCacheTime = now;
    return "";
  }

  const files = fs.readdirSync(docsDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === ".pdf" || ext === ".txt" || ext === ".md";
  });

  if (files.length === 0) {
    console.warn("[Gemini] Không có tài liệu nào trong public/docs/");
    knowledgeBaseCache = "";
    knowledgeCacheTime = now;
    return "";
  }

  let combinedText = "";

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const ext = path.extname(file).toLowerCase();

    try {
      if (ext === ".pdf") {
        // Đọc PDF — cần pdf-parse
        const pdfParse = (await import("pdf-parse")).default;
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        combinedText += `\n\n=== TÀI LIỆU: ${file} ===\n${data.text}`;
        console.log(`[Gemini] Đã đọc PDF: ${file} (${data.text.length} ký tự)`);
      } else if (ext === ".txt" || ext === ".md") {
        const text = fs.readFileSync(filePath, "utf-8");
        combinedText += `\n\n=== TÀI LIỆU: ${file} ===\n${text}`;
        console.log(`[Gemini] Đã đọc ${ext.toUpperCase()}: ${file} (${text.length} ký tự)`);
      }
    } catch (err) {
      console.error(`[Gemini] Lỗi đọc file ${file}:`, err.message);
    }
  }

  knowledgeBaseCache = combinedText;
  knowledgeCacheTime = now;
  console.log(`[Gemini] Đã tải ${files.length} tài liệu, tổng ${combinedText.length} ký tự`);
  return combinedText;
}

// Xóa cache kiến thức (gọi khi cần reload tài liệu mới)
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
    .replace(/\*\*(.*?)\*\*/g, "$1")       // **bold** (không dùng cờ s để tránh lỗi đa dòng)
    .replace(/\*(.*?)\*/g, "$1")           // *italic*
    .replace(/__(.*?)__/g, "$1")           // __bold__
    .replace(/_(.*?)_/g, "$1")             // _italic_
    .replace(/^#{1,6}\s+/gm, "")           // # Heading
    .replace(/^>\s+/gm, "")                // > blockquote
    .replace(/^\s*[-*]\s+/gm, "+ ")        // - bullet → + bullet
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1") // [text](url) → text
    .replace(/`([^`]+)`/g, "$1")           // `code`
    .replace(/```[\s\S]*?```/g, "")        // ```code block```
    .trim();
}

// ============================================================
// GỌI GEMINI AI VỚI NGỮ CẢNH KIẾN THỨC + LỊCH SỬ HỘI THOẠI
// ============================================================
export async function askGemini(userId, question) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("[Gemini] GEMINI_API_KEY chưa được cấu hình trong biến môi trường.");
  }

  // Tải kiến thức từ tài liệu
  const knowledgeText = await loadKnowledgeBase();

  // Lấy cấu hình hotline và địa chỉ từ Database
  let hotline = "1900988975";
  let address = "118 Lê Đình Lý, Phường Thanh Khê Đông, Quận Thanh Khê, Thành phố Đà Nẵng";
  try {
    const settings = await prisma.systemConfig.findMany({
      where: { key: { in: ["hotline_main", "address"] } }
    });
    const hotlineSetting = settings.find(s => s.key === "hotline_main");
    if (hotlineSetting?.value) hotline = hotlineSetting.value;
    
    const addressSetting = settings.find(s => s.key === "address");
    if (addressSetting?.value) address = addressSetting.value;
  } catch (err) {
    console.warn("[Gemini] Lỗi đọc config từ DB, dùng thông tin liên hệ mặc định.");
  }

  // Prompt hệ thống nghiêm ngặt
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

  // Dọn lịch sử hội thoại cũ
  cleanStaleConversations();

  // Lấy hoặc khởi tạo lịch sử hội thoại
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  const history = conversationHistory.get(userId);
  conversationTimestamps.set(userId, Date.now());

  // Xây dựng contents với lịch sử hội thoại
  const contents = [
    ...history,
    { role: "user", parts: [{ text: question }] }
  ];

  // Gọi Gemini API
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 2048,
      temperature: 0.3,  // Thấp hơn = trả lời nhất quán, ít sáng tạo
    }
  });

  const rawAnswer = response.text || "Xin lỗi, tôi không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau hoặc gọi hotline 0236.3822.116.";

  // Làm sạch Markdown
  const cleanedAnswer = stripMarkdown(rawAnswer);

  // Cập nhật lịch sử hội thoại
  history.push({ role: "user", parts: [{ text: question }] });
  history.push({ role: "model", parts: [{ text: cleanedAnswer }] });

  // Giữ tối đa MAX_HISTORY_TURNS lượt
  while (history.length > MAX_HISTORY_TURNS * 2) {
    history.splice(0, 2);
  }
  conversationHistory.set(userId, history);

  return cleanedAnswer;
}

// ============================================================
// XÓA LỊCH SỬ HỘI THOẠI CỦA USER (khi cần reset)
// ============================================================
export function clearUserHistory(userId) {
  conversationHistory.delete(userId);
  conversationTimestamps.delete(userId);
}
