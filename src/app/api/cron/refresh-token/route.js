/**
 * Vercel Cron Job: Tự động làm mới Zalo Access Token
 * Chạy mỗi 20 giờ để giữ token luôn còn hiệu lực (token hết hạn sau ~25 giờ)
 * 
 * Route: GET /api/cron/refresh-token
 * Bảo mật bằng CRON_SECRET header do Vercel cung cấp tự động.
 */
import { NextResponse } from "next/server";
import { refreshZaloAccessToken } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // Xác thực request đến từ Vercel Cron (không phải người dùng bên ngoài)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized cron request blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Bắt đầu làm mới Zalo token...");
    const data = await refreshZaloAccessToken();

    if (data?.access_token) {
      console.log("[Cron] Zalo token đã được làm mới thành công.");
      return NextResponse.json({
        success: true,
        message: "Token đã được làm mới thành công.",
        expiresIn: data.expires_in,
        refreshedAt: new Date().toISOString(),
      });
    } else {
      console.error("[Cron] Làm mới token thất bại:", data);
      return NextResponse.json({
        success: false,
        message: `Lỗi từ Zalo: ${data?.message ?? "Không xác định"}`,
        raw: data,
      }, { status: 500 });
    }
  } catch (err) {
    console.error("[Cron] Lỗi hệ thống khi làm mới token:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
