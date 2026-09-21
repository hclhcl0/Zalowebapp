import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const citizens = await prisma.follower.findMany({
      where: { userType: "citizen" },
      select: {
        id: true,
        zaloUserId: true,
        displayName: true,
        fullName: true,
        phone: true,
        cccd: true,
        dob: true,
        followedAt: true,
        interestGroup: true,
      },
      orderBy: { followedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: citizens,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
