/**
 * API: Trợ lý AI CDC cho Zalo Mini App
 * POST /api/miniapp/ai-chat
 * Body: { message: string, history?: {role:'user'|'assistant', content:string}[], zaloUserId?: string }
 *
 * Dùng gemini-miniapp.js — TÁCH BIỆT hoàn toàn với Zalo OA chatbot
 */
import { NextResponse } from "next/server";
import { askMiniAppAI } from "@/lib/gemini-miniapp";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, history = [], zaloUserId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Tin nhắn không được để trống" }, { status: 400 });
    }

    // Giới hạn lịch sử tối đa 20 lượt để tránh quá token
    const trimmedHistory = history.slice(-20);

    const reply = await askMiniAppAI(trimmedHistory, message.trim());

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[miniapp/ai-chat]", err);
    return NextResponse.json(
      { error: "Lỗi hệ thống, vui lòng thử lại sau" },
      { status: 500 }
    );
  }
}
