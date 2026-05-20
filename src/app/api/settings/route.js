/**
 * API: Đọc và lưu cấu hình hệ thống (key-value)
 * GET /api/settings        → Lấy toàn bộ cài đặt
 * POST /api/settings       → Lưu một hoặc nhiều cài đặt
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany();
    const result = configs.reduce((acc, c) => {
      acc[c.key] = { value: c.value, label: c.label };
      return acc;
    }, {});
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json(); // { key, value, label }[]
    const items = Array.isArray(body) ? body : [body];

    const results = await Promise.all(
      items.map(({ key, value, label }) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value: value ?? "", ...(label && { label }) },
          create: { key, value: value ?? "", label: label ?? key },
        })
      )
    );

    return NextResponse.json({ data: results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
