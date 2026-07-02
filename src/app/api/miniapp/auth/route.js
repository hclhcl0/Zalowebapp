/**
 * API: Xác thực người dùng Mini App qua Zalo User Access Token
 * POST /api/miniapp/auth
 * Body: { accessToken: string }
 * → Trả về: { userType, accessLevel, department, followerInfo }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// OPTIONS preflight cho CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request) {
  try {
    const { accessToken } = await request.json();
    if (!accessToken) {
      return NextResponse.json({ error: "Thiếu accessToken" }, { status: 400 });
    }

    // Xác minh token với Zalo API → lấy userId
    const zaloRes = await fetch("https://graph.zalo.me/v2.0/me?fields=id,name,picture", {
      headers: { access_token: accessToken },
    });
    const zaloData = await zaloRes.json();

    if (!zaloData.id) {
      return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
    }

    const zaloUserId = zaloData.id;

    // Tìm Follower trong DB
    let follower = await prisma.follower.findUnique({ where: { zaloUserId } });

    // Nếu chưa có → tự động tạo mới (người dân lần đầu dùng)
    if (!follower) {
      follower = await prisma.follower.create({
        data: {
          zaloUserId,
          displayName: zaloData.name || "Người dùng Zalo",
          avatarUrl: zaloData.picture?.data?.url || null,
          userType: "citizen",
          accessLevel: "basic",
        },
      });
    } else {
      // Cập nhật tên/avatar mới nhất
      follower = await prisma.follower.update({
        where: { zaloUserId },
        data: {
          displayName: zaloData.name || follower.displayName,
          avatarUrl: zaloData.picture?.data?.url || follower.avatarUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      zaloUserId,
      displayName: follower.displayName,
      avatarUrl: follower.avatarUrl,
      userType: follower.userType,       // "citizen" | "staff"
      accessLevel: follower.accessLevel, // "basic" | "manager" | "hr" | "admin"
      department: follower.department,
      followerId: follower.id,
    });
  } catch (err) {
    console.error("[miniapp/auth]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
