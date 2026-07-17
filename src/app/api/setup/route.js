import { exec } from "child_process";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const runCommand = (cmd) => {
    return new Promise((resolve) => {
      exec(cmd, { env: process.env }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, stderr });
        } else {
          resolve({ success: true, stdout });
        }
      });
    });
  };

  try {
    // 1. Đồng bộ cấu trúc DB một cách an toàn
    const dbPushResult = await runCommand("node scripts/db-sync.mjs");
    if (!dbPushResult.success) {
      return NextResponse.json({
        success: false,
        message: "Lỗi khi đồng bộ cấu trúc cơ sở dữ liệu (db sync)",
        error: dbPushResult.error,
        stderr: dbPushResult.stderr
      }, { status: 500 });
    }

    // 2. Tạo tài khoản Admin & Staff mặc định bằng Prisma Client
    const hashed = await bcrypt.hash("Admin@2026", 10);
    const admin = await prisma.admin.upsert({
      where: { username: "admin" },
      update: {},
      create: {
        username: "admin",
        password: hashed,
        fullName: "Quản trị viên CDC",
        role: "admin",
      },
    });

    const staffHashed = await bcrypt.hash("Staff@2026", 10);
    const staff = await prisma.admin.upsert({
      where: { username: "nhanvien" },
      update: {},
      create: {
        username: "nhanvien",
        password: staffHashed,
        fullName: "Nhân viên CDC",
        role: "staff",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Khởi tạo cơ sở dữ liệu và tài khoản Admin/Staff thành công!",
      dbPushOutput: dbPushResult.stdout,
      admin: admin.username,
      staff: staff.username
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: "Lỗi hệ thống trong quá trình setup",
      error: err.message
    }, { status: 500 });
  }
}
