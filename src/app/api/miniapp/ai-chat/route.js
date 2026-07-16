/**
 * API: Trợ lý AI CDC cho Zalo Mini App
 * POST /api/miniapp/ai-chat
 * Body: { message: string, history: [{role, content}] }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request) {
  try {
    const { message, history = [] } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Tin nhắn không được để trống" }, { status: 400 });
    }

    // Lấy knowledge base công khai từ DB
    const knowledgeDocs = await prisma.aiKnowledge.findMany({
      where: {
        OR: [
          { allowedDepartment: null },
          { allowedDepartment: "ALL" },
        ],
      },
      select: { title: true, content: true, category: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const knowledgeContext = knowledgeDocs.length > 0
      ? knowledgeDocs.map(d => `## ${d.title}\n${d.content}`).join("\n\n---\n\n")
      : "";

    const systemPrompt = `Bạn là Trợ lý AI của Trung tâm Kiểm soát Bệnh tật Đà Nẵng (CDC Đà Nẵng). Nhiệm vụ của bạn là hỗ trợ người dân giải đáp các câu hỏi về:
- Dịch vụ y tế, xét nghiệm, tiêm chủng tại CDC Đà Nẵng
- Thông tin sức khỏe, phòng bệnh, dịch tễ
- Hướng dẫn đặt lịch, tra cứu kết quả xét nghiệm
- Địa chỉ, giờ làm việc, bảng giá dịch vụ

Nguyên tắc:
- Trả lời bằng tiếng Việt, thân thiện, ngắn gọn và chính xác
- Ưu tiên dùng thông tin từ tài liệu CDC được cung cấp
- Nếu không chắc, hãy khuyên người dùng liên hệ trực tiếp CDC Đà Nẵng: 0236 3822 663
- Không bịa đặt thông tin y tế

${knowledgeContext ? `\n\n=== TÀI LIỆU CDC ĐÀ NẴNG ===\n${knowledgeContext}` : ""}`;

    // Gọi Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Chưa cấu hình AI API key" }, { status: 500 });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey });

    // Chuyển đổi history sang format Gemini
    const geminiHistory = history.slice(-10).map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = genai.chats.create({
      model: "gemini-2.0-flash",
      config: { systemInstruction: systemPrompt },
      history: geminiHistory,
    });

    const result = await chat.sendMessage({ message });
    const reply = result.text ?? "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[miniapp/ai-chat]", err);
    return NextResponse.json({ error: "Lỗi hệ thống, vui lòng thử lại" }, { status: 500 });
  }
}
