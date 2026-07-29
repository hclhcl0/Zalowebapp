/**
 * API: Chi tiết & Thao tác tài khoản hệ thống (PUT, DELETE)
 * PUT    /api/users/[id] → Cập nhật tài khoản (Hỗ trợ đổi pass, đổi quyền)
 * DELETE /api/users/[id] → Xóa tài khoản (Chặn tự xóa chính mình)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import { isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    const { fullName, role, password, department } = body;

    const existingUser = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    // Chặn tự gỡ quyền admin của chính mình
    if (session.user.email === existingUser.username && role && !isAdmin(role)) {
      return NextResponse.json({ error: "Bạn không thể tự gỡ quyền admin của chính mình" }, { status: 400 });
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (role) {
      updateData.role = role;
    }
    if (department !== undefined) {
      updateData.department = role?.includes("staff") || existingUser.role?.includes("staff") ? department : null;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        department: true,
      },
    });

    return NextResponse.json({ data: updatedUser });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const existingUser = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    // Chặn tự xóa tài khoản của chính mình
    if (session.user.email === existingUser.username) {
      return NextResponse.json({ error: "Không được tự xóa tài khoản đang đăng nhập" }, { status: 400 });
    }

    await prisma.admin.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Xóa tài khoản thành công" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
