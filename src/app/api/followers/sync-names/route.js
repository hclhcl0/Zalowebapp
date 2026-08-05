import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Lấy tất cả thông tin Cán bộ hiện có để đối chiếu Tên Zalo
    const staffFollowers = await prisma.follower.findMany({
      where: { userType: "staff" },
      select: { zaloUserId: true, displayName: true, department: true, phone: true }
    });
    const staffLinks = await prisma.staffZaloLink.findMany();

    // Map chứa tất cả Tên Zalo của Cán bộ (viết thường để so sánh)
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

    // 2. Tìm danh sách tài khoản chưa có tên Zalo đầy đủ
    const followers = await prisma.follower.findMany({
      where: {
        OR: [
          { displayName: "Người dùng Zalo" },
          { displayName: null }
        ]
      },
      take: 150
    });

    if (followers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tất cả tài khoản đã có tên Zalo đầy đủ!",
        updatedCount: 0,
        convertedStaffCount: 0
      });
    }

    let updatedCount = 0;
    let convertedStaffCount = 0;
    const updatedList = [];

    for (const f of followers) {
      try {
        const profile = await getUserProfile(f.zaloUserId);
        if (profile?.error === 0 && profile?.data?.display_name) {
          const newName = profile.data.display_name.trim();
          const newAvatar = profile.data.avatar || null;
          const lowerName = newName.toLowerCase();

          // Kiểm tra xem Tên Zalo này có trùng với Tên Zalo của Cán bộ nào không
          const matchedStaff = staffZaloNameMap.get(lowerName);
          const isStaffMatch = !!matchedStaff;

          const updateData = {
            displayName: newName,
            ...(newAvatar && { avatarUrl: newAvatar }),
            ...(isStaffMatch && {
              userType: "staff",
              ...(matchedStaff.department && { department: matchedStaff.department }),
              ...(matchedStaff.phone && { phone: matchedStaff.phone })
            })
          };

          await prisma.follower.update({
            where: { id: f.id },
            data: updateData
          });

          // Nếu trùng tên Zalo với Cán bộ -> Cập nhật/Tạo liên kết StaffZaloLink cho ZaloID mới này
          if (isStaffMatch) {
            convertedStaffCount++;
            try {
              await prisma.staffZaloLink.upsert({
                where: { zaloUserId: f.zaloUserId },
                create: {
                  zaloUserId: f.zaloUserId,
                  staffNameRaw: matchedStaff.staffNameRaw || newName,
                  staffName: matchedStaff.staffName || lowerName,
                  department: matchedStaff.department || null,
                  phone: matchedStaff.phone || null
                },
                update: {
                  department: matchedStaff.department || undefined,
                  phone: matchedStaff.phone || undefined
                }
              });
            } catch (linkErr) {
              console.error("[Sync Staff Link Error]", linkErr.message);
            }
          }

          updatedCount++;
          updatedList.push({
            id: f.id,
            zaloUserId: f.zaloUserId,
            displayName: newName,
            convertedToStaff: isStaffMatch
          });
        }
      } catch (e) {
        console.error(`[Sync Names] Lỗi ID ${f.id}:`, e.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật tên Zalo cho ${updatedCount} tài khoản! Trong đó đã tự động chuyển ${convertedStaffCount} tài khoản trùng tên Zalo sang Cán bộ (Staff).`,
      updatedCount,
      convertedStaffCount,
      updatedList
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
