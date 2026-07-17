/**
 * API: Bộ não riêng cho Zalo Mini App
 * GET  /api/miniapp/knowledge → lấy nội dung
 * PUT  /api/miniapp/knowledge → cập nhật nội dung
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearMiniAppAICache } from "@/lib/gemini-miniapp";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "mini_app_knowledge";

const DEFAULT_KNOWLEDGE = `--- THÔNG TIN DỊCH VỤ CDC ĐÀ NẴNG ---

[TIÊM CHỦNG]
CDC Đà Nẵng cung cấp dịch vụ tiêm chủng vắc xin cho trẻ em và người lớn tại 2 cơ sở:
- Cơ sở 1: 118 Lê Đình Lý (Quận Thanh Khê)
- Cơ sở 2: 129 Trưng Nữ Vương (Bàn Thạch)
Không cần đặt lịch trước, đến lấy số thứ tự theo giờ quy định.

[XÉT NGHIỆM]
Thực hiện các xét nghiệm: máu, nước tiểu, vi sinh, PCR, kháng thể...
Mang theo CCCD/CMND khi đến làm xét nghiệm.
Kết quả trả trong ngày hoặc 1-3 ngày tùy loại.

[KHÁM SỨC KHỎE]
Khám sức khỏe định kỳ, xuất khẩu lao động, thi bằng lái xe.

[PHÒNG BỆNH]
Tư vấn phòng chống dịch bệnh, vệ sinh môi trường, an toàn thực phẩm.
Phòng ngừa sốt xuất huyết, tay chân miệng, cúm...

[THÔNG TIN CHUNG]
Địa chỉ: 118 Lê Đình Lý, Phường Thanh Khê Đông, Quận Thanh Khê, TP. Đà Nẵng
Website: ksbtdanang.vn
Hotline: 1900.988.975`;

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    return NextResponse.json({
      content: config?.value || DEFAULT_KNOWLEDGE,
      isDefault: !config?.value,
    });
  } catch {
    return NextResponse.json({ content: DEFAULT_KNOWLEDGE, isDefault: true });
  }
}

export async function PUT(request) {
  try {
    const { content } = await request.json();
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: content, label: "Bo nao AI Zalo Mini App" },
      update: { value: content },
    });
    clearMiniAppAICache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
