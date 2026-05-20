/**
 * API: Quản lý Người quan tâm Zalo OA
 * GET  /api/followers         → Lấy danh sách người quan tâm (hỗ trợ search)
 * POST /api/followers         → Thêm mới hoặc cập nhật người quan tâm (cho đồng bộ/webhook)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const userType = searchParams.get("userType") || "all";

    const whereClause = {
      AND: [
        {
          OR: [
            { displayName: { contains: query } },
            { phone: { contains: query } },
            { zaloUserId: { contains: query } },
            { department: { contains: query } },
          ],
        },
      ],
    };

    if (userType !== "all") {
      whereClause.AND.push({ userType });
    }

    const followers = await prisma.follower.findMany({
      where: whereClause,
      include: {
        appointments: true,
        testResults: true,
      },
      orderBy: { followedAt: "desc" },
    });

    return NextResponse.json({ data: followers });
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
