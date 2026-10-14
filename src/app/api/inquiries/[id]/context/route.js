/**
 * API: Lấy Ngữ Cảnh Hội Thoại & Hồ Sơ Định Danh Người Hỏi
 * GET /api/inquiries/[id]/context
 * Trả về:
 * - Thông tin định danh người hỏi (Avatar, Tên Zalo, Họ tên thật, SĐT, CCCD, ngày sinh, nhóm quan tâm)
 * - Toàn bộ lịch sử tin nhắn trò chuyện (Chat history) giữa người dân và CDC/AI
 * - Lịch sử các câu hỏi trước đây của người này
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
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

    const inquiry = await prisma.citizenInquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Không tìm thấy câu hỏi này" }, { status: 404 });
    }

    // Lấy thông tin định danh người hỏi từ bảng Follower
    const follower = await prisma.follower.findUnique({
      where: { zaloUserId: inquiry.zaloUserId },
      select: {
        id: true,
        zaloUserId: true,
        displayName: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        dob: true,
        cccd: true,
        userType: true,
        interestGroup: true,
        notes: true,
        followedAt: true,
        totalVisits: true,
      },
    });

    // Lấy lịch sử 25 tin nhắn hội thoại gần nhất giữa người này và Zalo OA
    const recentLogs = await prisma.messageLog.findMany({
      where: { zaloUserId: inquiry.zaloUserId },
      orderBy: { receivedAt: "desc" },
      take: 25,
    });

    // Lấy các câu hỏi trước đây mà người này đã từng hỏi
    const pastInquiries = await prisma.citizenInquiry.findMany({
      where: {
        zaloUserId: inquiry.zaloUserId,
        id: { not: inquiryId },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Sắp xếp tin nhắn theo trình tự thời gian (cũ -> mới) để hiển thị luồng chat
    const chatHistory = [...recentLogs].reverse().map((log) => ({
      id: log.id,
      direction: log.direction, // "inbound" (người dân gửi) | "outbound" (AI/CDC trả lời)
      type: log.type,
      content: log.content,
      receivedAt: log.receivedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        inquiry,
        follower: follower || {
          zaloUserId: inquiry.zaloUserId,
          displayName: inquiry.citizenName || "Người dùng Zalo",
          avatarUrl: null,
          phone: null,
          fullName: null,
          userType: "citizen",
        },
        chatHistory,
        pastInquiries,
      },
    });
  } catch (error) {
    console.error("[GET /api/inquiries/[id]/context Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
