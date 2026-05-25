/**
 * API: Đồng bộ danh sách người quan tâm từ Zalo OA thực tế
 * POST /api/followers/sync
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFollowers, getUserProfile } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. Gọi Zalo OA API lấy danh sách ID người quan tâm (Phân trang tối đa 50 người/lượt)
    let offset = 0;
    const count = 50;
    let followersList = [];
    let hasMore = true;
    const maxPages = 20; // Đồng bộ tối đa 1000 người để đảm bảo kéo đủ danh sách lớn hơn
    let page = 0;

    while (hasMore && page < maxPages) {
      const followersRes = await getFollowers(offset, count);

      if (followersRes.error && followersRes.error !== 0) {
        if (followersList.length > 0) {
          break; // Nếu đã lấy được các trang trước thì vẫn tiếp tục xử lý phần đã lấy được
        }
        return NextResponse.json(
          { error: `Zalo API Error: ${followersRes.message} (Mã lỗi: ${followersRes.error}). Vui lòng kiểm tra lại Token kết nối Zalo OA.` },
          { status: 400 }
        );
      }

      const batch = followersRes.data?.users || followersRes.data?.followers || [];
      followersList = [...followersList, ...batch];

      const total = followersRes.data?.total || 0;
      offset += batch.length;
      page++;

      if (batch.length < count || offset >= total) {
        hasMore = false;
      }
    }

    let newCount = 0;
    let updateCount = 0;

    // 2. Lặp qua danh sách và lấy profile từng người
    for (const item of followersList) {
      const rawUserId = item.user_id;
      if (!rawUserId) continue;
      const zaloUserId = String(rawUserId);

      // Thêm độ trễ 150ms giữa các yêu cầu để tránh bị Zalo API đánh giá spam (Rate limit)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Lấy profile chi tiết từ Zalo
      let displayName = "Người dùng Zalo";
      let avatarUrl = "";
      let phone = null;

      try {
        const profileRes = await getUserProfile(zaloUserId);
        if (profileRes.error === 0 && profileRes.data) {
          const rawName = profileRes.data.display_name || profileRes.data.shared_info?.name;
          if (rawName !== undefined && rawName !== null) {
            displayName = String(rawName);
          }
          
          const rawAvatar = profileRes.data.avatar;
          if (rawAvatar !== undefined && rawAvatar !== null) {
            avatarUrl = String(rawAvatar);
          }

          const rawPhone = profileRes.data.shared_info?.phone || profileRes.data.phone;
          if (rawPhone !== undefined && rawPhone !== null) {
            phone = String(rawPhone);
          }
        } else {
          console.warn(`[Zalo Sync] Lỗi API khi lấy profile user ${zaloUserId}: Code ${profileRes.error} - ${profileRes.message}`);
        }
      } catch (err) {
        console.warn(`[Zalo Sync] Không thể kết nối lấy profile cho user ${zaloUserId}:`, err.message);
      }

      // Hàm chuẩn hóa số điện thoại
      const normalizePhone = (p) => {
        if (!p) return "";
        let clean = p.replace(/\D/g, "");
        if (clean.startsWith("84") && clean.length > 9) {
          clean = "0" + clean.slice(2);
        }
        return clean;
      };

      // 3. Upsert vào Database của CDC với kiểm tra khớp cán bộ y tế
      try {
        let userType = "citizen";
        if (phone) {
          const normalized = normalizePhone(phone);
          const matchedAdmin = await prisma.admin.findFirst({
            where: {
              OR: [
                { username: normalized },
                { username: phone }
              ]
            }
          });
          if (matchedAdmin) {
            userType = "staff";
          }
        }

        const existing = await prisma.follower.findUnique({
          where: { zaloUserId },
        });

        if (existing) {
          let finalUserType = existing.userType;
          if (existing.userType === "citizen" && userType === "staff") {
            finalUserType = "staff";
          }
          await prisma.follower.update({
            where: { zaloUserId },
            data: {
              displayName,
              avatarUrl,
              phone,
              userType: finalUserType,
            },
          });
          updateCount++;
        } else {
          await prisma.follower.create({
            data: {
              zaloUserId,
              displayName,
              avatarUrl,
              phone,
              userType,
            },
          });
          newCount++;
        }
      } catch (prismaErr) {
        console.error("Prisma Sync Error for user_id:", zaloUserId, prismaErr);
        throw prismaErr; // ném lên để catch tổng bắt được
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalFromZalo: followersList.length,
        newAdded: newCount,
        updated: updateCount,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
