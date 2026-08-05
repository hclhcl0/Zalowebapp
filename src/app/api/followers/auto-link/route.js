/**
 * API: Tự động khớp (re-match) Follower với StaffZaloLink theo SĐT + tên
 * POST /api/followers/auto-link
 *
 * Xử lý trường hợp:
 * 1. Nhân viên đổi tài khoản Zalo (SĐT giữ nguyên nhưng Zalo ID mới)
 * 2. Nhân viên vừa follow OA sau khi đã import Excel
 * 3. Follower có SĐT khớp với Admin nhưng chưa có StaffZaloLink
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanPhone(p) {
  if (!p) return null;
  const s = String(p).replace(/\D/g, "");
  if (s.startsWith("84") && s.length > 9) return "0" + s.slice(2);
  if (s.startsWith("0")) return s;
  if (s.length === 9) return "0" + s;
  return null;
}

function removeDiacritics(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export async function POST() {
  try {
    const [allFollowers, allStaffLinks, allAdmins] = await Promise.all([
      prisma.follower.findMany(),
      prisma.staffZaloLink.findMany(),
      prisma.admin.findMany({ select: { username: true, name: true } }),
    ]);

    const results = {
      relinked: [],      // StaffZaloLink được cập nhật zaloUserId mới
      newLinked: [],     // StaffZaloLink mới tạo từ Admin match
      alreadyOk: 0,     // Đã đúng rồi, không cần thay đổi
      noMatch: [],      // Không tìm được follower khớp
    };

    // ─── 1. Re-match StaffZaloLink theo SĐT ─────────────────────────────────
    for (const link of allStaffLinks) {
      const linkPhone = cleanPhone(link.phone);
      if (!linkPhone) continue;

      // Tìm follower có SĐT khớp
      const matchedFollower = allFollowers.find(
        (f) => cleanPhone(f.phone) === linkPhone
      );

      if (!matchedFollower) {
        results.noMatch.push({ staffName: link.staffNameRaw, phone: link.phone, reason: "Chưa follow OA" });
        continue;
      }

      if (matchedFollower.zaloUserId === link.zaloUserId) {
        results.alreadyOk++;
        continue;
      }

      // Zalo ID đã thay đổi → cập nhật lại
      const oldZaloId = link.zaloUserId;
      const newZaloId = matchedFollower.zaloUserId;

      try {
        // Kiểm tra xem newZaloId đã có StaffZaloLink khác chưa
        const conflict = await prisma.staffZaloLink.findUnique({ where: { zaloUserId: newZaloId } });
        if (conflict && conflict.id !== link.id) {
          results.noMatch.push({
            staffName: link.staffNameRaw,
            phone: link.phone,
            reason: `Zalo ID mới đang liên kết với "${conflict.staffNameRaw}"`,
          });
          continue;
        }

        // Cập nhật StaffZaloLink sang zaloUserId mới
        await prisma.staffZaloLink.update({
          where: { id: link.id },
          data: { zaloUserId: newZaloId, phone: matchedFollower.phone || link.phone },
        });

        // Cập nhật follower mới → staff
        await prisma.follower.update({
          where: { zaloUserId: newZaloId },
          data: { userType: "staff", department: link.department },
        });

        // Reset follower cũ → citizen (nếu không còn link nào)
        const remainingOld = await prisma.staffZaloLink.findFirst({ where: { zaloUserId: oldZaloId } });
        if (!remainingOld) {
          await prisma.follower.update({
            where: { zaloUserId: oldZaloId },
            data: { userType: "citizen" },
          }).catch(() => {});
        }

        results.relinked.push({
          staffName: link.staffNameRaw,
          oldZaloId,
          newZaloId,
        });
      } catch (err) {
        results.noMatch.push({ staffName: link.staffNameRaw, phone: link.phone, reason: err.message });
      }
    }

    // ─── 2. Tự tạo StaffZaloLink cho Follower khớp với Admin ────────────────
    const linkedZaloIds = new Set((await prisma.staffZaloLink.findMany()).map((l) => l.zaloUserId));

    for (const follower of allFollowers) {
      if (linkedZaloIds.has(follower.zaloUserId)) continue; // Đã được link rồi
      if (!follower.phone) continue;

      const followerPhone = cleanPhone(follower.phone);
      if (!followerPhone) continue;

      // Tìm Admin khớp SĐT
      const matchedAdmin = allAdmins.find(
        (a) => cleanPhone(a.username) === followerPhone
      );
      if (!matchedAdmin) continue;

      try {
        await prisma.staffZaloLink.create({
          data: {
            staffNameRaw: matchedAdmin.name || follower.displayName,
            staffName: removeDiacritics(matchedAdmin.name || follower.displayName),
            zaloUserId: follower.zaloUserId,
            phone: followerPhone,
          },
        });

        await prisma.follower.update({
          where: { zaloUserId: follower.zaloUserId },
          data: { userType: "staff" },
        });

        linkedZaloIds.add(follower.zaloUserId);
        results.newLinked.push({
          staffName: matchedAdmin.name || follower.displayName,
          zaloUserId: follower.zaloUserId,
          phone: followerPhone,
        });
      } catch (err) {
        // Bỏ qua lỗi trùng lặp
      }
    }

    // ─── 3. Tìm Follower chưa link, thử khớp theo tên Zalo với StaffZaloLink ─
    const currentLinks = await prisma.staffZaloLink.findMany();
    const linkedIds = new Set(currentLinks.map((l) => l.zaloUserId));
    const activeFollowerIds = new Set(allFollowers.map(f => f.zaloUserId));

    for (const follower of allFollowers) {
      if (linkedIds.has(follower.zaloUserId)) continue;

      const followerName = removeDiacritics(follower.displayName);

      const nameMatch = currentLinks.find(
        (l) => removeDiacritics(l.staffNameRaw) === followerName && !activeFollowerIds.has(l.zaloUserId)
      );

      if (nameMatch && !follower.phone) {
        // Chỉ match theo tên nếu không có SĐT để tránh nhầm lẫn
        try {
          const conflict = await prisma.staffZaloLink.findUnique({ where: { zaloUserId: follower.zaloUserId } });
          if (!conflict) {
            await prisma.staffZaloLink.update({
              where: { id: nameMatch.id },
              data: { zaloUserId: follower.zaloUserId },
            });
            await prisma.follower.update({
              where: { zaloUserId: follower.zaloUserId },
              data: { userType: "staff" },
            });
            linkedIds.add(follower.zaloUserId);
            results.newLinked.push({
              staffName: nameMatch.staffNameRaw,
              zaloUserId: follower.zaloUserId,
              matchedBy: "name",
            });
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        relinked: results.relinked.length,
        newLinked: results.newLinked.length,
        alreadyOk: results.alreadyOk,
        noMatch: results.noMatch.length,
      },
      details: results,
    });
  } catch (err) {
    console.error("[auto-link]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
