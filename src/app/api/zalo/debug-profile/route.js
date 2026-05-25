import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (userId) {
      const profile = await getUserProfile(userId);
      return NextResponse.json(profile);
    }

    // Lấy 1 follower ngẫu nhiên để test
    const follower = await prisma.follower.findFirst({
      orderBy: { followedAt: "desc" }
    });

    if (!follower) return NextResponse.json({ error: "No followers found" });

    const profile = await getUserProfile(follower.zaloUserId);
    return NextResponse.json({
      followerId: follower.zaloUserId,
      profileResponse: profile
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
