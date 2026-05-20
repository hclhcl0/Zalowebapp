import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // 1. Lấy Access Token từ cấu hình hệ thống
    const config = await prisma.systemConfig.findUnique({
      where: { key: "zalo_access_token" },
    });
    const token = config?.value ?? process.env.ZALO_ACCESS_TOKEN ?? "";
    if (!token) {
      return NextResponse.json({ error: "Không tìm thấy Zalo Access Token. Vui lòng cấu hình kết nối trước." }, { status: 400 });
    }

    let offset = 0;
    const limit = 10;
    let total = 0;
    let zaloArticles = [];

    // 2. Vòng lặp lấy toàn bộ bài viết từ Zalo OA theo trang (tối đa 10 bài/request theo giới hạn Zalo)
    do {
      console.log(`[Sync API] Đang lấy bài viết từ offset: ${offset}, limit: ${limit}`);
      const getsliceUrl = `https://openapi.zalo.me/v2.0/article/getslice?offset=${offset}&limit=${limit}&type=normal`;
      const sliceRes = await fetch(getsliceUrl, {
        method: "GET",
        headers: { access_token: token },
      });
      
      const sliceData = await sliceRes.json();
      if (sliceData.error !== 0) {
        return NextResponse.json({ error: `Lỗi Zalo API tại offset ${offset}: ${sliceData.message} (Mã: ${sliceData.error})` }, { status: 400 });
      }
      
      const pageArticles = sliceData.data?.medias || [];
      zaloArticles = zaloArticles.concat(pageArticles);
      total = sliceData.data?.total || 0;
      
      offset += limit;
      
      if (pageArticles.length === 0 || offset >= total) {
        break;
      }
      
      // Delay nhỏ giữa các request tránh rate limit
      await new Promise((r) => setTimeout(r, 100));
    } while (offset < total);

    console.log(`[Sync API] Tổng số bài viết tìm thấy trên Zalo: ${zaloArticles.length} (Tổng thực tế: ${total})`);

    let createdCount = 0;
    let updatedCount = 0;

    // 3. Phân loại bài viết tự động dựa vào tiêu đề và mô tả
    const classifyCategory = (title = "", description = "") => {
      const text = `${title} ${description}`.toLowerCase();
      if (
        text.includes("tiêm chủng") || 
        text.includes("vắc xin") || 
        text.includes("vac xin") || 
        text.includes("lịch tiêm") || 
        text.includes("chủng ngừa")
      ) {
        return "vac_schedule";
      }
      if (
        text.includes("cảnh báo") || 
        text.includes("khẩn cấp") || 
        text.includes("dịch bệnh") || 
        text.includes("sốt xuất huyết") || 
        text.includes("não mô cầu") || 
        text.includes("quai bị") || 
        text.includes("dịch sởi") ||
        text.includes("corona") ||
        text.includes("covid")
      ) {
        return "alert";
      }
      return "daily_news";
    };

    // 4. Lặp qua từng bài viết của Zalo để đồng bộ vào database
    for (const item of zaloArticles) {
      const zaloId = item.id;
      
      // Kiểm tra xem bài viết đã tồn tại trong DB chưa
      const existing = await prisma.newsArticle.findFirst({
        where: { zaloArticleId: zaloId }
      });

      // Lấy chi tiết bài viết từ Zalo OA để lấy nội dung HTML và mô tả đầy đủ
      const detailUrl = `https://openapi.zalo.me/v2.0/article/getdetail?id=${zaloId}`;
      const detailRes = await fetch(detailUrl, {
        method: "GET",
        headers: { access_token: token }
      });
      const detailJson = await detailRes.json();

      let summary = item.title;
      let contentHtml = "";
      let category = classifyCategory(item.title);

      if (detailJson.error === 0 && detailJson.data) {
        const detail = detailJson.data;
        summary = detail.description || item.title;
        category = classifyCategory(detail.title, detail.description);

        // Chuyển đổi mảng blocks body thành HTML chuỗi để lưu vào DB
        if (Array.isArray(detail.body)) {
          contentHtml = detail.body.map((block) => {
            if (block.type === "text") {
              return block.content; // Đã là chuỗi HTML (p, strong...)
            } else if (block.type === "image") {
              return `<div style="text-align: center; margin: 16px 0;"><img src="${block.url}" alt="${block.caption || ""}" style="max-width: 100%; height: auto; border-radius: 8px;" />${block.caption ? `<p style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">${block.caption}</p>` : ""}</div>`;
            }
            return "";
          }).join("\n");
        }
      } else {
        // Fallback nếu không lấy được chi tiết
        contentHtml = `<p>Xem bài viết chi tiết tại Zalo OA CDC Đà Nẵng: <a href="${item.link_view}" target="_blank">${item.title}</a></p>`;
      }

      const publishedAtDate = item.create_date ? new Date(item.create_date) : new Date();

      if (existing) {
        // Cập nhật thông tin bài viết cũ
        await prisma.newsArticle.update({
          where: { id: existing.id },
          data: {
            title: item.title,
            summary: summary,
            content: contentHtml || existing.content,
            coverUrl: item.thumb || existing.coverUrl,
            category: category,
            isPublished: true,
            publishedAt: publishedAtDate,
          }
        });
        updatedCount++;
      } else {
        // Tạo bài viết mới
        await prisma.newsArticle.create({
          data: {
            title: item.title,
            summary: summary,
            content: contentHtml,
            coverUrl: item.thumb,
            category: category,
            zaloArticleId: zaloId,
            isPublished: true,
            publishedAt: publishedAtDate,
          }
        });
        createdCount++;
      }
      
      // Delay nhỏ tránh làm nghẽn Zalo API khi gọi chi tiết nhiều bài viết
      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({
      success: true,
      totalCount: zaloArticles.length,
      createdCount,
      updatedCount
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
