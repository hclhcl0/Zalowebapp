import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { canReadKnowledge, retrieveRelevantKnowledge } from "../src/lib/aiKnowledge.mjs";

const prisma = new PrismaClient();

async function testSearch() {
  try {
    console.log("=== KIỂM THỬ TRUY VẤN TRI THỨC CẨM NANG SỨC KHỎE ===");

    // Lấy tất cả tài liệu public cho người dân (citizen)
    const allDocs = await prisma.aiKnowledge.findMany({
      orderBy: { createdAt: "desc" }
    });

    const citizenDocs = allDocs.filter(d => canReadKnowledge(d, { isStaff: false }));
    console.log(`Số tài liệu người dân được quyền tra cứu: ${citizenDocs.length}/${allDocs.length}`);

    const testQueries = [
      "Bé 2 tháng tuổi cần tiêm những mũi vắc xin gì?",
      "Phụ nữ chuẩn bị mang thai cần tiêm phòng những gì và trước bao lâu?",
      "Quy trình tiêm chủng tại CDC Đà Nẵng gồm các bước nào?",
      "Vắc xin Hexaxim 6 trong 1 của Pháp phòng những bệnh gì?",
      "Sốt xuất huyết có vắc xin Qdenga chưa và tiêm mấy liều?",
      "Dấu hiệu sốt xuất huyết trở nặng cần đến bệnh viện ngay lập tức?",
      "Trẻ bị tay chân miệng chăm sóc tại nhà thế nào và thực hiện 3 sạch là gì?",
      "Quy trình rửa tay 6 bước với xà phòng như thế nào?",
      "Chăm sóc trẻ bị sởi và thủy đậu tại nhà cần lưu ý gì?"
    ];

    for (const q of testQueries) {
      console.log("\n------------------------------------------------------------");
      console.log(`❓ CÂU HỎI: "${q}"`);
      const matched = retrieveRelevantKnowledge(q, citizenDocs, "Người Dân");
      if (matched) {
        // Lấy danh sách các tiêu đề được chọn
        const titles = matched.match(/--- Tài liệu: [^\n]+ ---/g) || [];
        console.log(`🎯 AI đã truy xuất ${titles.length} tài liệu phù hợp nhất:`);
        titles.forEach(t => console.log(`   ${t}`));
      } else {
        console.log("⚠️ Không tìm thấy tài liệu phù hợp!");
      }
    }

  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testSearch();
