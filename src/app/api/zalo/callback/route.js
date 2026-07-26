/**
 * API: Xử lý OAuth Callback từ Zalo
 * GET /api/zalo/callback?code=xxx&state=yyy
 *
 * Sau khi Admin nhấn "Xác nhận" trên trang Zalo, Zalo sẽ redirect về URL này
 * kèm theo `code` và `state`. Hệ thống dùng code + verifier để đổi lấy tokens.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Nếu người dùng từ chối cấp quyền
  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?oauth_error=${encodeURIComponent(error)}`, process.env.NEXTAUTH_URL ?? "http://localhost:3000")
    );
  }

  if (!code) {
    // Trả về HTML chứa thẻ Meta xác thực Zalo khi Zalo Bot vào kiểm tra (không có code)
    // Thêm các thẻ title, description để Zalo Debugger không báo lỗi
    return new NextResponse(
      `<!DOCTYPE html>
<html>
  <head>
    <title>Xác thực Zalo - CDC Đà Nẵng</title>
    <meta name="description" content="Trang xác thực tên miền Zalo OA cho CDC Đà Nẵng" />
    <meta property="og:title" content="Xác thực Zalo - CDC Đà Nẵng" />
    <meta property="og:description" content="Trang xác thực tên miền Zalo OA cho CDC Đà Nẵng" />
    <meta property="og:image" content="https://cdcqn.gov.vn/wp-content/uploads/2022/06/logo-CDC-e1654396742869.png" />
    <meta property="og:image:width" content="200" />
    <meta property="og:image:height" content="200" />
    <meta name="zalo-platform-site-verification" content="GTcnSB_B2MPytA1gfzecS7_abawJaaCMDJas" />
  </head>
  <body>
    <h1>Zalo Verification</h1>
  </body>
</html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    // Lấy thông tin đã lưu trước đó
    const [verifierCfg, stateCfg, appIdCfg, secretCfg] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: "_oauth_code_verifier" } }),
      prisma.systemConfig.findUnique({ where: { key: "_oauth_state"         } }),
      prisma.systemConfig.findUnique({ where: { key: "zalo_app_id"          } }),
      prisma.systemConfig.findUnique({ where: { key: "zalo_app_secret"      } }),
    ]);

    let siteUrl = process.env.NEXTAUTH_URL || "https://zcdc.ksbtdanang.vn";
    if (siteUrl.endsWith('/')) siteUrl = siteUrl.slice(0, -1);

    // Xác minh state để chống CSRF
    if (state !== stateCfg?.value) {
      return NextResponse.redirect(new URL("/settings?oauth_error=invalid_state", siteUrl));
    }

    const redirectUri = `${siteUrl}/api/zalo/callback`;

    // Đổi authorization code lấy Access Token
    const tokenRes = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: secretCfg?.value ?? "",
      },
      body: new URLSearchParams({
        code,
        app_id:        appIdCfg?.value ?? "",
        grant_type:    "authorization_code",
        code_verifier: verifierCfg?.value ?? "",
        redirect_uri:  redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      const msg = encodeURIComponent(tokenData.message ?? "Không lấy được token");
      return NextResponse.redirect(new URL(`/settings?oauth_error=${msg}`, siteUrl));
    }

    // Lưu Access Token và Refresh Token mới vào database
    await Promise.all([
      prisma.systemConfig.upsert({
        where:  { key: "zalo_access_token" },
        update: { value: tokenData.access_token },
        create: { key: "zalo_access_token", value: tokenData.access_token, label: "Access Token" },
      }),
      prisma.systemConfig.upsert({
        where:  { key: "zalo_refresh_token" },
        update: { value: tokenData.refresh_token ?? "" },
        create: { key: "zalo_refresh_token", value: tokenData.refresh_token ?? "", label: "Refresh Token" },
      }),
      // Xóa verifier và state tạm thời
      prisma.systemConfig.deleteMany({
        where: { key: { in: ["_oauth_code_verifier", "_oauth_state"] } },
      }),
    ]);

    // Redirect về trang Cài đặt với thông báo thành công
    return NextResponse.redirect(new URL("/settings?oauth_success=1", siteUrl));
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/settings?oauth_error=${encodeURIComponent(err.message)}`, process.env.NEXTAUTH_URL ?? "http://localhost:3000")
    );
  }
}
