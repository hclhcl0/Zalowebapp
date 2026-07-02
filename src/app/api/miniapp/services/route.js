/**
 * API: Bảng giá dịch vụ y tế (Mini App)
 * GET /api/miniapp/services?category=xxx
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
    const category = searchParams.get("category") || "";

    const services = await prisma.servicePrice.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Nhóm theo category
    const grouped = services.reduce((acc, svc) => {
      if (!acc[svc.category]) acc[svc.category] = [];
      acc[svc.category].push({
        id:       svc.id,
        name:     svc.name,
        price:    svc.price,
        unit:     svc.unit,
      });
      return acc;
    }, {});

    const categories = Object.entries(grouped).map(([name, items]) => ({
      name,
      items,
    }));

    return NextResponse.json({ data: categories, total: services.length });
  } catch (err) {
    console.error("[miniapp/services]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
