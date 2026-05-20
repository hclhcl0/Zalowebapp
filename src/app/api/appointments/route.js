/**
 * API: Quản lý Đặt lịch Tiêm chủng
 * GET  /api/appointments      → Lấy danh sách
 * POST /api/appointments      → Tạo mới
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const appointments = await prisma.appointment.findMany({
      where: {
        ...(status && { status }),
        ...(search && {
          OR: [
            { fullName: { contains: search } },
            { phone: { contains: search } },
          ],
        }),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: appointments });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { fullName, phone, vaccineType, appointedAt, dob, note } = body;

    if (!fullName || !phone || !vaccineType || !appointedAt) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        fullName,
        phone,
        vaccineType,
        appointedAt: new Date(appointedAt),
        dob,
        note,
        status: "pending",
      },
    });

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
