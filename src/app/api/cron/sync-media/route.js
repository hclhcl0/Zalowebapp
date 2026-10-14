// D:\CDC\zalo oa\admin-dashboard\src\app\api\cron\sync-media\route.js
// API tự động đồng bộ Video từ CDC Media vào bảng AiKnowledge của Zalo OA

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // Xác thực Vercel Cron nếu có CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron sync-media] Unauthorized request blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cdcMediaUrl = (process.env.CDC_MEDIA_URL || "http://media.ksbtdanang.vn").replace(/\/+$/, "");
    let mediaList = [];
    const apiUrl = `${cdcMediaUrl}/api/public/media?limit=1500`;

    console.log(`[Cron sync-media] Đang gọi API chính: ${apiUrl}...`);

    let res = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CDC-ZaloOA-Cron/1.0",
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        mediaList = data.items;
      }
    }

    // Fallback sang endpoint /api/files nếu chưa deploy /api/public/media
    if (mediaList.length === 0) {
      const fallbackUrl = `${cdcMediaUrl}/api/files?limit=1500`;
      console.log(`[Cron sync-media] Chuyển sang endpoint dự phòng: ${fallbackUrl}...`);
      res = await fetch(fallbackUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "CDC-ZaloOA-Cron/1.0",
        },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }

      const filesData = await res.json();
      const files = filesData.files || [];

      mediaList = files.map((f) => {
        let mediaGroup = "Tài liệu & Tờ rơi";
        const fileType = f.fileType || "";
        const group = f.category?.group || "";
        const fn = (f.filename || "").toLowerCase();

        if (fileType.startsWith("video/") || group === "VIDEO" || fn.endsWith(".mp4") || fn.endsWith(".mov")) {
          mediaGroup = "Video";
        } else if (fileType.startsWith("audio/") || group === "AUDIO" || fn.endsWith(".mp3") || fn.endsWith(".wav")) {
          mediaGroup = "Âm thanh & Podcast";
        } else if (fileType.startsWith("image/") || group === "GRAPHICS" || fn.endsWith(".png") || fn.endsWith(".jpg") || fn.endsWith(".webp")) {
          mediaGroup = "Ấn phẩm & Hình ảnh";
        }

        const tagList = Array.isArray(f.tags) ? f.tags.map((t) => t.tag?.name || t.name).filter(Boolean) : [];
        const tagString = tagList.length > 0 ? tagList.join(", ") : "CDC Đà Nẵng, Truyền thông y tế";
        const detailUrl = `${cdcMediaUrl}/document/${f.id}`;
        const summaryText = f.description && f.description.trim().length > 5
          ? f.description.trim()
          : `Tài liệu truyền thông y tế: ${f.title}. Phục vụ công tác tuyên truyền, bảo vệ sức khỏe nhân dân của CDC Đà Nẵng.`;

        const markdownKnowledge = [
          `### [${mediaGroup}] ${f.title}`,
          `- **Định dạng / Thể loại**: ${mediaGroup}`,
          `- **Chuyên mục**: ${f.category?.name || "Truyền thông y tế"}`,
          `- **Chủ đề / Từ khóa**: ${tagString}`,
          `- **Tóm tắt nội dung**: ${summaryText}`,
          `- **Đường link xem / tải chính thức**: ${detailUrl}`,
        ].join("\n");

        return {
          id: f.id,
          title: f.title,
          mediaGroup,
          typeLabel: mediaGroup,
          detailUrl,
          markdownKnowledge,
        };
      });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of mediaList) {
      const groupName = item.mediaGroup || "Tài liệu";
      const knowledgeTitle = `[${groupName}] ${item.title}`;
      const sourceUrl = item.detailUrl;

      let categoryName = "Tài liệu Truyền thông";
      if (groupName === "Video") categoryName = "Video Truyền thông";
      else if (groupName.includes("Hình ảnh") || groupName.includes("Ấn phẩm")) categoryName = "Ấn phẩm & Infographic";
      else if (groupName.includes("Âm thanh") || groupName.includes("Podcast")) categoryName = "Âm thanh & Podcast";
      else if (groupName.includes("Tờ rơi") || groupName.includes("Tài liệu")) categoryName = "Tài liệu & Tờ rơi";

      const existing = await prisma.aiKnowledge.findFirst({
        where: {
          OR: [
            { sourceUrl: sourceUrl },
            { title: knowledgeTitle },
            { title: item.title },
          ],
        },
      });

      if (existing) {
        await prisma.aiKnowledge.update({
          where: { id: existing.id },
          data: {
            title: knowledgeTitle,
            category: categoryName,
            content: item.markdownKnowledge,
            sourceUrl: sourceUrl,
            sourceExt: (item.typeLabel || "doc").toLowerCase(),
            allowedDepartment: null, // Công khai: toàn bộ người dân và nhân viên đều tra cứu được
            updatedAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        await prisma.aiKnowledge.create({
          data: {
            title: knowledgeTitle,
            category: categoryName,
            content: item.markdownKnowledge,
            sourceUrl: sourceUrl,
            sourceExt: (item.typeLabel || "doc").toLowerCase(),
            allowedDepartment: null,
          },
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đồng bộ thành công ${mediaList.length} tài liệu truyền thông (Tạo mới: ${createdCount}, Cập nhật: ${updatedCount})`,
      createdCount,
      updatedCount,
      total: mediaList.length,
    });
  } catch (error) {
    console.error("[Cron sync-media] Lỗi đồng bộ:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  return GET(request);
}
