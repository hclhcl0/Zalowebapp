/**
 * API: Quản lý danh sách Groq API Keys (Round-Robin Pool)
 * GET    /api/settings/groq-keys → Danh sách keys (che bớt giá trị)
 * POST   /api/settings/groq-keys → Thêm key mới
 * PATCH  /api/settings/groq-keys → Bật/tắt key
 * DELETE /api/settings/groq-keys → Xóa key
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { clearGroqKeyCache } from "@/lib/gemini";

export const dynamic = "force-dynamic";

// Hàm che bớt API key để hiển thị an toàn
function maskKey(key) {
  if (!key || key.length < 12) return "••••••••••••";
  return key.slice(0, 8) + "••••••••••••" + key.slice(-4);
}

// GET: Lấy danh sách keys (không trả về giá trị thật)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    const keys = await prisma.groqApiKey.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Ẩn giá trị thật, chỉ hiện masked
    const safeKeys = keys.map((k) => ({
      id: k.id,
      label: k.label,
      maskedKey: maskKey(k.apiKey),
      isActive: k.isActive,
      usageTokens: k.usageTokens,
      usageCount: k.usageCount,
      createdAt: k.createdAt,
    }));

    return NextResponse.json({ success: true, data: safeKeys });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Thêm key mới
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await request.json();
    const { label, apiKey } = body;

    if (!label?.trim() || !apiKey?.trim()) {
      return NextResponse.json({ success: false, error: "Thiếu tên gợi nhớ hoặc API Key" }, { status: 400 });
    }

    if (!apiKey.startsWith("gsk_")) {
      return NextResponse.json({ success: false, error: "API Key không hợp lệ (phải bắt đầu bằng gsk_)" }, { status: 400 });
    }

    const newKey = await prisma.groqApiKey.create({
      data: { label: label.trim(), apiKey: apiKey.trim(), isActive: true },
    });

    clearGroqKeyCache();

    return NextResponse.json({
      success: true,
      data: { id: newKey.id, label: newKey.label, maskedKey: maskKey(newKey.apiKey), isActive: newKey.isActive, createdAt: newKey.createdAt },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Bật/tắt trạng thái key
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await request.json();
    const { id, isActive } = body;
    if (!id) return NextResponse.json({ success: false, error: "Thiếu ID" }, { status: 400 });

    await prisma.groqApiKey.update({ where: { id }, data: { isActive } });
    clearGroqKeyCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Xóa key
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id"));
    if (!id) return NextResponse.json({ success: false, error: "Thiếu ID" }, { status: 400 });

    // Kiểm tra còn ít nhất 1 key active không
    const activeCount = await prisma.groqApiKey.count({ where: { isActive: true } });
    const target = await prisma.groqApiKey.findUnique({ where: { id } });
    if (target?.isActive && activeCount <= 1) {
      return NextResponse.json({ success: false, error: "Không thể xóa key cuối cùng đang hoạt động!" }, { status: 400 });
    }

    await prisma.groqApiKey.delete({ where: { id } });
    clearGroqKeyCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
