/**
 * API: Tạo Authorization URL và Code Challenge (PKCE)
 * GET /api/zalo/oauth → Trả về URL để redirect người dùng đến Zalo xác thực
 *
 * Zalo dùng OAuth 2.0 với PKCE (Proof Key for Code Exchange)
 * Docs: https://developers.zalo.me/docs/official-account/xac-thuc-va-uy-quyen/yeu-cau-cap-quyen-oa
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Tạo code_verifier ngẫu nhiên (43-128 ký tự, URL-safe)
function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url").slice(0, 128);
}

// Tạo code_challenge = BASE64URL(SHA256(code_verifier))
function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(request) {
  try {
    // Lấy App ID từ database
    const appIdCfg = await prisma.systemConfig.findUnique({
      where: { key: "zalo_app_id" },
    });

    if (!appIdCfg?.value) {
      return NextResponse.json(
        { error: "Chưa cấu hình App ID. Vui lòng vào Cài đặt để nhập App ID." },
        { status: 400 }
      );
    }

    const appId      = appIdCfg.value;
    const verifier   = generateCodeVerifier();
    const challenge  = generateCodeChallenge(verifier);
    const state      = crypto.randomBytes(16).toString("hex");

    // Lưu verifier & state vào DB để dùng lại khi callback về
    await Promise.all([
      prisma.systemConfig.upsert({
        where:  { key: "_oauth_code_verifier" },
        update: { value: verifier },
        create: { key: "_oauth_code_verifier", value: verifier, label: "PKCE Code Verifier (tạm thời)" },
      }),
      prisma.systemConfig.upsert({
        where:  { key: "_oauth_state" },
        update: { value: state },
        create: { key: "_oauth_state", value: state, label: "OAuth State (tạm thời)" },
      }),
    ]);

    // Lấy callback URL chính xác theo biến môi trường hoặc fallback cứng (đảm bảo không bị proxy sửa đổi port/domain)
    let siteUrl = process.env.NEXTAUTH_URL || "https://zcdc.ksbtdanang.vn";
    if (siteUrl.endsWith('/')) siteUrl = siteUrl.slice(0, -1);
    const redirectUri = `${siteUrl}/api/zalo/callback`;

    // Tạo Authorization URL theo đúng chuẩn Zalo OA OAuth
    const authUrl = new URL("https://oauth.zaloapp.com/v4/oa/permission");
    authUrl.searchParams.set("app_id",       appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("state",         state);

    return NextResponse.json({
      authUrl:      authUrl.toString(),
      redirectUri,
      codeChallenge: challenge,
      state,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
