// D:\CDC\zalo oa\admin-dashboard\scripts\sync_cdc_media_to_markdown.mjs
// Tổng hợp toàn bộ 274+ tài liệu từ CDC Media (https://media.ksbtdanang.vn)
// thành các tệp tri thức chuẩn Markdown chuyên đề (.md), nạp vào khối óc AI
// thay vì tạo hàng trăm link đơn lẻ làm ngập lụt bảng quản lý AiKnowledge.

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CDC_MEDIA_URL = (process.env.CDC_MEDIA_URL || "https://media.ksbtdanang.vn").replace(/\/+$/, "");
const DATA_DIR = path.resolve("data/cdc-media");

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

async function syncCdcMediaToMarkdown() {
  console.log("==================================================================");
  console.log("📚 BẮT ĐẦU TỔNG HỢP TÀI LIỆU CDC MEDIA THÀNH CÁC FILE MARKDOWN (.MD)");
  console.log(`🌐 Nguồn dữ liệu: ${CDC_MEDIA_URL}/api/files?limit=1500`);
  console.log("==================================================================");

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const publicDir = path.resolve("public");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // 1. Tải danh sách toàn bộ file từ CDC Media
    const res = await fetch(`${CDC_MEDIA_URL}/api/files?limit=1500`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CDC-ZaloOA-SyncMarkdown/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Lỗi kết nối CDC Media (HTTP ${res.status}): ${res.statusText}`);
    }

    const json = await res.json();
    const files = json.files || [];
    console.log(`📦 Đã tải về thông tin của ${files.length} tài liệu truyền thông.`);

    // 2. Phân loại theo 4 nhóm chuyên đề lớn
    const groups = {
      VIDEO: {
        title: "01 - Danh mục Video Truyền thông CDC Đà Nẵng",
        category: "Kho Tài liệu & Video CDC Media",
        filename: "01-video-truyen-thong-cdc-media.md",
        icon: "🎬",
        items: []
      },
      GRAPHICS: {
        title: "02 - Danh mục Ấn phẩm & Infographic Y tế CDC Đà Nẵng",
        category: "Kho Tài liệu & Video CDC Media",
        filename: "02-an-pham-infographic-cdc-media.md",
        icon: "🖼️",
        items: []
      },
      DOCUMENTS: {
        title: "03 - Danh mục Cẩm nang, Tài liệu & Tờ rơi Y tế CDC Đà Nẵng",
        category: "Kho Tài liệu & Video CDC Media",
        filename: "03-tai-lieu-to-roi-cdc-media.md",
        icon: "📄",
        items: []
      },
      AUDIO: {
        title: "04 - Danh mục Bản tin Âm thanh & Podcast Sức khỏe CDC Đà Nẵng",
        category: "Kho Tài liệu & Video CDC Media",
        filename: "04-am-thanh-podcast-cdc-media.md",
        icon: "🎙️",
        items: []
      }
    };

    for (const f of files) {
      const g = getMediaGroup(f);
      groups[g].items.push(f);
    }

    // 3. Tạo nội dung Markdown có cấu trúc cho từng chuyên đề
    const createdDocIds = [];

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
        const detailUrl = `${CDC_MEDIA_URL}/document/${item.id}`;
        const thumbUrl = item.thumbnailUrl && item.thumbnailUrl.startsWith("http")
          ? item.thumbnailUrl
          : `${CDC_MEDIA_URL}/api/thumbnail/${item.id}`;
        
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
      const filePath = path.join(DATA_DIR, grp.filename);
      fs.writeFileSync(filePath, mdContent, "utf-8");
      console.log(`💾 Đã tạo file Markdown: ${filePath} (${grp.items.length} tài liệu)`);
    }

    // Tạo file tổng hợp Master vào public/
    const masterFiles = [
      groups.VIDEO,
      groups.GRAPHICS,
      groups.DOCUMENTS,
      groups.AUDIO
    ];
    const masterLines = [
      `# TỔNG HỢP TOÀN BỘ DANH MỤC TÀI LIỆU & VIDEO TRUYỀN THÔNG CDC ĐÀ NẴNG`,
      `Cập nhật tự động từ hệ thống CDC Media (${CDC_MEDIA_URL})`,
      `Tổng số: ${files.length} tài liệu truyền thông các loại.`,
      `---`,
      ``
    ];
    for (const grp of masterFiles) {
      masterLines.push(`## ${grp.icon} ${grp.title} (${grp.items.length} tài liệu)`);
      for (const item of grp.items) {
        masterLines.push(`- [${item.title}](${CDC_MEDIA_URL}/document/${item.id}) - *Chuyên mục: ${item.category?.name || "Y tế"}*`);
      }
      masterLines.push(``);
    }
    fs.writeFileSync(
      path.join(publicDir, "DANH_MUC_TAI_LIEU_VA_VIDEO_TRUYEN_THONG_CDC_MEDIA.md"),
      masterLines.join("\n"),
      "utf-8"
    );

    // 4. DỌN DẸP DATABASE: Xóa toàn bộ 270 link riêng lẻ đã nạp trước đó
    console.log("\n🧹 Đang dọn dẹp các link đơn lẻ trong bảng AiKnowledge...");
    const oldMediaCategories = [
      "Video Truyền thông",
      "Ấn phẩm & Infographic",
      "Âm thanh & Podcast",
      "Tài liệu & Tờ rơi",
      "Tài liệu Truyền thông"
    ];

    const deleteResult = await prisma.aiKnowledge.deleteMany({
      where: {
        category: { in: oldMediaCategories }
      }
    });
    console.log(`🗑️ Đã xóa sạch ${deleteResult.count} dòng link riêng lẻ làm rối giao diện quản trị.`);

    // 5. NẠP CHỈ 4 FILE MARKDOWN TỔNG HỢP VÀO BẢNG AI KNOWLEDGE
    console.log("\n📥 Đang nạp 4 tài liệu Markdown tổng hợp vào Khối óc AI (AiKnowledge)...");
    for (const [key, grp] of Object.entries(groups)) {
      const filePath = path.join(DATA_DIR, grp.filename);
      const content = fs.readFileSync(filePath, "utf-8");
      const title = `[Kho Media] ${grp.title}`;
      const sourceUrl = `${CDC_MEDIA_URL}/api/public/media?type=${key.toLowerCase()}`;

      const existing = await prisma.aiKnowledge.findFirst({
        where: {
          OR: [
            { title: title },
            { sourceUrl: sourceUrl }
          ]
        }
      });

      if (existing) {
        await prisma.aiKnowledge.update({
          where: { id: existing.id },
          data: {
            title: title,
            category: "Kho Tài liệu & Video CDC Media",
            content: content,
            sourceUrl: sourceUrl,
            sourceExt: "md",
            allowedDepartment: null,
            updatedAt: new Date()
          }
        });
        console.log(`🔄 Cập nhật tài liệu: ${title}`);
      } else {
        await prisma.aiKnowledge.create({
          data: {
            title: title,
            category: "Kho Tài liệu & Video CDC Media",
            content: content,
            sourceUrl: sourceUrl,
            sourceExt: "md",
            allowedDepartment: null
          }
        });
        console.log(`✅ Tạo mới tài liệu: ${title}`);
      }
    }

    const totalInDb = await prisma.aiKnowledge.count();
    console.log("------------------------------------------------------------------");
    console.log("🎉 ĐÃ HOÀN TẤT ĐỒNG BỘ MARKDOWN!");
    console.log(`✨ Bảng AiKnowledge đã được tinh gọn, hiện chỉ còn tổng cộng: ${totalInDb} tài liệu chuẩn.`);
    console.log(`📁 File Markdown đã được lưu tại: ${DATA_DIR}`);
    console.log("==================================================================");
  } catch (err) {
    console.error("❌ Lỗi khi đồng bộ:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncCdcMediaToMarkdown();
