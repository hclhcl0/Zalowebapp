import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    const providerConfig = await prisma.systemConfig.findUnique({
      where: { key: "ai_provider" }
    });

    return NextResponse.json({ success: true, data: providerConfig?.value || "gemini" });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const { provider } = await request.json();
    if (provider !== "gemini" && provider !== "groq") {
      return NextResponse.json({ success: false, error: "Provider không hợp lệ" }, { status: 400 });
    }

    await prisma.systemConfig.upsert({
      where: { key: "ai_provider" },
      update: { value: provider, label: "Nhà cung cấp AI" },
      create: { key: "ai_provider", value: provider, label: "Nhà cung cấp AI" }
    });

    return NextResponse.json({ success: true, data: provider });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
