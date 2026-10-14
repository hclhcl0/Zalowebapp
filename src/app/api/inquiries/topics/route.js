/**
 * API: Cấu hình Phân công Cán bộ theo Chủ đề
 * GET /api/inquiries/topics  → Lấy danh sách phân công & danh sách nhân viên để chọn
 * PUT /api/inquiries/topics  → Cập nhật cán bộ phụ trách, từ khóa, bật/tắt Zalo
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Tự động khởi tạo 8 chủ đề mặc định nếu database chưa có
    const { ensureDefaultTopics } = await import("@/lib/inquiryService.mjs");
    await ensureDefaultTopics();

    // 1. Lấy danh sách các chủ đề phân công
    const topics = await prisma.topicAssignment.findMany({
      orderBy: { id: "asc" },
    });

    // 2. Đếm số lượng câu hỏi của từng chủ đề
    const inquiryCounts = await prisma.citizenInquiry.groupBy({
      by: ["topic"],
      _count: { id: true },
    });

    const pendingCounts = await prisma.citizenInquiry.groupBy({
      by: ["topic"],
      where: { status: "pending_staff" },
      _count: { id: true },
    });

    const countMap = {};
    inquiryCounts.forEach((c) => {
      countMap[c.topic] = { total: c._count.id, pending: 0 };
    });
    pendingCounts.forEach((c) => {
      if (!countMap[c.topic]) countMap[c.topic] = { total: 0, pending: 0 };
      countMap[c.topic].pending = c._count.id;
    });

    const topicsWithStats = topics.map((t) => ({
      ...t,
      stats: countMap[t.topicCode] || { total: 0, pending: 0 },
    }));

    // 3. Lấy danh sách Cán bộ có Zalo ID trong StaffZaloLink để làm dropdown chọn nhanh
    const staffList = await prisma.staffZaloLink.findMany({
      select: {
        id: true,
        staffNameRaw: true,
        zaloUserId: true,
        department: true,
        phone: true,
      },
      orderBy: [{ department: "asc" }, { staffNameRaw: "asc" }],
    });

    return NextResponse.json({
      success: true,
      topics: topicsWithStats,
      staffList,
    });
  } catch (error) {
    console.error("[GET /api/inquiries/topics Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, staffZaloUserId, staffName, department, notifyZalo, keywords, topicLabel } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID chủ đề" }, { status: 400 });
    }

    const updated = await prisma.topicAssignment.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(staffZaloUserId !== undefined && { staffZaloUserId }),
        ...(staffName !== undefined && { staffName }),
        ...(department !== undefined && { department }),
        ...(notifyZalo !== undefined && { notifyZalo }),
        ...(keywords !== undefined && { keywords }),
        ...(topicLabel !== undefined && { topicLabel }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật phân công cán bộ thành công",
      data: updated,
    });
  } catch (error) {
    console.error("[PUT /api/inquiries/topics Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
