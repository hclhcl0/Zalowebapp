import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    
    // Phân quyền: Chỉ cho phép Quản trị viên (admin) truy cập mục Cài đặt hệ thống
    if (path.startsWith("/settings") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req?.nextUrl?.pathname;
        if (path && (path.includes("zalo_verifier") || path.startsWith("/zalo_verifier"))) {
          return true;
        }
        return !!token;
      },
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback_nextauth_secret_key_cdc_danang_2026_change_in_production",
  }
);

export const config = {
  // Bảo vệ toàn bộ các trang ngoại trừ đăng nhập, api auth, cron jobs, static files và các trang công khai khác
  matcher: ["/((?!zalo_verifier|login|api/auth|api/cron|api/zalo/webhook|api/miniapp|api/articles|api/payload-articles|news/view|register|patient-register|api/followers/register|api/followers/patient-register|_next/static|_next/image|favicon.ico|manifest.json|sw.js|cdc-logo.png|uploads).*)"],
};

