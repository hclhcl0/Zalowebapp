/**
 * ZALO WEBHOOK ENDPOINT
 * Route: POST /api/zalo/webhook
 *
 * Nhận sự kiện từ Zalo OA (tin nhắn, follow, unfollow...).
 * Dùng after() của Next.js để xử lý AI trong nền, tránh timeout 5 giây của Zalo.
 *
 * Cấu hình URL tại: https://developers.zalo.me/ → App → OA → Webhook
 */

import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/zalo";
import { askGemini } from "@/lib/gemini";

export const dynamic = "force-dynamic";

// ============================================================
// GET: Xác minh Webhook với Zalo
// ============================================================
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: "Zalo AI Webhook is running" });
}

// ============================================================
// POST: Nhận sự kiện từ Zalo
// ============================================================
export async function POST(request) {
  // Đọc body TRƯỚC khi gọi after() (request stream chỉ đọc được 1 lần)
  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    console.warn("[ZALO WEBHOOK] Body không hợp lệ:", e.message);
  }

  const { event_name, user_id_by_app, message, timestamp } = body;

  // Lưu log vào DB (không chặn response)
  after(async () => {
    try {
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
    } catch (dbErr) {
      console.error("[ZALO WEBHOOK DB ERROR]", dbErr.message);
    }

    // Xử lý từng loại sự kiện trong nền
    if (event_name) {
      try {
        switch (event_name) {
          case "user_send_text":
            await handleTextMessage(user_id_by_app, message?.text);
            break;

          case "follow":
            await handleFollow(user_id_by_app, body);
            break;

          case "unfollow":
            await handleUnfollow(user_id_by_app);
            break;

          default:
            console.log(`[ZALO WEBHOOK] Unhandled event: ${event_name}`);
        }
      } catch (procErr) {
        console.error("[ZALO WEBHOOK PROCESS ERROR]", procErr.message);
      }
    }
  });

  // Trả về 200 OK NGAY LẬP TỨC để Zalo không báo lỗi timeout
  return NextResponse.json({ error: 0, status: "received" });
}

// ============================================================
// Xử lý: Tin nhắn văn bản — Chuyển toàn bộ qua Gemini AI
// ============================================================
async function handleTextMessage(userId, text) {
  if (!userId || !text) return;
  const trimmedText = text.trim();
  if (!trimmedText) return;

  // Đảm bảo người dùng có trong DB (cập nhật profile Zalo)
  try {
    const { getUserProfile } = await import("@/lib/zalo");
    const profile = await getUserProfile(userId);
    if (profile?.data) {
      await prisma.follower.upsert({
        where: { zaloUserId: userId },
        update: {
          displayName: profile.data.display_name,
          avatarUrl: profile.data.avatar,
        },
        create: {
          zaloUserId: userId,
          displayName: profile.data.display_name || "Người dùng Zalo",
          avatarUrl: profile.data.avatar || null,
        },
      });
    }
  } catch (e) {
    console.error("[ZALO WEBHOOK] Lỗi cập nhật profile:", e.message);
  }

  // Lệnh đặc biệt: Tra cứu kết quả xét nghiệm (KQ <mã>)
  const lowerText = trimmedText.toLowerCase();
  if (lowerText.startsWith("kq ") && trimmedText.split(" ").length >= 2) {
    const code = trimmedText.split(" ")[1];
    await handleTestResultLookup(userId, code);
    return;
  }

  // Lệnh đặc biệt: Đặt lại hội thoại
  if (lowerText === "reset" || lowerText === "bắt đầu lại" || lowerText === "bắt đầu") {
    const { clearUserHistory } = await import("@/lib/gemini");
    clearUserHistory(userId);
    await sendTextMessage(
      userId,
      "Xin chào! Tôi là Trợ lý AI của CDC Đà Nẵng. Bạn có thể hỏi tôi về phòng chống dịch bệnh, vắc-xin, an toàn thực phẩm và các dịch vụ y tế của CDC.\n\nHotline hỗ trợ: 0236.3822.116"
    );
    return;
  }

  // Tất cả tin nhắn còn lại → Xử lý bằng AI
  try {
    console.log(`[AI] Xử lý câu hỏi từ ${userId}: "${trimmedText.substring(0, 100)}"`);
    const { askAI } = await import("@/lib/gemini");
    const aiReply = await askAI(userId, trimmedText);
    await sendTextMessage(userId, aiReply);
    console.log(`[Gemini] Đã trả lời ${userId} (${aiReply.length} ký tự)`);
  } catch (err) {
    console.error("[Gemini] Lỗi khi gọi AI:", err.message);
    // Fallback thân thiện khi AI lỗi
    let hotline = "1900988975";
    try {
      const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "hotline_main" } });
      if (dbConfig?.value) hotline = dbConfig.value;
    } catch(e) {}
    await sendTextMessage(
      userId,
      `Xin lỗi, hệ thống đang gặp sự cố nhỏ. Vui lòng thử lại sau hoặc liên hệ trực tiếp CDC Đà Nẵng qua hotline ${hotline} để được hỗ trợ nhanh nhất.`
    );
  }
}

// ============================================================
// Xử lý: Người dùng mới theo dõi OA — Gửi tin chào mừng
// ============================================================
async function handleFollow(userId, data) {
  let displayName = data.follower?.display_name || "Người dùng Zalo";
  let avatarUrl = data.follower?.avatar || null;

  try {
    const { getUserProfile } = await import("@/lib/zalo");
    const profile = await getUserProfile(userId);
    if (profile?.data) {
      displayName = profile.data.display_name || displayName;
      avatarUrl = profile.data.avatar || avatarUrl;
    }
  } catch (err) {
    console.error("[ZALO WEBHOOK] Lỗi lấy profile follow:", err.message);
  }

  // Lưu hoặc cập nhật follower vào DB
  await prisma.follower.upsert({
    where: { zaloUserId: userId },
    update: { displayName, ...(avatarUrl && { avatarUrl }) },
    create: { zaloUserId: userId, displayName, avatarUrl },
  });

  // Gửi tin chào mừng
  const welcomeMsg =
    `Xin chào ${displayName}! Cảm ơn bạn đã quan tâm Zalo OA CDC Đà Nẵng.\n\n` +
    `Tôi là Trợ lý AI sẵn sàng giải đáp thắc mắc của bạn về:\n` +
    `+ Phòng chống dịch bệnh (sốt xuất huyết, cúm, COVID-19...)\n` +
    `+ Dịch vụ tiêm chủng và lịch vaccine\n` +
    `+ An toàn thực phẩm\n` +
    `+ HIV/AIDS và các bệnh truyền nhiễm\n\n` +
    `Hotline CDC Đà Nẵng: 0236.3822.116\n` +
    `Hỏi tôi bất cứ điều gì về sức khỏe và dịch vụ CDC!`;

  await sendTextMessage(userId, welcomeMsg);
}

// ============================================================
// Xử lý: Người dùng bỏ theo dõi OA
// ============================================================
async function handleUnfollow(userId) {
  try {
    // Xóa liên kết nhân viên nếu có
    const link = await prisma.staffZaloLink.findUnique({ where: { zaloUserId: userId } });
    if (link) {
      await prisma.staffZaloLink.delete({ where: { zaloUserId: userId } });
      console.log(`[WEBHOOK] Xóa liên kết nhân viên: ${link.staffNameRaw} (${userId})`);
    }

    // Reset loại người dùng về citizen
    await prisma.follower.update({
      where: { zaloUserId: userId },
      data: { userType: "citizen", department: null, phone: null },
    }).catch(() => {});

    // Xóa lịch sử hội thoại AI
    const { clearUserHistory } = await import("@/lib/gemini");
    clearUserHistory(userId);

    console.log(`[WEBHOOK] Unfollow xử lý xong: ${userId}`);
  } catch (e) {
    console.error(`[WEBHOOK] Lỗi xử lý unfollow ${userId}:`, e.message);
  }
}

// ============================================================
// Xử lý: Tra cứu kết quả xét nghiệm (lệnh KQ <mã>)
// ============================================================
async function handleTestResultLookup(userId, code) {
  if (!code) return;
  const result = await prisma.testResult.findUnique({
    where: { resultCode: code.toUpperCase() },
  });

  if (result) {
    await sendTextMessage(
      userId,
      `Kết quả xét nghiệm - Mã: ${result.resultCode}\n` +
      `Họ tên: ${result.fullName}\n` +
      `Ngày xét nghiệm: ${new Date(result.testedAt).toLocaleDateString("vi-VN")}\n` +
      `Kết quả:\n${result.content}`
    );
  } else {
    await sendTextMessage(
      userId,
      `Không tìm thấy kết quả với mã "${code.toUpperCase()}".\n` +
      `Vui lòng kiểm tra lại mã tra cứu hoặc liên hệ CDC Đà Nẵng: 0236.3822.116`
    );
  }
}
