import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isAdmin, canManageMiniApp } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "mini_app_schedules";

const DEFAULT_SCHEDULES = [
  {
    id: 1,
    title: "Lịch tiêm chủng",
    icon: "💉",
    color: "#007a8c",
    note: "Mỗi khách hàng chỉ lấy 01 số thứ tự",
    sessions: [
      {
        days: "Thứ 2 – Thứ 6",
        slots: [
          { label: "Buổi sáng", time: "7:15 – 11:00" },
          { label: "Buổi chiều", time: "12:45 – 16:30" }
        ]
      },
      {
        days: "Thứ 7, Chủ nhật, Lễ, Tết",
        slots: [
          { label: "Buổi sáng", time: "7:15 – 11:00" }
        ],
        note: "Chỉ tiêm buổi sáng"
      }
    ],
    queueInfo: [
      { label: "Lấy số sáng", time: "Từ 7:00" },
      { label: "Lấy số chiều", time: "Từ 13:00" }
    ]
  },
  {
    id: 2,
    title: "Lịch xét nghiệm",
    icon: "🔬",
    color: "#00796b",
    note: "Thứ 7, Chủ nhật chỉ làm buổi sáng. Lễ, Tết: nghỉ",
    sessions: [
      {
        days: "Thứ 2 – Thứ 6",
        slots: [
          { label: "Buổi sáng", time: "7:30 – 11:00" },
          { label: "Buổi chiều", time: "13:30 – 16:30" }
        ]
      },
      {
        days: "Thứ 7, Chủ nhật",
        slots: [
          { label: "Buổi sáng", time: "7:30 – 11:00" }
        ],
        note: "Chỉ làm buổi sáng"
      }
    ],
    queueInfo: []
  }
];

export async function GET() {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } });
    if (!config) return NextResponse.json({ data: DEFAULT_SCHEDULES });
    return NextResponse.json({ data: JSON.parse(config.value) });
  } catch {
    return NextResponse.json({ data: DEFAULT_SCHEDULES });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!isAdmin(session.user.role) && !canManageMiniApp(session.user.role))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { schedules } = await request.json();
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(schedules), label: "Lịch làm việc Mini App" },
      update: { value: JSON.stringify(schedules) },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
