import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_DIR = path.resolve("data/hoi-dap-benh-truyen-nhiem");

async function importHoiDapToKnowledge() {
  try {
    console.log("=== BẮT ĐẦU NẠP HỎI ĐÁP PHÒNG CHỐNG BỆNH TRUYỀN NHIỄM VÀO KHỐI ÓC AI ===");
    console.log(`Đọc dữ liệu từ: ${DATA_DIR}`);

    if (!fs.existsSync(DATA_DIR)) {
      throw new Error(`Thư mục không tồn tại: ${DATA_DIR}`);
    }

    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".md"));
    console.log(`Tìm thấy ${files.length} tài liệu Markdown cần nạp.`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const filename of files) {
      const filePath = path.join(DATA_DIR, filename);
      const fileContent = fs.readFileSync(filePath, "utf-8");

      const firstLine = fileContent.split("\n")[0] || "";
      const title = firstLine.replace(/^#\s*/, "").trim() || filename.replace(".md", "");

      const existing = await prisma.aiKnowledge.findFirst({
        where: { title: title }
      });

      if (existing) {
        await prisma.aiKnowledge.update({
          where: { id: existing.id },
          data: {
            title: title,
            category: "Phòng chống bệnh truyền nhiễm",
            content: fileContent,
            sourceExt: "md",
            allowedDepartment: null,
            updatedAt: new Date()
          }
        });
        updatedCount++;
        console.log(`🔄 [Cập nhật ID ${existing.id}] ${title}`);
      } else {
        const created = await prisma.aiKnowledge.create({
          data: {
            title: title,
            category: "Phòng chống bệnh truyền nhiễm",
            content: fileContent,
            sourceExt: "md",
            allowedDepartment: null,
          }
        });
        createdCount++;
        console.log(`✅ [Tạo mới ID ${created.id}] ${title}`);
      }
    }

    const totalInDb = await prisma.aiKnowledge.count();
    console.log("\n=== KẾT QUẢ NẠP TRI THỨC ===");
    console.log(`- Tạo mới: ${createdCount} tài liệu`);
    console.log(`- Cập nhật: ${updatedCount} tài liệu`);
    console.log(`- Tổng số tài liệu trong toàn bộ Khối óc AI hiện tại: ${totalInDb} tài liệu`);
  } catch (err) {
    console.error("❌ Lỗi khi nạp tri thức:", err);
  } finally {
    await prisma.$disconnect();
  }
}

importHoiDapToKnowledge();
