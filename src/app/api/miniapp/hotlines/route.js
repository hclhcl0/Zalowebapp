import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isAdmin, canManageMiniApp } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "mini_app_hotlines";

const DEFAULT_HOTLINES = [
  {
    id: 1,
    name: "Tổng đài tư vấn CDC Đà Nẵng",
    phone: "1900988975",
    displayPhone: "1900.988.975",
    description: "Hoạt động trong giờ hành chính (không tính Lễ, Tết). Thứ 7, CN: Buổi sáng",
    hours: "T2–T6: 7:00–16:30 | T7, CN: 7:00–11:30",
    icon: "📞",
    available: true,
    extensions: []
  },
  {
    id: 2,
    name: "Tư vấn tiêm chủng",
    phone: "1900988975",
    displayPhone: "1900.988.975 – Phím 1 hoặc 2",
    description: "Tư vấn lịch tiêm, loại vắc xin, phòng ngừa dịch bệnh",
    hours: "T2–T6: 7:00–16:30",
    icon: "💉",
    available: true,
    extensions: [1, 2]
  },
  {
    id: 3,
    name: "Tư vấn sức khỏe sinh sản",
    phone: "1900988975",
    displayPhone: "1900.988.975 – Phím 3",
    description: "Tư vấn sức khỏe sinh sản, kế hoạch hóa gia đình",
    hours: "T2–T6: 7:00–16:30",
    icon: "🌸",
    available: true,
    extensions: [3]
  },
  {
    id: 4,
    name: "Tư vấn giun sán, viêm gan, côn trùng",
    phone: "02363890414",
    displayPhone: "0236.3890.414",
    description: "Tư vấn điều trị các bệnh giun sán, viêm gan B, C. Xử lý các loại côn trùng",
    hours: "T2–T6: 7:00–16:30",
    icon: "🔬",
    available: true,
    extensions: []
  },
  {
    id: 5,
    name: "Tiêm chủng Cơ sở 2",
    phone: "02353852786",
    displayPhone: "0235.3852.786",
    description: "129 Trưng Nữ Vương, Bàn Thạch – Đà Nẵng",
    hours: "T2–T7: 7:00–11:30",
    icon: "🏥",
    available: true,
    extensions: []
  }
];

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    if (!config) {
      return NextResponse.json({ data: DEFAULT_HOTLINES });
    }
    return NextResponse.json({ data: JSON.parse(config.value) });
  } catch {
    return NextResponse.json({ data: DEFAULT_HOTLINES });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!isAdmin(session.user.role) && !canManageMiniApp(session.user.role))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { hotlines } = await request.json();
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(hotlines), label: "Tổng đài tư vấn Mini App" },
      update: { value: JSON.stringify(hotlines) },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
