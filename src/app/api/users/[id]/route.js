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

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { fullName, role, password } = body;

    const existingUser = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    // Nếu thay đổi quyền thành "staff" cho chính mình
    if (session.user.email === existingUser.username && role === "staff") {
      return NextResponse.json({ error: "Bạn không thể tự hạ quyền của chính mình" }, { status: 400 });
    }

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
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
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền thực hiện" }, { status: 403 });
    }

    const id = parseInt(params.id);
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
