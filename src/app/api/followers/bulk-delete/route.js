import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { followerIds } = body;

    if (!Array.isArray(followerIds) || followerIds.length === 0) {
      return NextResponse.json(
        { error: "Danh sách ID không hợp lệ hoặc trống." },
        { status: 400 }
      );
    }

    let deletedCount = 0;

    for (const id of followerIds) {
      const follower = await prisma.follower.findUnique({
        where: { id },
      });

      if (!follower) continue;

      const userId = follower.zaloUserId;

      // 1. Xóa liên kết nhân viên (nếu có)
      const link = await prisma.staffZaloLink.findUnique({ where: { zaloUserId: userId } });
      if (link) {
        await prisma.staffZaloLink.delete({ where: { zaloUserId: userId } });
      }

      // 2. Gỡ liên kết (set null) trong Appointment và TestResult để tránh lỗi Foreign Key
      await prisma.appointment.updateMany({
        where: { followerId: follower.id },
        data: { followerId: null },
      });
      await prisma.testResult.updateMany({
        where: { followerId: follower.id },
        data: { followerId: null },
      });

      // 3. Xóa lịch sử tin nhắn của người này
      await prisma.messageLog.deleteMany({
        where: { zaloUserId: userId },
      });

      // 4. Xóa Follower khỏi CSDL
      await prisma.follower.delete({
        where: { id },
      });

      deletedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa thành công ${deletedCount} người dùng.`,
      deletedCount,
    });
  } catch (err) {
    console.error("[BULK DELETE FOLLOWERS ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
