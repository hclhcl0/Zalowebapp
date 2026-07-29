/**
 * API: Quản lý người dùng hệ thống (Admin & Nhân viên)
 * GET  /api/users → Danh sách tài khoản
 * POST /api/users → Tạo tài khoản mới (mã hóa mật khẩu với bcryptjs)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Lấy danh sách tài khoản
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    const users = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: users });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Tạo tài khoản mới
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, fullName, role, department } = body;

    if (!username || !password || !fullName || !role) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Kiểm tra trùng username
    const existing = await prisma.admin.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({ error: "Tên đăng nhập đã tồn tại" }, { status: 400 });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        role, // "admin,broadcaster"
        department: role.includes("staff") ? department : null,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
