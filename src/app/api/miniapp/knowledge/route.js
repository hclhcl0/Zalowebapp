/**
 * API: Tài liệu nội bộ theo phòng ban (Mini App — chỉ nhân viên)
 * GET /api/miniapp/knowledge?zaloUserId=xxx&dept=xxx
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const zaloUserId = searchParams.get("zaloUserId");
    const search     = searchParams.get("search") || "";

    if (!zaloUserId) {
      return NextResponse.json({ error: "Cần đăng nhập để xem tài liệu nội bộ" }, { status: 401 });
    }

    // Kiểm tra nhân viên
    const follower = await prisma.follower.findUnique({ where: { zaloUserId } });
    if (!follower || follower.userType !== "staff") {
      return NextResponse.json(
        { error: "Chỉ cán bộ nhân viên CDC mới có thể xem tài liệu nội bộ" },
        { status: 403 }
      );
    }

    const dept = follower.department;

    // Lấy tài liệu: ALL + tài liệu riêng phòng ban
    const knowledge = await prisma.aiKnowledge.findMany({
      where: {
        OR: [
          { allowedDepartment: null },
          { allowedDepartment: "ALL" },
          ...(dept ? [{ allowedDepartment: dept }] : []),
        ],
        ...(search ? {
          OR: [
            { title:   { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      select: {
        id:                true,
        title:             true,
        category:          true,
        content:           true,
        sourceUrl:         true,
        allowedDepartment: true,
        updatedAt:         true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      data:       knowledge,
      department: dept,
      staffName:  follower.fullName || follower.displayName,
    });
  } catch (err) {
    console.error("[miniapp/knowledge]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
