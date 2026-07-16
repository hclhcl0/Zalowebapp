/**
 * API: Trợ lý AI CDC cho Zalo Mini App
 * POST /api/miniapp/ai-chat
 * Body: { message: string, zaloUserId?: string }
 */
import { NextResponse } from "next/server";
import { askAI } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request) {
  try {
    const { message, zaloUserId } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Tin nhắn không được để trống" }, { status: 400 });
    }

    // Dùng zaloUserId nếu có (đã đăng nhập Zalo), không thì dùng ID ẩn danh
    const userId = zaloUserId || "miniapp_anonymous";

    const reply = await askAI(userId, message.trim());

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[miniapp/ai-chat]", err);
    return NextResponse.json(
      { error: "Lỗi hệ thống, vui lòng thử lại sau" },
      { status: 500 }
    );
  }
}
