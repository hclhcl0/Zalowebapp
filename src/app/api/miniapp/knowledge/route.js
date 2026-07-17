/**
 * API: Bộ não AI Zalo Mini App — theo từng chủ đề
 * GET  /api/miniapp/knowledge → [{id, category, title, content, active}]
 * PUT  /api/miniapp/knowledge → cập nhật toàn bộ danh sách
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearMiniAppAICache } from "@/lib/gemini-miniapp";

export const dynamic = "force-dynamic";
const CONFIG_KEY = "mini_app_knowledge";

const DEFAULT_TOPICS = [
  {
    id: 1, category: "Tiêm chủng", active: true,
    title: "Dịch vụ tiêm chủng",
    content: `CDC Đà Nẵng cung cấp dịch vụ tiêm chủng vắc xin cho trẻ em và người lớn.
Cơ sở 1: 118 Lê Đình Lý, Quận Thanh Khê.
Cơ sở 2: 129 Trưng Nữ Vương (Bàn Thạch).
Không cần đặt lịch trước, đến lấy số thứ tự theo giờ quy định.
Mỗi khách hàng chỉ lấy 1 số thứ tự.`
  },
  {
    id: 2, category: "Xét nghiệm", active: true,
    title: "Dịch vụ xét nghiệm",
    content: `CDC Đà Nẵng thực hiện các loại xét nghiệm: máu, nước tiểu, vi sinh, PCR, kháng thể, HIV, viêm gan B/C...
Địa chỉ: 118 Lê Đình Lý, Quận Thanh Khê.
Yêu cầu: Mang theo CCCD/CMND khi đến làm xét nghiệm.
Kết quả: Trả trong ngày hoặc 1-3 ngày tùy loại xét nghiệm.`
  },
  {
    id: 3, category: "Khám sức khỏe", active: true,
    title: "Dịch vụ khám sức khỏe",
    content: `CDC cung cấp dịch vụ:
- Khám sức khỏe định kỳ cho cá nhân và doanh nghiệp
- Khám sức khỏe xuất khẩu lao động
- Khám sức khỏe thi bằng lái xe
- Khám sức khỏe tiền hôn nhân
Mang theo CCCD/CMND và 2 ảnh 3x4.`
  },
  {
    id: 4, category: "Phòng bệnh", active: true,
    title: "Tư vấn phòng bệnh",
    content: `CDC Đà Nẵng tư vấn phòng chống các bệnh:
- Sốt xuất huyết Dengue
- Tay chân miệng
- Cúm mùa, COVID-19
- Viêm gan B, C
- Lao phổi
- Các bệnh lây truyền qua đường tình dục
Liên hệ tổng đài 1900.988.975 để được tư vấn.`
  },
  {
    id: 5, category: "Thông tin chung", active: true,
    title: "Thông tin liên hệ & địa chỉ",
    content: `Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng (CDC Đà Nẵng)
Địa chỉ: 118 Lê Đình Lý, Phường Thanh Khê Đông, Quận Thanh Khê, TP. Đà Nẵng
Website: ksbtdanang.vn
Hotline: 1900.988.975
Email: ttksbt@danang.gov.vn`
  },
];

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    if (!config?.value) return NextResponse.json({ topics: DEFAULT_TOPICS, isDefault: true });
    const topics = JSON.parse(config.value);
    return NextResponse.json({ topics, isDefault: false });
  } catch {
    return NextResponse.json({ topics: DEFAULT_TOPICS, isDefault: true });
  }
}

export async function PUT(request) {
  try {
    const { topics } = await request.json();
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(topics), label: "Bo nao AI Zalo Mini App" },
      update: { value: JSON.stringify(topics) },
    });
    clearMiniAppAICache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
