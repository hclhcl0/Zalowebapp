/**
 * API: Lịch sử tin nhắn của Người quan tâm Zalo OA
 * GET /api/followers/[id]/logs → Lấy tất cả tin nhắn gửi/nhận của follower này
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const follower = await prisma.follower.findUnique({
      where: { id },
      select: { zaloUserId: true }
    });

    if (!follower) {
      return NextResponse.json({ error: "Không tìm thấy người quan tâm" }, { status: 404 });
    }

    const logs = await prisma.messageLog.findMany({
      where: { zaloUserId: follower.zaloUserId },
      orderBy: { receivedAt: "desc" },
    });

    return NextResponse.json({ data: logs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
