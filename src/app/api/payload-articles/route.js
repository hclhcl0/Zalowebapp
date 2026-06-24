/**
 * API Proxy: Lấy danh sách bài viết từ Payload CMS
 * GET /api/payload-articles?search=&page=1
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const search = searchParams.get("search") || "";

    // Lấy URL CMS từ Settings DB (admin có thể thay đổi bất cứ lúc nào)
    const config = await prisma.systemConfig.findUnique({
      where: { key: "payload_cms_url" },
    });
    const cmsUrl = config?.value?.trim();

    if (!cmsUrl) {
      return NextResponse.json(
        { error: "Chưa cấu hình URL Website CMS. Vui lòng vào Cài đặt → Kết nối Website CMS để thêm URL." },
        { status: 503 }
      );
    }

    const params = new URLSearchParams({
      "where[_status][equals]": "published",
      "depth": "1",
      "limit": "20",
      "page": page,
      "sort": "-createdAt",
    });
    if (search) {
      params.set("where[title][like]", search);
    }

    const res = await fetch(`${cmsUrl}/api/articles?${params}`, {
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Không thể kết nối đến Website CMS (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Đính kèm cmsUrl vào response để client dùng tạo URL hình ảnh tuyệt đối
    return NextResponse.json({ ...data, cmsUrl });
  } catch (err) {
    console.error("[Payload Articles Proxy Error]", err);
    return NextResponse.json(
      { error: "Lỗi kết nối đến Website CMS: " + err.message },
      { status: 500 }
    );
  }
}
