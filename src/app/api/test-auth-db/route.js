import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const passwordToTest = searchParams.get("pass") || "Admin@2026";
  const usernameToTest = searchParams.get("user") || "admin";

  const logs = [];
  logs.push("Starting test-auth-db API...");

  try {
    // 1. Kiểm tra kết nối Prisma & truy vấn Admin
    logs.push(`Querying admin user: ${usernameToTest}...`);
    const startQuery = Date.now();
    const admin = await prisma.admin.findUnique({
      where: { username: usernameToTest },
    });
    const endQuery = Date.now();
    logs.push(`Query completed in ${endQuery - startQuery}ms.`);

    if (!admin) {
      logs.push("Admin user not found in database.");
      return NextResponse.json({ success: false, logs });
    }

    logs.push("Admin user found. Comparing password hash...");

    // 2. Kiểm tra bcrypt compare
    const startBcrypt = Date.now();
    const isValid = await bcrypt.compare(passwordToTest, admin.password);
    const endBcrypt = Date.now();
    logs.push(`Bcrypt comparison completed in ${endBcrypt - startBcrypt}ms. Result: ${isValid}`);

    return NextResponse.json({
      success: true,
      logs,
      dbUser: {
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        role: admin.role,
      },
      isValid
    });
  } catch (err) {
    logs.push(`Error caught: ${err.message}`);
    return NextResponse.json({
      success: false,
      logs,
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
