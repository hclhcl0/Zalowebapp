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
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Bảo vệ toàn bộ các trang ngoại trừ đăng nhập, api auth, static files
  matcher: ["/((?!login|api/auth|news/view|_next/static|_next/image|favicon.ico).*)"],
};
