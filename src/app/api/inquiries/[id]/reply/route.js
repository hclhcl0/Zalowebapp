/**
 * API: Cán bộ phản hồi câu hỏi của người dân
 * POST /api/inquiries/[id]/reply
 * Gửi tin nhắn trực tiếp qua Zalo OA và tùy chọn lưu vào Khối óc AI
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendTextMessage } from "@/lib/zalo";
import { clearKnowledgeCache } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const inquiryId = parseInt(id, 10);
    if (isNaN(inquiryId)) {
      return NextResponse.json({ success: false, error: "ID câu hỏi không hợp lệ" }, { status: 400 });
    }

    const body = await request.json();
    const { replyText, saveToKnowledge = false, knowledgeCategory } = body;

    if (!replyText || !replyText.trim()) {
      return NextResponse.json({ success: false, error: "Nội dung phản hồi không được để trống" }, { status: 400 });
    }

    const inquiry = await prisma.citizenInquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Không tìm thấy câu hỏi này" }, { status: 404 });
    }

    const responderName = session.user.name || "Bác sĩ / Cán bộ CDC Đà Nẵng";

    // Format tin nhắn gửi tới Zalo người dân một cách chuyên nghiệp, trang trọng
    const messageToCitizen =
      `🩺 [CDC ĐÀ NẴNG - PHẢN HỒI TỪ BÁC SĨ/CÁN BỘ CHUYÊN TRÁCH]\n\n` +
      `Kính gửi: ${inquiry.citizenName || "Bạn"}\n` +
      `Chuyên mục: ${inquiry.topicLabel || "Tư vấn sức khỏe"}\n` +
      `Về câu hỏi: "${inquiry.question}"\n\n` +
      `💬 Nội dung giải đáp chuyên môn:\n` +
      `${replyText.trim()}\n\n` +
      `---\n` +
      `Người phản hồi: ${responderName}\n` +
      `Trung tâm Kiểm soát bệnh tật (CDC) TP. Đà Nẵng\n` +
      `Hotline: 1900.988.975`;

    // 1. Gửi tin qua Zalo OA
    const zaloResult = await sendTextMessage(inquiry.zaloUserId, messageToCitizen);

    // Ghi log Outbound
    try {
      await prisma.messageLog.create({
        data: {
          zaloUserId: inquiry.zaloUserId,
          direction: "outbound",
          type: "text",
          content: messageToCitizen,
          rawPayload: JSON.stringify({
            source: "staff_reply",
            inquiryId: inquiry.id,
            repliedBy: responderName,
            zaloResponse: zaloResult,
          }),
          receivedAt: new Date(),
        },
      });
    } catch (e) {
      console.error("[MessageLog Error]", e.message);
    }

    // 2. Cập nhật trạng thái phiếu hỗ trợ
    const updatedInquiry = await prisma.citizenInquiry.update({
      where: { id: inquiryId },
      data: {
        status: "staff_replied",
        staffReply: replyText.trim(),
        repliedBy: responderName,
        repliedAt: new Date(),
      },
    });

    // 3. Tùy chọn: Đưa câu hỏi & câu trả lời chuẩn vào Khối óc AI
    let savedKnowledge = null;
    if (saveToKnowledge) {
      try {
        const titleSnippet = inquiry.question.length > 100
          ? inquiry.question.substring(0, 97) + "..."
          : inquiry.question;

        savedKnowledge = await prisma.aiKnowledge.create({
          data: {
            title: `[Hỏi đáp] ${titleSnippet}`,
            category: knowledgeCategory || inquiry.topicLabel || "Hỏi đáp Y tế",
            content:
              `Câu hỏi của người dân:\n${inquiry.question}\n\n` +
              `Giải đáp chuẩn từ Bác sĩ/Cán bộ chuyên môn CDC Đà Nẵng:\n${replyText.trim()}`,
            sourceExt: "staff_inquiry_reply",
          },
        });

        clearKnowledgeCache();
        console.log(`[AiKnowledge] Đã nạp thành công câu hỏi #${inquiry.id} vào Khối óc AI (ID: ${savedKnowledge.id})`);
      } catch (kErr) {
        console.error("[Save to AiKnowledge Error]", kErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã gửi câu trả lời đến Zalo người dân thành công",
      data: updatedInquiry,
      savedKnowledge: savedKnowledge ? { id: savedKnowledge.id, title: savedKnowledge.title } : null,
      zaloResult,
    });
  } catch (error) {
    console.error("[POST /api/inquiries/[id]/reply Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
