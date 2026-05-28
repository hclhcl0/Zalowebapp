/**
 * GET /api/auth/drive-callback
 * Callback sau khi người dùng xác nhận quyền truy cập Google Drive
 * → Đổi code lấy refresh_token
 * → Lưu vào SystemConfig key "drive_refresh_token"
 * → Redirect về /settings?tab=drive_docs
 */
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const origin = req.headers.get("host")
    ? `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`
    : "http://localhost:3000";

  const settingsUrl = `${origin}/settings?tab=drive_docs`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}&drive_oauth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${settingsUrl}&drive_oauth_error=${encodeURIComponent("Không nhận được code từ Google.")}`);
  }

  try {
    let redirectUri = `${origin}/api/auth/drive-callback`;
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
        if (decoded.redirectUri) redirectUri = decoded.redirectUri;
      } catch (_) {}
    }

    const settings = await prisma.systemConfig.findMany({
      where: { key: { in: ["gmail_oauth_client_id", "gmail_oauth_client_secret"] } },
    });
    const getVal = (key) => settings.find((s) => s.key === key)?.value || "";
    const clientId     = getVal("gmail_oauth_client_id").trim();
    const clientSecret = getVal("gmail_oauth_client_secret").trim();

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${settingsUrl}&drive_oauth_error=${encodeURIComponent("Thiếu Client ID hoặc Client Secret trong Cài đặt.")}`);
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    const { refresh_token } = tokens;

    if (!refresh_token) {
      return NextResponse.redirect(
        `${settingsUrl}&drive_oauth_error=${encodeURIComponent("Google không trả về refresh_token. Vào https://myaccount.google.com/permissions → Thu hồi quyền app → Kết nối lại.")}`
      );
    }

    // Lưu refresh_token vào DB
    await prisma.systemConfig.upsert({
      where: { key: "drive_refresh_token" },
      update: { value: refresh_token, label: "Google Drive Refresh Token (OAuth2)" },
      create: { key: "drive_refresh_token", value: refresh_token, label: "Google Drive Refresh Token (OAuth2)" },
    });

    // Reset Drive doc cache để đọc lại với token mới
    return NextResponse.redirect(`${settingsUrl}&drive_oauth_success=1`);
  } catch (err) {
    console.error("[drive-callback]", err);
    return NextResponse.redirect(
      `${settingsUrl}&drive_oauth_error=${encodeURIComponent(err.message)}`
    );
  }
}
