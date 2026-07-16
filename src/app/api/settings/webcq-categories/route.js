/**
 * GET  /api/settings/webcq-categories — Lấy danh sách categories từ ecdc.vnos.org + config đã lưu
 * POST /api/settings/webcq-categories — Lưu danh sách chuyên mục đã chọn vào SystemConfig
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const WEBCQ_API = "https://ecdc.vnos.org";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Lấy toàn bộ categories từ ecdc
    const res = await fetch(`${WEBCQ_API}/api/categories?limit=100&depth=0`, {
      next: { revalidate: 60 },
    });
    const json = await res.json();
    const allCategories = (json.docs || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon || "",
      color: c.color || "",
    }));

    // Lấy config đã lưu
    const cfg = await prisma.systemConfig.findUnique({
      where: { key: "mini_app_webcq_categories" },
    });
    const selected = cfg?.value ? JSON.parse(cfg.value) : [];
    const selectedIds = selected.map((c) => c.id);

    return NextResponse.json({ allCategories, selectedIds, selected });
  } catch (err) {
    console.error("[settings/webcq-categories GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { categories } = await request.json();
    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: "categories phải là mảng" }, { status: 400 });
    }

    await prisma.systemConfig.upsert({
      where: { key: "mini_app_webcq_categories" },
      update: { value: JSON.stringify(categories) },
      create: { key: "mini_app_webcq_categories", value: JSON.stringify(categories) },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[settings/webcq-categories POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
