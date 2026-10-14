// D:\CDC\zalo oa\admin-dashboard\scripts\sync_cdc_media.mjs
// Đồng bộ TOÀN BỘ tài liệu truyền thông (Video, Infographic, Poster, Tờ rơi, Cẩm nang, Audio)
// từ Ngân hàng tài liệu CDC Media (http://media.ksbtdanang.vn) vào khối óc AI (AiKnowledge) của Zalo OA.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CDC_MEDIA_URL = (process.env.CDC_MEDIA_URL || "http://media.ksbtdanang.vn").replace(/\/+$/, "");

async function syncAllCdcMedia() {
  console.log("==================================================================");
  console.log("📚 BẮT ĐẦU ĐỒNG BỘ TOÀN BỘ TÀI LIỆU TRUYỀN THÔNG TỪ CDC MEDIA");
  console.log(`🌐 Nguồn dữ liệu: ${CDC_MEDIA_URL}/api/public/media`);
  console.log("==================================================================");

  try {
    let mediaList = [];
    const publicApiUrl = `${CDC_MEDIA_URL}/api/public/media?limit=1500`;
    console.log(`📡 Đang gọi API chính: ${publicApiUrl}...`);

    let res = await fetch(publicApiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CDC-ZaloOA-SyncAll/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        mediaList = data.items;
      }
    }

    // Fallback sang endpoint /api/files nếu chưa deploy /api/public/media
    if (mediaList.length === 0) {
      const fallbackUrl = `${CDC_MEDIA_URL}/api/files?limit=1500`;
      console.log(`🔄 Chuyển sang endpoint dự phòng: ${fallbackUrl}...`);
      res = await fetch(fallbackUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "CDC-ZaloOA-SyncAll/1.0",
        },
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối CDC Media (HTTP ${res.status}): ${res.statusText}`);
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
        const detailUrl = `${CDC_MEDIA_URL}/document/${f.id}`;
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

    console.log(`📦 Tìm thấy ${mediaList.length} tài liệu truyền thông các loại từ CDC Media.`);

    let createdCount = 0;
    let updatedCount = 0;
    const statsByType = {};

    for (const item of mediaList) {
      const groupName = item.mediaGroup || "Tài liệu";
      const knowledgeTitle = `[${groupName}] ${item.title}`;
      const sourceUrl = item.detailUrl;

      // Phân nhóm tri thức rõ ràng để AI phân biệt
      let categoryName = "Tài liệu Truyền thông";
      if (groupName === "Video") categoryName = "Video Truyền thông";
      else if (groupName.includes("Hình ảnh") || groupName.includes("Ấn phẩm")) categoryName = "Ấn phẩm & Infographic";
      else if (groupName.includes("Âm thanh") || groupName.includes("Podcast")) categoryName = "Âm thanh & Podcast";
      else if (groupName.includes("Tờ rơi") || groupName.includes("Tài liệu")) categoryName = "Tài liệu & Tờ rơi";

      statsByType[categoryName] = (statsByType[categoryName] || 0) + 1;

      // Tìm bản ghi tài liệu đã tồn tại dựa theo sourceUrl hoặc title
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
            allowedDepartment: null, // Công khai: Người dân & Cán bộ đều tra cứu được
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
            allowedDepartment: null, // Công khai
          },
        });
        createdCount++;
      }
    }

    console.log("------------------------------------------------------------------");
    console.log(`✅ ĐỒNG BỘ THÀNH CÔNG TOÀN BỘ TÀI LIỆU TRUYỀN THÔNG!`);
    console.log(`✨ Đã thêm mới: ${createdCount} tài liệu`);
    console.log(`🔄 Đã cập nhật: ${updatedCount} tài liệu`);
    console.log(`📊 Phân bố theo thể loại:`);
    for (const [cat, count] of Object.entries(statsByType)) {
      console.log(`   + ${cat}: ${count} tài liệu`);
    }
    console.log(`🎯 Tổng tài liệu trong cơ sở tri thức AI: ${createdCount + updatedCount}`);
    console.log("==================================================================");
  } catch (error) {
    console.error("❌ Lỗi khi đồng bộ tài liệu từ CDC Media:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncAllCdcMedia();
