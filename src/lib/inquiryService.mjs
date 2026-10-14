/**
 * Inquiry & Routing Service — CDC Đà Nẵng Zalo OA
 * Quản lý câu hỏi người dân, phân loại chủ đề tự động,
 * điều phối đến cán bộ chuyên trách và gửi thông báo Zalo.
 */

import { prisma } from "./prisma.js";
import { sendTextMessage } from "./zalo.js";

// ============================================================
// DANH MỤC 8 CHỦ ĐỀ MẶC ĐỊNH
// ============================================================
export const DEFAULT_TOPICS = [
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

// Khởi tạo bảng TopicAssignment nếu chưa có
export async function ensureDefaultTopics() {
  try {
    const count = await prisma.topicAssignment.count();
    if (count === 0) {
      console.log("[InquiryService] Đang tạo danh mục chủ đề phân công mặc định...");
      for (const t of DEFAULT_TOPICS) {
        // Tìm 1 cán bộ đại diện trong phòng ban đó nếu có
        const staff = await prisma.staffZaloLink.findFirst({
          where: { department: { contains: t.department } },
        });

        await prisma.topicAssignment.create({
          data: {
            topicCode: t.topicCode,
            topicLabel: t.topicLabel,
            department: t.department,
            keywords: t.keywords,
            notifyZalo: t.notifyZalo,
            staffZaloUserId: staff?.zaloUserId || null,
            staffName: staff?.staffNameRaw || null,
          },
        });
      }
      console.log("[InquiryService] Đã tạo 8 nhóm chủ đề phân công thành công.");
    }
  } catch (err) {
    console.error("[InquiryService] Lỗi khi khởi tạo chủ đề:", err.message);
  }
}

// ============================================================
// HÀM PHÂN LOẠI CHỦ ĐỀ TỪ CÂU HỎI
// ============================================================
export async function classifyInquiryTopic(text) {
  if (!text) {
    return {
      topicCode: "KHAC",
      topicLabel: "Chủ đề khác / Tổng hợp",
      department: "Kế hoạch - Nghiệp vụ",
      staffZaloUserId: null,
      staffName: null,
      notifyZalo: true,
    };
  }

  await ensureDefaultTopics();

  const lowerText = text.toLowerCase();
  const topics = await prisma.topicAssignment.findMany();

  let bestMatch = null;
  let maxScore = 0;

  for (const t of topics) {
    if (!t.keywords) continue;
    const kwList = t.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    let score = 0;
    for (const kw of kwList) {
      if (lowerText.includes(kw)) {
        score += kw.length; // Từ khóa dài hơn được ưu tiên trọng số cao hơn
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = t;
    }
  }

  if (bestMatch && maxScore > 0) {
    return bestMatch;
  }

  return {
    topicCode: "KHAC",
    topicLabel: "Chủ đề khác / Tổng hợp",
    department: "Kế hoạch - Nghiệp vụ",
    staffZaloUserId: null,
    staffName: null,
    notifyZalo: true,
  };
}

// ============================================================
// HÀM NHẬN DIỆN "CÂU HỎI CHƯA ĐƯỢC GIẢI QUYẾT" HOẶC CẦN CÁN BỘ
// ============================================================
export function detectUnresolvedQuery(question = "", aiReply = "") {
  const lowerQ = question.toLowerCase();
  const lowerReply = (aiReply || "").toLowerCase();

  // 1. Người dân chủ động yêu cầu gặp bác sĩ / cán bộ / người thật
  const humanKeywords = [
    "gặp bác sĩ",
    "gap bac si",
    "bác sĩ tư vấn",
    "bac si tu van",
    "gặp nhân viên",
    "gap nhan vien",
    "tư vấn viên",
    "tu van vien",
    "gặp người thật",
    "gap nguoi that",
    "người thật trả lời",
    "nguoi that tra loi",
    "cho tôi số bác sĩ",
    "cho so bac si",
    "nói chuyện với người",
    "tổng đài viên",
    "chuyển máy",
    "liên hệ trực tiếp cán bộ",
    "nhân viên trả lời giúp",
    "không muốn chat với bot",
    "bot không hiểu",
  ];
  if (humanKeywords.some((kw) => lowerQ.includes(kw))) {
    return {
      isUnresolved: true,
      reason: "citizen_requested_human",
      detail: "Người dân chủ động yêu cầu trao đổi với Bác sĩ / Cán bộ chuyên môn",
    };
  }

  // 2. Tình huống cấp cứu / cảnh báo đỏ
  const emergencyKeywords = [
    "chó cắn chảy máu",
    "chó dại cắn",
    "mèo cắn chảy máu",
    "sốt cao co giật",
    "ngộ độc nôn mửa",
    "khó thở dữ dội",
    "sốc phản vệ",
    "phản ứng nặng sau tiêm",
    "ngất xỉu",
  ];
  if (emergencyKeywords.some((kw) => lowerQ.includes(kw))) {
    return {
      isUnresolved: true,
      reason: "medical_emergency",
      detail: "Tình huống cấp cứu / cần chỉ định y tế khẩn cấp của bác sĩ",
    };
  }

  // 3. AI trả lời mẫu fallback (thiếu dữ liệu, không có đủ thông tin, từ chối ngoài phạm vi)
  const aiFallbackPhrases = [
    "chưa có dữ liệu",
    "không có đủ thông tin",
    "chưa có thông tin",
    "tôi chưa có dữ liệu",
    "tôi không có thông tin",
    "chỉ có thể hỗ trợ các vấn đề liên quan",
    "đề nghị bạn liên hệ trực tiếp cdc",
    "vui lòng liên hệ cdc qua hotline",
    "vui lòng liên hệ trực tiếp cdc",
    "tạm thời không khả dụng",
    "hệ thống ai đang tạm thời không khả dụng",
    "không tìm thấy kết quả",
    "không tìm thấy thông tin",
  ];
  if (aiFallbackPhrases.some((phrase) => lowerReply.includes(phrase))) {
    return {
      isUnresolved: true,
      reason: "ai_insufficient_knowledge",
      detail: "AI không có đủ dữ liệu chuyên môn trong cơ sở tri thức",
    };
  }

  return { isUnresolved: false };
}

// ============================================================
// HÀM TẠO PHIẾU CÂU HỎI & BẮN TIN ZALO CHO CÁN BỘ PHỤ TRÁCH
// ============================================================
export async function createInquiryAndNotifyStaff({
  zaloUserId,
  citizenName = "Người dân",
  question,
  aiDraftReply = null,
  reason = "ai_insufficient_knowledge",
}) {
  try {
    // 1. Phân loại chủ đề
    const topic = await classifyInquiryTopic(question);

    // 2. Tìm cán bộ nhận thông báo (Ưu tiên cán bộ được gán trong TopicAssignment -> sau đó đến cán bộ trong phòng ban)
    let assignedStaffZaloId = topic.staffZaloUserId;
    let assignedStaffName = topic.staffName;

    if (!assignedStaffZaloId) {
      const fallbackStaff = await prisma.staffZaloLink.findFirst({
        where: { department: { contains: topic.department } },
      });
      if (fallbackStaff) {
        assignedStaffZaloId = fallbackStaff.zaloUserId;
        assignedStaffName = fallbackStaff.staffNameRaw;
      }
    }

    // 3. Tạo bản ghi CitizenInquiry trong DB
    const inquiry = await prisma.citizenInquiry.create({
      data: {
        zaloUserId,
        citizenName: citizenName || "Người dân Zalo",
        question,
        topic: topic.topicCode,
        topicLabel: topic.topicLabel,
        status: "pending_staff",
        aiDraftReply,
        assignedDept: topic.department,
        assignedStaffId: assignedStaffZaloId || null,
        assignedStaffName: assignedStaffName || null,
      },
    });

    // 4. Bắn tin Zalo thông báo tức thì cho Cán bộ phụ trách (nếu được bật và có Zalo ID)
    let staffNotified = false;
    if (topic.notifyZalo && assignedStaffZaloId) {
      const staffAlertMsg =
        `🚨 [CDC ĐÀ NẴNG - CÂU HỎI CỦA NGƯỜI DÂN CẦN XỬ LÝ]\n\n` +
        `📋 Chủ đề: ${topic.topicLabel}\n` +
        `👤 Người hỏi: ${citizenName} (Zalo ID: ${zaloUserId})\n` +
        `🏢 Đơn vị phụ trách: ${topic.department}\n` +
        `⏰ Thời gian: ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${new Date().toLocaleDateString("vi-VN")}\n\n` +
        `❓ Nội dung câu hỏi:\n"${question}"\n\n` +
        `👉 Cán bộ phụ trách vui lòng truy cập Trang quản trị ZCDC (Mục "Hỏi đáp & Tiếp nhận") để xem chi tiết và phản hồi cho người dân.`;

      try {
        const sendRes = await sendTextMessage(assignedStaffZaloId, staffAlertMsg);
        if (sendRes?.error === 0) {
          staffNotified = true;
          await prisma.citizenInquiry.update({
            where: { id: inquiry.id },
            data: { notifiedAt: new Date() },
          });
          console.log(`[InquiryService] Đã gửi thông báo Zalo cho cán bộ: ${assignedStaffName} (${assignedStaffZaloId})`);
        }
      } catch (err) {
        console.error(`[InquiryService] Không thể gửi Zalo cho cán bộ ${assignedStaffZaloId}:`, err.message);
      }
    }

    // 5. Chuẩn bị thông tin hotline và địa chỉ để gửi tin nhắn giữ chân theo Lựa chọn A
    const [hotlineConfig, addressConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: "hotline_main" } }),
      prisma.systemConfig.findUnique({ where: { key: "address" } }),
    ]);

    const hotline = hotlineConfig?.value || "1900988975";
    const address = addressConfig?.value || "118 Lê Đình Lý, Phường Thanh Khê Đông, Quận Thanh Khê, TP. Đà Nẵng";

    // Tin nhắn gửi cho Người dân theo đúng Lựa chọn A
    const holdingReply =
      `Cảm ơn bạn đã gửi câu hỏi đến Trung tâm Kiểm soát bệnh tật (CDC) TP. Đà Nẵng.\n\n` +
      `📌 Thông tin câu hỏi của bạn đã được tiếp nhận và chuyển đến Bác sĩ/Cán bộ chuyên trách thuộc ${topic.department} (${topic.topicLabel}) để xem xét và hỗ trợ chuyên môn.\n\n` +
      `Bác sĩ sẽ phản hồi sớm nhất có thể qua tin nhắn Zalo này.\n\n` +
      `🏥 Nếu bạn có nhu cầu tư vấn trực tiếp, cấp bách hoặc khám ngay, vui lòng:\n` +
      `+ Đến trực tiếp CDC Đà Nẵng: ${address}\n` +
      `+ Hoặc liên hệ Tổng đài tư vấn: ${hotline}`;

    return {
      inquiry,
      holdingReply,
      staffNotified,
      assignedStaffName,
      topicLabel: topic.topicLabel,
    };
  } catch (err) {
    console.error("[InquiryService] Lỗi khi tạo inquiry và thông báo cán bộ:", err);
    return null;
  }
}
