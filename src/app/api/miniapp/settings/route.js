import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isAdmin, canManageMiniApp } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "mini_app_" } }
    });
    const result = configs.reduce((acc, c) => {
      acc[c.key] = { value: c.value, label: c.label };
      return acc;
    }, {});
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (!isAdmin(session.user.role) && !canManageMiniApp(session.user.role))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { key, value, label } = await request.json();
    if (!key?.startsWith("mini_app_")) {
      return NextResponse.json({ error: "Chỉ cho phép cập nhật key mini_app_*" }, { status: 400 });
    }
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value, label: label || key },
      update: { value },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
