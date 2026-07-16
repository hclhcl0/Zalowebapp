/**
 * API: Xác thực người dùng Mini App qua Zalo User Access Token
 * POST /api/miniapp/auth
 * Body: { accessToken: string, version?: string }
 * → Trả về: { userType, accessLevel, department, followerInfo, followerId }
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
    const body = await request.json();
    const { accessToken } = body;
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

    // Upsert follower (tạo hoặc cập nhật)
    const follower = await prisma.follower.upsert({
      where: { zaloUserId: zaloData.id },
      create: {
        zaloUserId: zaloData.id,
        displayName: zaloData.name || null,
        avatarUrl: zaloData.picture?.data?.url || null,
        userType: "citizen",
        accessLevel: "basic",
        totalVisits: 1,
        lastSeenAt: new Date(),
      },
      update: {
        displayName: zaloData.name || undefined,
        avatarUrl: zaloData.picture?.data?.url || undefined,
        lastSeenAt: new Date(),
        totalVisits: { increment: 1 },
      },
    });

    // Log session
    await prisma.miniAppSession.create({
      data: {
        followerId: follower.id,
        action: "open",
        metadata: JSON.stringify({ version: body.version || null }),
      },
    });

    return NextResponse.json({
      success: true,
      zaloUserId: zaloData.id,
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
