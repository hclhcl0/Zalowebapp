/**
 * GET /api/auth/drive-oauth
 * Tạo URL xác thực Google OAuth2 để lấy refresh token cho Google Drive (đọc file)
 * Dùng lại google_oauth_client_id / google_oauth_client_secret từ cài đặt Gmail OAuth
 */
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const settings = await prisma.systemConfig.findMany({
      where: { key: { in: ["gmail_oauth_client_id", "gmail_oauth_client_secret"] } },
    });
    const getVal = (key) => settings.find((s) => s.key === key)?.value || "";
    const clientId     = getVal("gmail_oauth_client_id").trim();
    const clientSecret = getVal("gmail_oauth_client_secret").trim();

    if (!clientId || !clientSecret) {
      return Response.json(
        { error: "Chưa cấu hình Google OAuth2 Client ID / Client Secret trong Cài đặt (phần Gmail OAuth)." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";
    const redirectUri = `${origin}/api/auth/drive-callback`;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const state = Buffer.from(JSON.stringify({ redirectUri })).toString("base64url");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      state,
    });

    return Response.json({ authUrl, redirectUri });
  } catch (err) {
    console.error("[drive-oauth]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
