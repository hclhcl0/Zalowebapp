/**
 * API tạm thời: Khôi phục nhân viên từ dữ liệu JSON (gửi từ client)
 * POST /api/followers/restore-staff
 * Body: { rows: [{ zaloUserId, displayName, phone, dept, staffNameRaw }] }
 * Xóa file này sau khi dùng xong!
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeName(n) {
  return String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(request) {
  try {
    const { rows, secret } = await request.json();

    // Bảo vệ đơn giản
    if (secret !== "cdc-restore-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu" }, { status: 400 });
    }

    let created = 0, skipped = 0, linked = 0, errors = [];

    for (const row of rows) {
      const { zaloUserId, displayName, phone, dept, staffNameRaw } = row;
      if (!zaloUserId || !staffNameRaw) continue;

      try {
        // 1. Tạo hoặc cập nhật Follower
        const existing = await prisma.follower.findUnique({ where: { zaloUserId } });
        if (!existing) {
          await prisma.follower.create({
            data: {
              zaloUserId,
              displayName: displayName || staffNameRaw,
              phone: phone || null,
              userType: "staff",
            },
          });
          created++;
        } else {
          if (existing.userType !== "staff") {
            await prisma.follower.update({
              where: { zaloUserId },
              data: { userType: "staff" },
            });
          }
          skipped++;
        }

        // 2. Upsert StaffZaloLink
        await prisma.staffZaloLink.upsert({
          where: { zaloUserId },
          update: {
            staffNameRaw,
            staffName: normalizeName(staffNameRaw),
            ...(dept && { department: dept }),
            ...(phone && { phone }),
          },
          create: {
            staffNameRaw,
            staffName: normalizeName(staffNameRaw),
            zaloUserId,
            department: dept || null,
            phone: phone || null,
          },
        });
        linked++;
      } catch (err) {
        errors.push(`${staffNameRaw} (${zaloUserId}): ${err.message}`);
      }
    }

    const totalFollowers = await prisma.follower.count();
    const totalStaff = await prisma.staffZaloLink.count();

    return NextResponse.json({
      success: true,
      created,
      skipped,
      linked,
      errors: errors.slice(0, 20),
      totalFollowers,
      totalStaff,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
