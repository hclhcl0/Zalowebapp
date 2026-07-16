/**
 * GET  /api/miniapp/webcq-categories — Trả về danh sách chuyên mục đã chọn từ SystemConfig
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  try {
    const cfg = await prisma.systemConfig.findUnique({
      where: { key: "mini_app_webcq_categories" },
    });

    if (!cfg?.value) {
      return NextResponse.json({ data: [] });
    }

    const categories = JSON.parse(cfg.value);
    return NextResponse.json({ data: Array.isArray(categories) ? categories : [] });
  } catch (err) {
    console.error("[miniapp/webcq-categories]", err);
    return NextResponse.json({ data: [] });
  }
}
