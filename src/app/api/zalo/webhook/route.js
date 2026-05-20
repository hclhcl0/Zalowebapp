/**
 * ZALO WEBHOOK ENDPOINT
 * Route: POST /api/zalo/webhook
 * 
 * Khi có sự kiện (tin nhắn mới, follow, unfollow...) xảy ra trên Zalo OA,
 * Zalo sẽ gửi dữ liệu JSON đến URL này.
 * 
 * Cấu hình URL này tại: https://developers.zalo.me/
 * → Chọn ứng dụng của bạn → OA → Webhook
 * 
 * URL Webhook khi deploy: https://yourdomain.com/api/zalo/webhook
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import { sendTextMessage } from "@/lib/zalo";
import crypto from "crypto";

// ============================================================
// GET: Xác minh Webhook với Zalo (Bước đầu tiên khi cấu hình)
// ============================================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const verifyToken = searchParams.get("challenge");

  // Zalo gửi một chuỗi "challenge", chúng ta trả lại y nguyên để xác minh
  if (verifyToken) {
    return new NextResponse(verifyToken, { status: 200 });
  }

  return NextResponse.json({ status: "Zalo Webhook is running" });
}

// ============================================================
// POST: Nhận sự kiện từ Zalo
// ============================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { event_name, user_id_by_app, message, timestamp } = body;

    console.log("[ZALO WEBHOOK]", JSON.stringify(body, null, 2));

    // Lưu log toàn bộ sự kiện vào database
    await prisma.messageLog.create({
      data: {
        zaloUserId: user_id_by_app || "unknown",
        direction: "inbound",
        type: event_name || "unknown",
        content: message?.text || null,
        rawPayload: JSON.stringify(body),
        receivedAt: timestamp ? new Date(timestamp * 1000) : new Date(),
      },
    });

    // Xử lý các loại sự kiện
    switch (event_name) {
      // Người dùng nhắn tin
      case "user_send_text":
        await handleTextMessage(user_id_by_app, message?.text);
        break;

      // Người dùng mới theo dõi OA
      case "follow":
        await handleFollow(user_id_by_app, body);
        break;

      // Người dùng bỏ theo dõi OA
      case "unfollow":
        await handleUnfollow(user_id_by_app);
        break;

      default:
        console.log(`[ZALO WEBHOOK] Unhandled event: ${event_name}`);
    }

    // Trả về 200 OK để Zalo biết đã nhận thành công
    return NextResponse.json({ error: 0 });
  } catch (err) {
    console.error("[ZALO WEBHOOK ERROR]", err);
    return NextResponse.json({ error: 1, message: err.message }, { status: 500 });
  }
}

// ============================================================
// Xử lý: Người dùng gửi tin nhắn văn bản
// ============================================================
async function handleTextMessage(userId, text) {
  if (!text) return;
  const lowerText = text.toLowerCase().trim();

  // Từ khoá kích hoạt chatbot tự động
  if (lowerText.includes("đặt lịch") || lowerText.includes("tiêm chủng")) {
    await sendTextMessage(
      userId,
      "Để đặt lịch tiêm chủng, bạn vui lòng truy cập Mini App của chúng tôi hoặc gọi đường dây hỗ trợ 0236.xxx.xxxx. Nhân viên sẽ hỗ trợ bạn nhanh chóng! 💉"
    );
  } else if (lowerText.includes("kết quả") || lowerText.includes("xét nghiệm")) {
    await sendTextMessage(
      userId,
      "Để tra cứu kết quả xét nghiệm, vui lòng cung cấp mã tra cứu theo cú pháp: KQ [MÃ_CỦA_BẠN]\nVí dụ: KQ 12345 🔍"
    );
  } else if (lowerText.startsWith("kq ")) {
    const code = text.split(" ")[1];
    await handleTestResultLookup(userId, code);
  } else if (lowerText.includes("giá") || lowerText.includes("bảng giá")) {
    await sendTextMessage(
      userId,
      "Bảng giá dịch vụ CDC Đà Nẵng:\n💊 Tiêm vắc xin cúm: 220.000đ\n🩺 Xét nghiệm HIV: 80.000đ\n🔬 Xét nghiệm viêm gan B: 65.000đ\n\nXem đầy đủ tại: https://zalooacdc.chuyendoisoquocgia.net/"
    );
  } else {
    // Tin nhắn không khớp từ khoá → trả lời mặc định
    await sendTextMessage(
      userId,
      "Xin chào! Tôi là trợ lý tự động của CDC Đà Nẵng 🏥\nBạn có thể hỏi về:\n• Đặt lịch tiêm chủng\n• Tra cứu kết quả xét nghiệm\n• Bảng giá dịch vụ\n\nHoặc gọi đường dây nóng: 0236.xxx.xxxx"
    );
  }
}

// ============================================================
// Xử lý: Người dùng mới theo dõi OA
// ============================================================
async function handleFollow(userId, data) {
  // Lưu hoặc cập nhật follower vào database
  await prisma.follower.upsert({
    where: { zaloUserId: userId },
    update: { displayName: data.follower?.display_name || null },
    create: {
      zaloUserId: userId,
      displayName: data.follower?.display_name || null,
      avatarUrl: data.follower?.avatar || null,
    },
  });

  // Gửi tin chào mừng
  await sendTextMessage(
    userId,
    "Xin chào! Cảm ơn bạn đã quan tâm đến Zalo OA của Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng (CDC Đà Nẵng) 🏥\n\nChúng tôi có thể hỗ trợ bạn:\n✅ Đặt lịch tiêm chủng\n✅ Tra cứu kết quả xét nghiệm\n✅ Thông tin bảng giá dịch vụ\n✅ Cập nhật tin tức dịch bệnh\n\nGõ bất kỳ nội dung để bắt đầu!"
  );
}

// ============================================================
// Xử lý: Người dùng bỏ theo dõi OA
// ============================================================
async function handleUnfollow(userId) {
  // Có thể đánh dấu trong database nhưng không xoá để giữ lịch sử
  console.log(`[WEBHOOK] User unfollowed: ${userId}`);
}

// ============================================================
// Xử lý: Tra cứu kết quả xét nghiệm tự động
// ============================================================
async function handleTestResultLookup(userId, code) {
  const result = await prisma.testResult.findUnique({
    where: { resultCode: code.toUpperCase() },
  });

  if (result) {
    await sendTextMessage(
      userId,
      `🔬 Kết quả xét nghiệm - Mã: ${result.resultCode}\n👤 Họ tên: ${result.fullName}\n📅 Ngày xét nghiệm: ${new Date(result.testedAt).toLocaleDateString("vi-VN")}\n📋 Kết quả:\n${result.content}`
    );
  } else {
    await sendTextMessage(
      userId,
      `❌ Không tìm thấy kết quả với mã "${code}".\nVui lòng kiểm tra lại mã tra cứu hoặc liên hệ 0236.xxx.xxxx để được hỗ trợ.`
    );
  }
}
