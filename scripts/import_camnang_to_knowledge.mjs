import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_DIR = path.resolve("data/cam-nang-suc-khoe");

async function importCamNangToKnowledge() {
  try {
    console.log("=== BẮT ĐẦU NẠP CẨM NANG SỨC KHỎE VÀO KHỐI ÓC AI ===");
    console.log(`Đọc dữ liệu từ: ${DATA_DIR}`);

    if (!fs.existsSync(DATA_DIR)) {
      throw new Error(`Thư mục không tồn tại: ${DATA_DIR}`);
    }

    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith(".md") && !f.startsWith("CAM_NANG_TIEM_CHUNG_VA_SUC_KHOE"));

    console.log(`Tìm thấy ${files.length} bài viết cẩm nang cần nạp.`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const filename of files) {
      const filePath = path.join(DATA_DIR, filename);
      const fileContent = fs.readFileSync(filePath, "utf-8");

      // Trích xuất tiêu đề từ dòng đầu tiên (# Tiêu đề)
      const firstLine = fileContent.split("\n")[0] || "";
      const title = firstLine.replace(/^#\s*/, "").trim() || filename.replace(".md", "");

      // Trích xuất Source URL nếu có
      const urlMatch = fileContent.match(/- \*\*Nguồn tài liệu\*\*:\s*CDC Đà Nẵng \(\[([^\]]+)\]\(([^)]+)\)\)/);
      const sourceUrl = urlMatch ? urlMatch[2] : `https://ksbtdanang.vn/cam-nang`;

      // Kiểm tra xem đã có trong DB chưa
      const existing = await prisma.aiKnowledge.findFirst({
        where: {
          OR: [
            { sourceUrl: sourceUrl },
            { title: title }
          ]
        }
      });

      if (existing) {
        await prisma.aiKnowledge.update({
          where: { id: existing.id },
          data: {
            title: title,
            category: "Cẩm nang sức khỏe",
            content: fileContent,
            sourceUrl: sourceUrl,
            sourceExt: "md",
            allowedDepartment: null, // Công khai cho cả người dân và cán bộ
            updatedAt: new Date()
          }
        });
        updatedCount++;
        console.log(`🔄 [Cập nhật ID ${existing.id}] ${title}`);
      } else {
        const created = await prisma.aiKnowledge.create({
          data: {
            title: title,
            category: "Cẩm nang sức khỏe",
            content: fileContent,
            sourceUrl: sourceUrl,
            sourceExt: "md",
            allowedDepartment: null, // Công khai cho cả người dân và cán bộ
          }
        });
        createdCount++;
        console.log(`✅ [Tạo mới ID ${created.id}] ${title}`);
      }
    }

    // Nạp thêm file tổng hợp để AI có cái nhìn bao quát toàn bộ lịch tiêm
    const masterPath = path.join(DATA_DIR, "CAM_NANG_TIEM_CHUNG_VA_SUC_KHOE_CDC_DA_NANG.md");
    if (fs.existsSync(masterPath)) {
      const masterContent = fs.readFileSync(masterPath, "utf-8");
      const masterTitle = "Toàn thư Cẩm nang Sức khỏe & Lịch tiêm chủng CDC Đà Nẵng (Tổng hợp 19 chuyên đề)";
      const masterUrl = "https://ksbtdanang.vn/cam-nang";

      const existingMaster = await prisma.aiKnowledge.findFirst({
        where: { title: masterTitle }
      });

      if (existingMaster) {
        await prisma.aiKnowledge.update({
          where: { id: existingMaster.id },
          data: {
            category: "Cẩm nang sức khỏe",
            content: masterContent,
            sourceUrl: masterUrl,
            sourceExt: "md",
            allowedDepartment: null,
            updatedAt: new Date()
          }
        });
        console.log(`🔄 [Cập nhật ID ${existingMaster.id}] ${masterTitle}`);
      } else {
        const createdMaster = await prisma.aiKnowledge.create({
          data: {
            title: masterTitle,
            category: "Cẩm nang sức khỏe",
            content: masterContent,
            sourceUrl: masterUrl,
            sourceExt: "md",
            allowedDepartment: null,
          }
        });
        console.log(`✅ [Tạo mới ID ${createdMaster.id}] ${masterTitle}`);
      }
    }

    const totalInDb = await prisma.aiKnowledge.count({
      where: { category: "Cẩm nang sức khỏe" }
    });

    console.log("\n=== KẾT QUẢ NẠP TRI THỨC ===");
    console.log(`- Tạo mới: ${createdCount} bài`);
    console.log(`- Cập nhật: ${updatedCount} bài`);
    console.log(`- Tổng số bài Cẩm nang sức khỏe trong Khối óc AI: ${totalInDb} bài`);

  } catch (err) {
    console.error("❌ Lỗi trong quá trình nạp tri thức:", err);
  } finally {
    await prisma.$disconnect();
  }
}

importCamNangToKnowledge();
