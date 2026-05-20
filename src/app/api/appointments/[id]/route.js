/**
 * API: Cập nhật trạng thái Lịch hẹn
 * PATCH /api/appointments/[id]  → Duyệt / Hủy lịch
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendZNS } from "@/lib/zalo";

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { status } = await request.json();

    const updated = await prisma.appointment.update({
      where: { id: Number(id) },
      data: { status },
    });

    // Gửi ZNS thông báo tự động khi duyệt lịch thành công
    if (status === "approved" && updated.phone) {
      await sendZNS({
        phone: updated.phone,
        templateId: process.env.ZNS_TEMPLATE_APPOINTMENT_ID || "your_template_id",
        templateData: {
          name: updated.fullName,
          date: new Date(updated.appointedAt).toLocaleDateString("vi-VN"),
          service: updated.vaccineType,
        },
      });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await prisma.appointment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
