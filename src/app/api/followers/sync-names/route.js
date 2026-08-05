import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const followers = await prisma.follower.findMany({
      where: {
        OR: [
          { displayName: "Người dùng Zalo" },
          { displayName: null }
        ]
      },
      take: 100
    });

    if (followers.length === 0) {
      return NextResponse.json({ success: true, message: "Tất cả tài khoản đều đã có tên đầy đủ!", updatedCount: 0 });
    }

    let updatedCount = 0;
    const updatedList = [];

    for (const f of followers) {
      try {
        const profile = await getUserProfile(f.zaloUserId);
        if (profile?.error === 0 && profile?.data?.display_name) {
          const newName = profile.data.display_name;
          const newAvatar = profile.data.avatar || null;
          await prisma.follower.update({
            where: { id: f.id },
            data: {
              displayName: newName,
              ...(newAvatar && { avatarUrl: newAvatar })
            }
          });
          updatedCount++;
          updatedList.push({ id: f.id, zaloUserId: f.zaloUserId, newName });
        }
      } catch (e) {
        console.error(`[Sync Names] Lỗi ID ${f.id}:`, e.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thành công tên Zalo cho ${updatedCount}/${followers.length} tài khoản!`,
      updatedCount,
      updatedList
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
