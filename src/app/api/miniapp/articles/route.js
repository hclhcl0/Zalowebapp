/**
 * API: Lấy danh sách bài viết từ Payload CMS cho Mini App
 * GET /api/miniapp/articles?page=1&limit=10&search=&category=
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
    const page     = parseInt(searchParams.get("page")     || "1");
    const limit    = parseInt(searchParams.get("limit")    || "10");
    const search   = searchParams.get("search")   || "";
    const category = searchParams.get("category") || "";

    // Lấy URL CMS từ SystemConfig hoặc env
    const cmsCfg = await prisma.systemConfig.findUnique({ where: { key: "cms_url" } });
    const cmsUrl = cmsCfg?.value || process.env.CMS_URL || "https://zcdc.vnos.org";

    // Gọi Payload CMS REST API
    const params = new URLSearchParams({
      "where[_status][equals]": "published",
      "limit": String(limit),
      "page":  String(page),
      "sort":  "-publishedAt",
      "depth": "1",
    });

    if (search) {
      params.set("where[or][0][title][contains]", search);
      params.set("where[or][1][description][contains]", search);
    }

    if (category) {
      params.set("where[category.slug][equals]", category);
    }

    const res = await fetch(`${cmsUrl}/api/articles?${params}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 60 }, // cache 60 giây
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Không thể kết nối CMS" }, { status: 502 });
    }

    const data = await res.json();

    // Chuẩn hóa dữ liệu trả về cho Mini App
    const docs = (data.docs || []).map((a) => {
      const imgPath = a.image?.sizes?.card?.url || a.image?.url || "";
      const imageUrl = imgPath.startsWith("/") ? `${cmsUrl}${imgPath}` : imgPath;
      return {
        id:          a.id,
        title:       a.title,
        slug:        a.slug,
        description: a.description || "",
        imageUrl,
        category:    typeof a.category === "object" ? a.category?.name : a.category,
        publishedAt: a.publishedAt,
        url:         `${cmsUrl}/bai-viet/${a.slug}`,
      };
    });

    return NextResponse.json({
      docs,
      totalDocs:  data.totalDocs,
      totalPages: data.totalPages,
      page:       data.page,
      cmsUrl,
    });
  } catch (err) {
    console.error("[miniapp/articles]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
