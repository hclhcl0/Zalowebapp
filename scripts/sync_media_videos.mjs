// D:\CDC\zalo oa\admin-dashboard\scripts\sync_media_videos.mjs
// Đồng bộ video từ CDC Media (http://media.ksbtdanang.vn) vào cơ sở tri thức AiKnowledge của Zalo OA

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CDC_MEDIA_URL = (process.env.CDC_MEDIA_URL || "http://media.ksbtdanang.vn").replace(/\/+$/, "");

async function syncMediaVideos() {
  console.log("==================================================================");
  console.log("🎬 BẮT ĐẦU ĐỒNG BỘ VIDEO TỪ CDC MEDIA VÀO TRỢ LÝ AI ZALO OA");
  console.log(`🌐 Nguồn dữ liệu: ${CDC_MEDIA_URL}/api/public/videos`);
  console.log("==================================================================");

  try {
    let videoList = [];
    const publicApiUrl = `${CDC_MEDIA_URL}/api/public/videos?limit=300`;
    console.log(`📡 Đang gọi API chính: ${publicApiUrl}...`);

    let res = await fetch(publicApiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CDC-ZaloOA-Sync/1.0",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.videos)) {
        videoList = data.videos;
      }
    }

    // Fallback sang endpoint /api/files nếu chưa deploy /api/public/videos
    if (videoList.length === 0) {
      const fallbackUrl = `${CDC_MEDIA_URL}/api/files?limit=1500`;
      console.log(`🔄 Chuyển sang endpoint dự phòng: ${fallbackUrl}...`);
      res = await fetch(fallbackUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "CDC-ZaloOA-Sync/1.0",
        },
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối CDC Media (HTTP ${res.status}): ${res.statusText}`);
      }

      const filesData = await res.json();
      const files = filesData.files || [];

      // Lọc các file là video
      const rawVideos = files.filter((f) => {
        const ft = f.fileType || "";
        const grp = f.category?.group || "";
        const fn = (f.filename || "").toLowerCase();
        return ft.startsWith("video/") || grp === "VIDEO" || fn.endsWith(".mp4") || fn.endsWith(".mov") || fn.endsWith(".webm");
      });

      videoList = rawVideos.map((v) => {
        const detailUrl = `${CDC_MEDIA_URL}/document/${v.id}`;
        const tagList = Array.isArray(v.tags) ? v.tags.map((t) => t.tag?.name || t.name).filter(Boolean) : [];
        const tagString = tagList.length > 0 ? tagList.join(", ") : "CDC Đà Nẵng, Video truyền thông y tế";
        const summaryText = v.description && v.description.trim().length > 5
          ? v.description.trim()
          : `Video truyền thông y tế: ${v.title}. Phục vụ công tác tuyên truyền phòng chống bệnh và bảo vệ sức khỏe nhân dân.`;

        const markdownKnowledge = [
          `### [Video] ${v.title}`,
          `- **Chuyên mục**: ${v.category?.name || "Video Truyền thông"}`,
          `- **Chủ đề / Từ khóa**: ${tagString}`,
          `- **Tóm tắt nội dung**: ${summaryText}`,
          `- **Đường link xem video chính thức**: ${detailUrl}`,
        ].join("\n");

        return {
          id: v.id,
          title: v.title,
          detailUrl,
          markdownKnowledge,
        };
      });
    }

    console.log(`📦 Tìm thấy ${videoList.length} video từ CDC Media.`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const v of videoList) {
      const knowledgeTitle = `[Video] ${v.title}`;
      const sourceUrl = v.detailUrl;

      // Tìm bản ghi video đã tồn tại dựa theo sourceUrl hoặc title
      const existing = await prisma.aiKnowledge.findFirst({
        where: {
          OR: [
            { sourceUrl: sourceUrl },
            { title: knowledgeTitle },
            { title: v.title },
          ],
        },
      });

      if (existing) {
        await prisma.aiKnowledge.update({
          where: { id: existing.id },
          data: {
            title: knowledgeTitle,
            category: "Video Truyền thông",
            content: v.markdownKnowledge,
            sourceUrl: sourceUrl,
            sourceExt: "video",
            allowedDepartment: null, // Công khai: cả Công dân và Cán bộ đều tra cứu được
            updatedAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        await prisma.aiKnowledge.create({
          data: {
            title: knowledgeTitle,
            category: "Video Truyền thông",
            content: v.markdownKnowledge,
            sourceUrl: sourceUrl,
            sourceExt: "video",
            allowedDepartment: null, // Công khai
          },
        });
        createdCount++;
      }
    }

    console.log("------------------------------------------------------------------");
    console.log(`✅ ĐỒNG BỘ THÀNH CÔNG!`);
    console.log(`✨ Đã thêm mới: ${createdCount} video`);
    console.log(`🔄 Đã cập nhật: ${updatedCount} video`);
    console.log(`🎯 Tổng video có trong tri thức AI: ${createdCount + updatedCount}`);
    console.log("==================================================================");
  } catch (error) {
    console.error("❌ Lỗi khi đồng bộ video từ CDC Media:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncMediaVideos();
