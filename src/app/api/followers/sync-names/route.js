import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Lấy danh sách thông tin Cán bộ để làm chuẩn so sánh
    const staffFollowers = await prisma.follower.findMany({
      where: { userType: "staff" },
      select: { zaloUserId: true, displayName: true, department: true, phone: true }
    });
    const staffLinks = await prisma.staffZaloLink.findMany();

    const staffZaloNameMap = new Map();

    staffFollowers.forEach(s => {
      if (s.displayName && s.displayName !== "Người dùng Zalo") {
        staffZaloNameMap.set(s.displayName.trim().toLowerCase(), {
          department: s.department,
          phone: s.phone
        });
      }
    });

    staffLinks.forEach(l => {
      if (l.staffNameRaw) {
        staffZaloNameMap.set(l.staffNameRaw.trim().toLowerCase(), {
          department: l.department,
          phone: l.phone,
          staffNameRaw: l.staffNameRaw,
          staffName: l.staffName
        });
      }
    });

    // 2. Lấy TẤT CẢ các tài khoản đang mang nhãn 'citizen' (Khách hàng)
    const citizenFollowers = await prisma.follower.findMany({
      where: { userType: "citizen" }
    });

    let updatedCount = 0;
    let convertedStaffCount = 0;
    const updatedList = [];

    for (const f of citizenFollowers) {
      try {
        let currentName = f.displayName ? f.displayName.trim() : "";
        let currentAvatar = f.avatarUrl || null;

        // Nếu tài khoản bị thiếu tên Zalo (đang là 'Người dùng Zalo' hoặc null) -> Gọi API Zalo lấy tên
        if (!currentName || currentName === "Người dùng Zalo") {
          const profile = await getUserProfile(f.zaloUserId);
          if (profile?.error === 0 && profile?.data?.display_name) {
            currentName = profile.data.display_name.trim();
            currentAvatar = profile.data.avatar || currentAvatar;
            updatedCount++;
          }
        }

        if (currentName && currentName !== "Người dùng Zalo") {
          const lowerName = currentName.toLowerCase();
          const matchedStaff = staffZaloNameMap.get(lowerName);

          // Nếu Tên Zalo khớp với Tên Zalo hoặc Tên thật của Cán bộ nào đó
          if (matchedStaff) {
            convertedStaffCount++;
            await prisma.follower.update({
              where: { id: f.id },
              data: {
                displayName: currentName,
                ...(currentAvatar && { avatarUrl: currentAvatar }),
                userType: "staff",
                ...(matchedStaff.department && { department: matchedStaff.department }),
                ...(matchedStaff.phone && { phone: matchedStaff.phone })
              }
            });

            // Cập nhật/Tạo bản ghi liên kết Cán bộ trong StaffZaloLink
            try {
              await prisma.staffZaloLink.upsert({
                where: { zaloUserId: f.zaloUserId },
                create: {
                  zaloUserId: f.zaloUserId,
                  staffNameRaw: matchedStaff.staffNameRaw || currentName,
                  staffName: matchedStaff.staffName || lowerName,
                  department: matchedStaff.department || null,
                  phone: matchedStaff.phone || null
                },
                update: {
                  department: matchedStaff.department || undefined,
                  phone: matchedStaff.phone || undefined
                }
              });
            } catch (e) {}

            updatedList.push({
              id: f.id,
              zaloUserId: f.zaloUserId,
              displayName: currentName,
              status: "Đã tự động chuyển sang Cán bộ (Staff)"
            });
          } else if (f.displayName !== currentName) {
            // Cập nhật tên Zalo mới cho khách hàng thường
            await prisma.follower.update({
              where: { id: f.id },
              data: {
                displayName: currentName,
                ...(currentAvatar && { avatarUrl: currentAvatar })
              }
            });
            updatedList.push({
              id: f.id,
              zaloUserId: f.zaloUserId,
              displayName: currentName,
              status: "Đã cập nhật Tên Zalo"
            });
          }
        }
      } catch (err) {
        console.error(`[Sync Scan Error] ID ${f.id}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã quét xong toàn bộ ${citizenFollowers.length} tài khoản Khách hàng! Tự động phát hiện và chuyển ${convertedStaffCount} tài khoản trùng tên Zalo sang Cán bộ (Staff).`,
      totalScanned: citizenFollowers.length,
      fetchedNamesFromZaloCount: updatedCount,
      convertedStaffCount,
      updatedList
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
