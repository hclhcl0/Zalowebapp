/**
 * API: Cấu hình Hệ thống (Hotline, Bản đồ, ...)
 * GET /api/config          → Lấy tất cả cấu hình (dạng key-value)
 * PUT /api/config          → Cập nhật cấu hình
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany();
    // Trả về dạng object { key: value } cho dễ sử dụng
    const result = configs.reduce((acc, c) => {
      acc[c.key] = c.value;
      return acc;
    }, {});

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json(); // { key: "hotline", value: "0236123456", label: "Số điện thoại" }
    const { key, value, label } = body;

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value, ...(label && { label }) },
      create: { key, value, label },
    });

    return NextResponse.json({ data: config });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
