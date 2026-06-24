import "dotenv/config";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// URL của phần mềm Khám Sức Khỏe
const HEALTH_APP_API_URL = "http://localhost:3000/api/export/zalo-oa";

async function syncAiKnowledge() {
  try {
    console.log("1. Đang lấy dữ liệu từ hệ thống Khám Sức Khỏe...");
    const reportRes = await fetch(HEALTH_APP_API_URL);
    const reportData = await reportRes.json();

    if (!reportData.success) {
      throw new Error("Không thể lấy dữ liệu: " + reportData.error);
    }

    const markdownText = reportData.data.markdown_knowledge;
    const title = "Báo cáo Khám Sức Khỏe Toàn Dân (Số liệu cập nhật hằng ngày)";

    console.log("Nội dung AI Knowledge thu được:\n", markdownText.substring(0, 200) + "...\n");

    console.log("2. Cập nhật vào kho tri thức AI (bảng AiKnowledge)...");
    
    // Tìm xem đã có bài viết này trong kho chưa
    const existingDoc = await prisma.aiKnowledge.findFirst({
      where: { title: title }
    });

    let doc;
    if (existingDoc) {
      // Cập nhật
      doc = await prisma.aiKnowledge.update({
        where: { id: existingDoc.id },
        data: { 
          content: markdownText,
          updatedAt: new Date()
        }
      });
      console.log("✅ Đã CẬP NHẬT thành công tài liệu ID:", doc.id);
    } else {
      // Tạo mới
      doc = await prisma.aiKnowledge.create({
        data: {
          title: title,
          category: "Thống kê Y tế",
          content: markdownText,
          sourceExt: "md",
        }
      });
      console.log("✅ Đã TẠO MỚI thành công tài liệu ID:", doc.id);
    }

    // Xóa cache của Gemini bên Zalo OA (nếu có dùng cache)
    try {
      const { clearKnowledgeCache } = await import("../src/lib/gemini.js");
      clearKnowledgeCache();
      console.log("✅ Đã xóa cache AI.");
    } catch (e) {
      // Bỏ qua nếu ko có hàm này
    }

  } catch (error) {
    console.error("❌ Lỗi đồng bộ:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

syncAiKnowledge();
