/**
 * API: Quản lý Tiếp nhận & Xử lý Câu hỏi Người dân
 * GET /api/inquiries: Lấy danh sách câu hỏi kèm bộ lọc & thống kê
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const topic = searchParams.get("topic") || "all";
    const search = (searchParams.get("search") || "").trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const skip = (page - 1) * limit;

    const where = {};

    if (status !== "all") {
      where.status = status;
    }

    if (topic !== "all") {
      where.topic = topic;
    }

    if (search) {
      where.OR = [
        { question: { contains: search, mode: "insensitive" } },
        { citizenName: { contains: search, mode: "insensitive" } },
        { zaloUserId: { contains: search } },
        { assignedStaffName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Đếm thống kê tổng quát
    const [total, pendingStaff, staffReplied, aiResolved, inquiries] = await Promise.all([
      prisma.citizenInquiry.count(),
      prisma.citizenInquiry.count({ where: { status: "pending_staff" } }),
      prisma.citizenInquiry.count({ where: { status: "staff_replied" } }),
      prisma.citizenInquiry.count({ where: { status: "ai_resolved" } }),
      prisma.citizenInquiry.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const filteredTotal = await prisma.citizenInquiry.count({ where });

    return NextResponse.json({
      success: true,
      data: inquiries,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
      },
      stats: {
        total,
        pendingStaff,
        staffReplied,
        aiResolved,
      },
    });
  } catch (error) {
    console.error("[GET /api/inquiries Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
