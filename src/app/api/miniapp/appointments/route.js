/**
 * API: Đặt lịch và Tra lịch hẹn (Mini App)
 * GET  /api/miniapp/appointments?zaloUserId=xxx  → Lịch hẹn của tôi
 * POST /api/miniapp/appointments                 → Đặt lịch mới
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
    const phone      = searchParams.get("phone");

    if (!zaloUserId && !phone) {
      return NextResponse.json({ error: "Cần truyền zaloUserId hoặc phone" }, { status: 400 });
    }

    let follower = null;
    if (zaloUserId) {
      follower = await prisma.follower.findUnique({ where: { zaloUserId } });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          ...(follower ? [{ followerId: follower.id }] : []),
          ...(phone     ? [{ phone }]                  : []),
        ],
      },
      orderBy: { appointedAt: "asc" },
    });

    return NextResponse.json({ data: appointments });
  } catch (err) {
    console.error("[miniapp/appointments GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { fullName, phone, dob, vaccineType, appointedAt, note, zaloUserId } = body;

    if (!fullName || !phone || !vaccineType || !appointedAt) {
      return NextResponse.json(
        { error: "Thiếu thông tin: fullName, phone, vaccineType, appointedAt" },
        { status: 400 }
      );
    }

    // Tìm follower để liên kết (nếu có)
    let follower = null;
    if (zaloUserId) {
      follower = await prisma.follower.findUnique({ where: { zaloUserId } });
    }

    const appointment = await prisma.appointment.create({
      data: {
        fullName,
        phone,
        dob:         dob || null,
        vaccineType,
        appointedAt: new Date(appointedAt),
        note:        note || null,
        status:      "pending",
        followerId:  follower?.id || null,
      },
    });

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (err) {
    console.error("[miniapp/appointments POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
