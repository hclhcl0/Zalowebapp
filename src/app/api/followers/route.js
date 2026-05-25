/**
 * API: Quản lý Người quan tâm Zalo OA
 * GET  /api/followers         → Lấy danh sách người quan tâm (hỗ trợ search)
 * POST /api/followers         → Thêm mới hoặc cập nhật người quan tâm (cho đồng bộ/webhook)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const userType = searchParams.get("userType") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = (page - 1) * limit;

    const whereClause = {
      AND: [],
    };

    if (query) {
      whereClause.AND.push({
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { zaloUserId: { contains: query, mode: "insensitive" } },
          { department: { contains: query, mode: "insensitive" } },
        ],
      });
    }

    if (userType !== "all") {
      whereClause.AND.push({ userType });
    }

    // Lấy tổng số lượng để tính phân trang
    const total = await prisma.follower.count({ where: whereClause });

    const followers = await prisma.follower.findMany({
      where: whereClause,
      include: {
        appointments: true,
        testResults: true,
      },
      orderBy: { followedAt: "desc" },
      skip,
      take: limit,
    });

    // Lấy thông tin StaffZaloLink cho các followers là staff
    const zaloUserIds = followers.map((f) => f.zaloUserId);
    const staffLinks = await prisma.staffZaloLink.findMany({
      where: { zaloUserId: { in: zaloUserIds } },
    });

    const staffLinkMap = {};
    staffLinks.forEach((link) => {
      staffLinkMap[link.zaloUserId] = link;
    });

    // Đính kèm staffLink vào follower object
    const enrichedFollowers = followers.map((f) => ({
      ...f,
      staffLink: staffLinkMap[f.zaloUserId] || null,
    }));

    return NextResponse.json({
      data: enrichedFollowers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { zaloUserId, displayName, avatarUrl, phone } = body;

    if (!zaloUserId) {
      return NextResponse.json({ error: "Thiếu zaloUserId" }, { status: 400 });
    }

    const follower = await prisma.follower.upsert({
      where: { zaloUserId },
      update: {
        ...(displayName && { displayName }),
        ...(avatarUrl && { avatarUrl }),
        ...(phone && { phone }),
      },
      create: {
        zaloUserId,
        displayName: displayName || "Người dùng Zalo",
        avatarUrl,
        phone,
      },
    });

    return NextResponse.json({ data: follower }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
