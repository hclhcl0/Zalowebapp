import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Gỡ liên kết khóa ngoại
    await prisma.appointment.updateMany({ data: { followerId: null } });
    await prisma.testResult.updateMany({ data: { followerId: null } });

    // 2. Xóa
    const result = await prisma.follower.deleteMany({});
    
    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
