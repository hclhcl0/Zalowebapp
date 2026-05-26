/**
 * GET /api/auth/gmail-callback
 * Callback sau khi người dùng xác nhận Google OAuth2
 * Google redirect về đây với ?code=...&state=...
 * → Đổi code lấy refresh_token
 * → Redirect về /settings?tab=gmail_pool&gmail_oauth_success=email
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

  const settingsUrl = `${origin}/settings?tab=gmail_pool`;

  // Người dùng từ chối
  if (error) {
    return NextResponse.redirect(`${settingsUrl}&gmail_oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${settingsUrl}&gmail_oauth_error=${encodeURIComponent("Không nhận được code từ Google.")}`);
  }

  try {
    // Giải mã state để lấy email hint và redirectUri gốc
    let hintEmail = "";
    let redirectUri = `${origin}/api/auth/gmail-callback`;
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
        hintEmail = decoded.email || "";
        if (decoded.redirectUri) redirectUri = decoded.redirectUri;
      } catch (_) {}
    }

    // Lấy credentials từ DB
    const settings = await prisma.systemConfig.findMany({
      where: { key: { in: ["gmail_oauth_client_id", "gmail_oauth_client_secret"] } },
    });
    const getVal = (key) => settings.find((s) => s.key === key)?.value || "";
    const clientId     = getVal("gmail_oauth_client_id");
    const clientSecret = getVal("gmail_oauth_client_secret");

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${settingsUrl}&gmail_oauth_error=${encodeURIComponent("Thiếu Client ID hoặc Client Secret trong Cài đặt.")}`);
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Đổi authorization code → tokens
    const { tokens } = await oauth2Client.getToken(code);
    const { refresh_token, access_token } = tokens;

    if (!refresh_token) {
      // Nếu không có refresh_token → tài khoản này đã từng cấp quyền, cần revoke rồi làm lại
      return NextResponse.redirect(
        `${settingsUrl}&gmail_oauth_error=${encodeURIComponent("Google không trả về refresh_token. Hãy vào https://myaccount.google.com/permissions → Thu hồi quyền app → Kết nối lại.")}`
      );
    }

    // Lấy email thực tế từ token info
    oauth2Client.setCredentials(tokens);
    let actualEmail = hintEmail;
    try {
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: "me" });
      actualEmail = profile.data.emailAddress || hintEmail;
    } catch (_) {}

    // Trả thông tin về client qua URL params (an toàn vì chỉ redirect về trang admin)
    // refresh_token được lưu phía client vào localStorage (cùng cơ chế với App Password hiện tại)
    const tokenData = encodeURIComponent(JSON.stringify({
      email: actualEmail,
      refreshToken: refresh_token,
      accessToken: access_token,
    }));

    return NextResponse.redirect(`${settingsUrl}&gmail_oauth_success=1&gmail_token=${tokenData}`);
  } catch (err) {
    console.error("[gmail-callback]", err);
    return NextResponse.redirect(
      `${settingsUrl}&gmail_oauth_error=${encodeURIComponent(err.message)}`
    );
  }
}
