/**
 * API: Gửi tin nhắn trực tiếp đến người quan tâm Zalo OA
 * POST /api/followers/[id]/message → Gửi tin nhắn và lưu log
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Nội dung tin nhắn không được để trống" }, { status: 400 });
    }

    const follower = await prisma.follower.findUnique({
      where: { id },
    });

    if (!follower) {
      return NextResponse.json({ error: "Không tìm thấy người quan tâm" }, { status: 404 });
    }

    // Gửi tin nhắn qua Zalo API
    const response = await sendTextMessage(follower.zaloUserId, message);
    
    // Kiểm tra lỗi Zalo trả về
    if (response.error && response.error !== 0) {
      return NextResponse.json({
        error: response.message || "Lỗi gửi tin nhắn từ Zalo",
        raw: response
      }, { status: 400 });
    }

    // Lưu log tin nhắn đi
    await prisma.messageLog.create({
      data: {
        zaloUserId: follower.zaloUserId,
        direction: "outbound",
        type: "text",
        content: message,
        rawPayload: JSON.stringify(response),
      },
    });

    return NextResponse.json({ success: true, response });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
