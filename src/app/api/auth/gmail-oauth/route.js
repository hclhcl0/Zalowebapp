/**
 * GET /api/auth/gmail-oauth
 * Tạo URL xác thực Google OAuth2 để lấy refresh token cho Gmail
 * Query params:
 *   - email: Gmail address muốn kết nối (optional, dùng để hint)
 */
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const hintEmail = searchParams.get("email") || "";

    // Lấy Client ID + Secret từ database
    const settings = await prisma.systemConfig.findMany({
      where: { key: { in: ["gmail_oauth_client_id", "gmail_oauth_client_secret"] } },
    });
    const getVal = (key) => settings.find((s) => s.key === key)?.value || "";
    const clientId = getVal("gmail_oauth_client_id");
    const clientSecret = getVal("gmail_oauth_client_secret");

    if (!clientId || !clientSecret) {
      return Response.json(
        { error: "Chưa cấu hình Google OAuth2 Client ID / Client Secret trong Cài đặt." },
        { status: 400 }
      );
    }

    // Xây dựng redirect URI (lấy từ origin header hoặc env)
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${origin}/api/auth/gmail-callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Tạo state chứa email hint để sau callback biết gắn vào account nào
    const state = Buffer.from(JSON.stringify({ email: hintEmail, redirectUri })).toString("base64url");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",       // BẮT BUỘC để nhận refresh_token
      prompt: "consent",             // BẮT BUỘC: luôn hiển thị consent để nhận refresh_token mới
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
      ],
      login_hint: hintEmail || undefined,
      state,
    });

    return Response.json({ authUrl, redirectUri });
  } catch (err) {
    console.error("[gmail-oauth]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
