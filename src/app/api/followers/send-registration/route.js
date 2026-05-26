/**
 * API: Gửi link đăng ký cá nhân hóa đến từng follower qua Zalo
 * POST /api/followers/send-registration
 * Body: { scope: "all" | "unregistered" | "list", userIds?: string[] }
 *
 * Link gửi: {baseUrl}/register?uid={zaloUserId}
 * Mỗi follower nhận 1 link riêng của họ.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTextMessage } from "@/lib/zalo";
import { createRegToken } from "@/lib/regToken";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { scope = "unregistered", userIds = [] } = body;

    // Lấy base URL từ request headers
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    // ── Xác định danh sách targets ──────────────────────────────────────
    let targets = [];

    if (scope === "all") {
      targets = await prisma.follower.findMany({
        select: { zaloUserId: true, displayName: true },
      });
    } else if (scope === "unregistered") {
      // Lấy các follower CHƯA có trong StaffZaloLink
      const registered = await prisma.staffZaloLink.findMany({
        select: { zaloUserId: true },
      });
      const registeredIds = new Set(registered.map((r) => r.zaloUserId));

      const allFollowers = await prisma.follower.findMany({
        select: { zaloUserId: true, displayName: true },
      });
      targets = allFollowers.filter((f) => !registeredIds.has(f.zaloUserId));
    } else if (scope === "list" && userIds.length > 0) {
      targets = await prisma.follower.findMany({
        where: { zaloUserId: { in: userIds } },
        select: { zaloUserId: true, displayName: true },
      });
    } else {
      return NextResponse.json({ error: "Scope không hợp lệ" }, { status: 400 });
    }

    if (targets.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        skipped: 0,
        message: scope === "unregistered"
          ? "Tất cả nhân viên đã đăng ký rồi! Không cần gửi thêm."
          : "Không có người nhận nào.",
      });
    }

    // ── Gửi tin nhắn từng người ─────────────────────────────────────────
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const target of targets) {
      const { zaloUserId, displayName } = target;
      // Tạo token có chữ ký HMAC, thời hạn 7 ngày — không lộ Zalo ID
      const regToken = createRegToken(zaloUserId);
      const regLink = `${baseUrl}/register?token=${encodeURIComponent(regToken)}`;

      const name = displayName || "bạn";
      const message =
        `🏥 CDC ĐÀ NẴNG — CẬP NHẬT THÔNG TIN NHÂN VIÊN\n\n` +
        `Xin chào ${name}!\n\n` +
        `Để cập nhật và đồng bộ thông tin nhân viên trên hệ thống nội bộ CDC Đà Nẵng, vui lòng bấm vào đường dẫn bên dưới và điền thông tin của bạn:\n\n` +
        `👉 ${regLink}\n\n` +
        `⏱️ Thời gian thực hiện khoảng 30 giây, chỉ cần cập nhật một lần.\n` +
        `🔒 Thông tin được bảo mật và chỉ phục vụ công tác quản lý nội bộ.`;

      try {
        const result = await sendTextMessage(zaloUserId, message);
        if (result.error && result.error !== 0) {
          failed++;
          if (errors.length < 5) {
            errors.push(`${displayName || zaloUserId}: ${result.message} (${result.error})`);
          }
        } else {
          sent++;
        }
      } catch (e) {
        failed++;
        if (errors.length < 5) errors.push(`${zaloUserId}: ${e.message}`);
      }

      // Delay 150ms để tránh rate limit Zalo
      await new Promise((r) => setTimeout(r, 150));
    }

    // Ghi log
    await prisma.messageLog.create({
      data: {
        zaloUserId: "__registration_campaign__",
        direction: "outbound",
        type: "text",
        content: `[Gửi link đăng ký nhân viên] Scope: ${scope} | Gửi: ${sent} | Lỗi: ${failed}`,
        rawPayload: JSON.stringify({ scope, total: targets.length, sent, failed, baseUrl }),
      },
    });

    return NextResponse.json({
      success: true,
      total: targets.length,
      sent,
      failed,
      errors: errors.slice(0, 3),
      message: `Đã gửi link đăng ký đến ${sent}/${targets.length} người qua Zalo.${failed > 0 ? ` (${failed} thất bại)` : ""}`,
    });
  } catch (err) {
    console.error("[Send Registration]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Thống kê trạng thái đăng ký
export async function GET() {
  try {
    const [totalFollowers, totalRegistered] = await Promise.all([
      prisma.follower.count(),
      prisma.staffZaloLink.count(),
    ]);

    const recentLinks = await prisma.staffZaloLink.findMany({
      orderBy: { registeredAt: "desc" },
      take: 100,
      select: {
        id: true,
        staffNameRaw: true,
        department: true,
        zaloUserId: true,
        registeredAt: true,
        phone: true,
      },
    });

    // Lấy thêm displayName từ Follower
    const followerMap = {};
    if (recentLinks.length > 0) {
      const ids = recentLinks.map((l) => l.zaloUserId);
      const followers = await prisma.follower.findMany({
        where: { zaloUserId: { in: ids } },
        select: { zaloUserId: true, displayName: true, avatarUrl: true },
      });
      followers.forEach((f) => { followerMap[f.zaloUserId] = f; });
    }

    const links = recentLinks.map((l) => ({
      ...l,
      displayName: followerMap[l.zaloUserId]?.displayName || "",
      avatarUrl: followerMap[l.zaloUserId]?.avatarUrl || "",
    }));

    return NextResponse.json({
      totalFollowers,
      totalRegistered,
      unregistered: totalFollowers - totalRegistered,
      links,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
