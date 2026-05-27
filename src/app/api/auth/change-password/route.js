import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return new Response(JSON.stringify({ error: "Vui lòng cung cấp mật khẩu cũ và mới" }), { status: 400 });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" }), { status: 400 });
    }

    // Lấy thông tin user từ CSDL
    const user = await prisma.user.findUnique({
      where: { username: session.user.email },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "Không tìm thấy người dùng" }), { status: 404 });
    }

    // Kiểm tra mật khẩu cũ
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({ error: "Mật khẩu hiện tại không chính xác" }), { status: 400 });
    }

    // Hash mật khẩu mới và cập nhật
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return new Response(JSON.stringify({ success: true, message: "Đổi mật khẩu thành công" }), { status: 200 });
  } catch (error) {
    console.error("Change password error:", error);
    return new Response(JSON.stringify({ error: "Đã xảy ra lỗi hệ thống" }), { status: 500 });
  }
}
