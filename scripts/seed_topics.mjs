import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_TOPICS = [
  {
    topicCode: "DAI",
    topicLabel: "Bệnh dại & Động vật cắn",
    department: "Phòng chống bệnh truyền nhiễm",
    notifyZalo: true,
    keywords: "chó cắn, mèo cắn, dại, bệnh dại, vắc xin dại, huyết thanh kháng dại, sar, verorab, vaxirab, abhayrab, động vật cắn, rách da, cắn chảy máu, súc vật cắn",
  },
  {
    topicCode: "TIEM_CHUNG",
    topicLabel: "Tiêm chủng & Vắc xin",
    department: "Phòng khám đa khoa",
    notifyZalo: true,
    keywords: "tiêm, tiêm chủng, vắc xin, vacxin, tiêm phòng, lịch tiêm, mũi tiêm, tcmr, tiêm mở rộng, phản ứng sau tiêm, sốt sau tiêm, 6 trong 1, phế cầu, sởi, quai bị, rubella, hpv, ung thư cổ tử cung, viêm não nhật bản, thủy đậu, cúm mùa, rota",
  },
  {
    topicCode: "BENH_TRUYEN_NHIEM",
    topicLabel: "Bệnh truyền nhiễm & Dịch mùa",
    department: "Phòng chống bệnh truyền nhiễm",
    notifyZalo: true,
    keywords: "sốt xuất huyết, sxh, sốt dengue, tay chân miệng, tcm, cúm, cúm a, cúm b, thủy đậu, ho gà, whitmore, đậu mùa khỉ, lăng quăng, bọ gậy, muỗi vằn, phát ban, dịch bệnh, lây nhiễm, cách ly",
  },
  {
    topicCode: "XET_NGHIEM",
    topicLabel: "Xét nghiệm Y tế & Nước / Thực phẩm",
    department: "Xét nghiệm – CĐHA - TDCN",
    notifyZalo: true,
    keywords: "xét nghiệm, xn máu, xét nghiệm máu, vi sinh, pcr, hiv, viêm gan, test nhanh, xét nghiệm nước, nước ăn uống, nước sinh hoạt, mẫu nước, kiểm nghiệm thực phẩm, kết quả xét nghiệm, kqxn, chụp xquang, siêu âm",
  },
  {
    topicCode: "KHAM_BENH",
    topicLabel: "Khám bệnh & Khám sức khỏe",
    department: "Phòng khám đa khoa",
    notifyZalo: true,
    keywords: "khám bệnh, khám sức khỏe, ksk, khám lái xe, khám đi học, khám đi làm, giấy khám sức khỏe, bhyt, giờ khám, lịch khám, bác sĩ khám, phòng khám, kiểm tra sức khỏe, nội soi",
  },
  {
    topicCode: "DINH_DUONG",
    topicLabel: "Dinh dưỡng & An toàn thực phẩm",
    department: "Dinh dưỡng",
    notifyZalo: true,
    keywords: "dinh dưỡng, biếng ăn, suy dinh dưỡng, béo phì, thực đơn, vi chất, an toàn thực phẩm, attp, ngộ độc, ngộ độc thực phẩm, đau bụng, nôn mửa sau ăn, tiêu chảy",
  },
  {
    topicCode: "BENH_KHONG_LAY",
    topicLabel: "Bệnh không lây nhiễm & Thuốc lá",
    department: "Phòng chống bệnh không lây nhiễm",
    notifyZalo: true,
    keywords: "tăng huyết áp, huyết áp, đái tháo đường, tiểu đường, thuốc lá, cai thuốc lá, thuốc lá điện tử, tim mạch, bệnh nghề nghiệp",
  },
  {
    topicCode: "THU_TUC",
    topicLabel: "Thủ tục hành chính & Khiếu nại",
    department: "Tổ chức - Hành chính",
    notifyZalo: true,
    keywords: "thủ tục, hành chính, giấy tờ, chứng nhận, tuyển dụng, nộp hồ sơ, văn bản, phản ánh, khiếu nại, thái độ, ban giám đốc",
  },
];

async function main() {
  console.log("Khởi tạo danh mục chủ đề phân công cán bộ...");

  for (const t of DEFAULT_TOPICS) {
    const staff = await prisma.staffZaloLink.findFirst({
      where: { department: { contains: t.department } },
    });

    await prisma.topicAssignment.upsert({
      where: { topicCode: t.topicCode },
      create: {
        topicCode: t.topicCode,
        topicLabel: t.topicLabel,
        department: t.department,
        keywords: t.keywords,
        notifyZalo: t.notifyZalo,
        staffZaloUserId: staff?.zaloUserId || null,
        staffName: staff?.staffNameRaw || null,
      },
      update: {
        topicLabel: t.topicLabel,
        department: t.department,
        keywords: t.keywords,
        staffZaloUserId: staff?.zaloUserId || undefined,
        staffName: staff?.staffNameRaw || undefined,
      },
    });
  }

  const all = await prisma.topicAssignment.findMany();
  console.log(`Đã khởi tạo thành công ${all.length} chủ đề:`);
  all.forEach((t) => {
    console.log(` - [${t.topicCode}] ${t.topicLabel} -> ${t.department} | Cán bộ: ${t.staffName || "Chưa gán"} (${t.staffZaloUserId || "Chưa có ID"})`);
  });
}

main()
  .catch((e) => {
    console.error("Lỗi:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
