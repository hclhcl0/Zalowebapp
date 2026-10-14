// D:\CDC\zalo oa\admin-dashboard\src\app\api\cron\sync-media\route.js
// API tự động đồng bộ CDC Media thành các tài liệu Markdown tổng hợp (.md)
// Đảm bảo không tạo link riêng lẻ làm ngập lụt bảng Quản lý Tri thức AI.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function getMediaGroup(f) {
  const fileType = f.fileType || "";
  const group = f.category?.group || "";
  const fn = (f.filename || "").toLowerCase();

  if (fileType.startsWith("video/") || group === "VIDEO" || fn.endsWith(".mp4") || fn.endsWith(".mov") || fn.endsWith(".webm")) {
    return "VIDEO";
  }
  if (fileType.startsWith("audio/") || group === "AUDIO" || fn.endsWith(".mp3") || fn.endsWith(".wav")) {
    return "AUDIO";
  }
  if (fileType.startsWith("image/") || group === "GRAPHICS" || fn.endsWith(".png") || fn.endsWith(".jpg") || fn.endsWith(".webp")) {
    return "GRAPHICS";
  }
  return "DOCUMENTS";
}

export async function GET(request) {
  // Xác thực Vercel Cron nếu có CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron sync-media] Unauthorized request blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cdcMediaUrl = (process.env.CDC_MEDIA_URL || "https://media.ksbtdanang.vn").replace(/\/+$/, "");
    const dataDir = path.resolve(process.cwd(), "data", "cdc-media");
    const publicDir = path.resolve(process.cwd(), "public");

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // 1. Tải danh sách toàn bộ file từ CDC Media
    const res = await fetch(`${cdcMediaUrl}/api/files?limit=1500`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CDC-ZaloOA-CronMarkdown/1.0",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }

    const filesData = await res.json();
    const files = filesData.files || [];

    // 2. Phân loại theo 4 nhóm chuyên đề lớn
    const groups = {
      VIDEO: {
        title: "01 - Danh mục Video Truyền thông CDC Đà Nẵng",
        filename: "01-video-truyen-thong-cdc-media.md",
        icon: "🎬",
        items: []
      },
      GRAPHICS: {
        title: "02 - Danh mục Ấn phẩm & Infographic Y tế CDC Đà Nẵng",
        filename: "02-an-pham-infographic-cdc-media.md",
        icon: "🖼️",
        items: []
      },
      DOCUMENTS: {
        title: "03 - Danh mục Cẩm nang, Tài liệu & Tờ rơi Y tế CDC Đà Nẵng",
        filename: "03-tai-lieu-to-roi-cdc-media.md",
        icon: "📄",
        items: []
      },
      AUDIO: {
        title: "04 - Danh mục Bản tin Âm thanh & Podcast Sức khỏe CDC Đà Nẵng",
        filename: "04-am-thanh-podcast-cdc-media.md",
        icon: "🎙️",
        items: []
      }
    };

    for (const f of files) {
      const g = getMediaGroup(f);
      groups[g].items.push(f);
    }

    // 3. Tạo nội dung Markdown và lưu file
    for (const [key, grp] of Object.entries(groups)) {
      const lines = [
        `# ${grp.icon} ${grp.title.toUpperCase()}`,
        ``,
        `> Tài liệu do Trung tâm Kiểm soát bệnh tật (CDC) TP. Đà Nẵng phát hành chính thức.`,
        `> Dùng làm tài liệu tham khảo bổ trợ (video, hình ảnh, tài liệu trực quan) sau khi đã giải đáp đầy đủ thông tin chuyên môn cho người dân.`,
        `> Tổng số mục trong danh mục này: ${grp.items.length} tài liệu.`,
        ``,
        `---`,
        ``
      ];

      grp.items.forEach((item, index) => {
        const detailUrl = `${cdcMediaUrl}/document/${item.id}`;
        const thumbUrl = item.thumbnailUrl && item.thumbnailUrl.startsWith("http")
          ? item.thumbnailUrl
          : `${cdcMediaUrl}/api/thumbnail/${item.id}`;
        
        const tagList = Array.isArray(item.tags)
          ? item.tags.map(t => t.tag?.name || t.name).filter(Boolean)
          : [];
        const tagStr = tagList.length > 0 ? tagList.join(", ") : "CDC Đà Nẵng, Y tế dự phòng";

        const summary = item.description && item.description.trim().length > 5
          ? item.description.trim()
          : `Tài liệu truyền thông chính thức: ${item.title}. Phục vụ công tác tuyên truyền phòng chống dịch bệnh và nâng cao sức khỏe cộng đồng.`;

        lines.push(`### ${index + 1}. ${item.title}`);
        lines.push(`- **Chuyên mục**: ${item.category?.name || "Truyền thông y tế"}`);
        lines.push(`- **Chủ đề & Từ khóa tra cứu**: ${tagStr}`);
        lines.push(`- **Tóm tắt nội dung**: ${summary}`);
        lines.push(`- **Đường link xem chính thức**: ${detailUrl}`);
        lines.push(`- **Ảnh xem trước (Thumbnail)**: ${thumbUrl}`);
        lines.push(``);
      });

      const mdContent = lines.join("\n");
      const filePath = path.join(dataDir, grp.filename);
      fs.writeFileSync(filePath, mdContent, "utf-8");
    }

    // 4. Xóa sạch các link riêng lẻ cũ nếu còn tồn tại
    const oldMediaCategories = [
      "Video Truyền thông",
      "Ấn phẩm & Infographic",
      "Âm thanh & Podcast",
      "Tài liệu & Tờ rơi",
      "Tài liệu Truyền thông"
    ];
    await prisma.aiKnowledge.deleteMany({
      where: { category: { in: oldMediaCategories } }
    });

    // 5. Nạp 4 tài liệu Markdown tổng hợp vào AiKnowledge
    let updatedCount = 0;
    for (const [key, grp] of Object.entries(groups)) {
      const filePath = path.join(dataDir, grp.filename);
      const content = fs.readFileSync(filePath, "utf-8");
      const title = `[Kho Media] ${grp.title}`;
      const sourceUrl = `${cdcMediaUrl}/api/public/media?type=${key.toLowerCase()}`;

      const existing = await prisma.aiKnowledge.findFirst({
        where: {
          OR: [{ title }, { sourceUrl }]
        }
      });

      if (existing) {
        await prisma.aiKnowledge.update({
          where: { id: existing.id },
          data: {
            title,
            category: "Kho Tài liệu & Video CDC Media",
            content,
            sourceUrl,
            sourceExt: "md",
            allowedDepartment: null,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.aiKnowledge.create({
          data: {
            title,
            category: "Kho Tài liệu & Video CDC Media",
            content,
            sourceUrl,
            sourceExt: "md",
            allowedDepartment: null
          }
        });
      }
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đồng bộ thành công ${files.length} tài liệu CDC Media thành 4 tệp Markdown chuyên đề trong Khối óc AI! Bảng tri thức được tinh gọn hoàn toàn.`,
      totalFiles: files.length,
      markdownDocsCount: updatedCount,
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
