import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const OLD_DB_URL = "postgres://postgres:7BIYLrLwr5S24SmkrSDqIhGss4vty7ifPNsJyqvQJzx0TWA7NI54JGguHBpjboQY@xjm3rrt318r2jke16azlh1fq:5432/postgres";

export async function GET() {
  const oldPrisma = new PrismaClient({
    datasources: {
      db: { url: OLD_DB_URL },
    },
  });

  try {
    // 1. Kiểm tra danh sách bảng
    const tables = await oldPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;

    // 2. Thống kê bảng Follower
    let followerStats = null;
    try {
      const totalFollowers = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "Follower"`;
      const staffFollowers = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "Follower" WHERE "userType" = 'staff'`;
      const citizenFollowers = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "Follower" WHERE "userType" = 'citizen'`;
      const citizenWithFullName = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "Follower" WHERE "userType" = 'citizen' AND "fullName" IS NOT NULL AND "fullName" != ''`;
      const citizenWithPhone = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "Follower" WHERE "userType" = 'citizen' AND "phone" IS NOT NULL AND "phone" != ''`;
      const citizenWithCccd = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "Follower" WHERE "userType" = 'citizen' AND "cccd" IS NOT NULL AND "cccd" != ''`;
      
      // Lấy mẫu các khách hàng đã đăng ký thông tin (nếu có)
      const sampleRegisteredCitizens = await oldPrisma.$queryRaw`
        SELECT "id", "zaloUserId", "displayName", "fullName", "phone", "cccd", "dob", "department", "userType", "followedAt"
        FROM "Follower" 
        WHERE "userType" = 'citizen' AND ("fullName" IS NOT NULL OR "phone" IS NOT NULL OR "cccd" IS NOT NULL)
        LIMIT 20;
      `;

      followerStats = {
        total: totalFollowers[0]?.count,
        staff: staffFollowers[0]?.count,
        citizen: citizenFollowers[0]?.count,
        citizenWithFullName: citizenWithFullName[0]?.count,
        citizenWithPhone: citizenWithPhone[0]?.count,
        citizenWithCccd: citizenWithCccd[0]?.count,
        sampleRegisteredCitizens,
      };
    } catch (e) {
      followerStats = { error: e.message };
    }

    // 3. Kiểm tra các bảng liên quan đến khách hàng khác
    let appointmentsCount = 0;
    let testResultsCount = 0;
    let staffZaloLinksCount = 0;

    try {
      const apt = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "Appointment"`;
      appointmentsCount = apt[0]?.count;
    } catch (e) {}

    try {
      const tr = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "TestResult"`;
      testResultsCount = tr[0]?.count;
    } catch (e) {}

    try {
      const sl = await oldPrisma.$queryRaw`SELECT count(*)::int as count FROM "StaffZaloLink"`;
      staffZaloLinksCount = sl[0]?.count;
    } catch (e) {}

    await oldPrisma.$disconnect();

    return NextResponse.json({
      success: true,
      tables: tables.map(t => t.table_name),
      followerStats,
      appointmentsCount,
      testResultsCount,
      staffZaloLinksCount,
    });
  } catch (err) {
    await oldPrisma.$disconnect();
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
