/**
 * API: Quản lý Người quan tâm Zalo OA
 * GET  /api/followers         → Lấy danh sách người quan tâm (hỗ trợ search)
 * POST /api/followers         → Thêm mới hoặc cập nhật người quan tâm (cho đồng bộ/webhook)
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const userType = searchParams.get("userType") || "all";
    const interestGroup = searchParams.get("interestGroup") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const skip = (page - 1) * limit;

    // Lấy tất cả zaloUserId của nhân viên đã liên kết để đối chiếu chéo (chánh lỗi lệch data) và dùng cho search
    const allStaffLinks = await prisma.staffZaloLink.findMany({
      select: { zaloUserId: true, department: true, phone: true, staffNameRaw: true, staffName: true }
    });
    const staffZaloUserIds = allStaffLinks.map((link) => link.zaloUserId);

    const whereClause = {
      AND: [],
    };

    if (query) {
      const lowerQuery = query.toLowerCase();
      const matchedStaffUserIds = allStaffLinks
        .filter(link => 
          (link.staffNameRaw && link.staffNameRaw.toLowerCase().includes(lowerQuery)) ||
          (link.phone && link.phone.includes(lowerQuery)) ||
          (link.department && link.department.toLowerCase().includes(lowerQuery))
        )
        .map(link => link.zaloUserId);

      // Build danh sách OR nhưng đảm bảo không trả về duplicate rows
      // (khi tên Zalo và tên thật trong StaffZaloLink đều khớp cùng 1 zaloUserId)
      whereClause.AND.push({
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { fullName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { zaloUserId: { contains: query, mode: "insensitive" } },
          { department: { contains: query, mode: "insensitive" } },
          { cccd: { contains: query, mode: "insensitive" } },
          ...(matchedStaffUserIds.length > 0 ? [{ zaloUserId: { in: matchedStaffUserIds } }] : [])
        ],
      });
    }

    if (userType === "staff") {
      // Cán bộ cơ quan: Có userType là 'staff' HOẶC có trong bảng liên kết nhân viên
      whereClause.AND.push({
        OR: [
          { userType: "staff" },
          { zaloUserId: { in: staffZaloUserIds } }
        ]
      });
    } else if (userType === "citizen") {
      // Khách hàng: Có userType là 'citizen' VÀ KHÔNG có trong bảng liên kết nhân viên
      whereClause.AND.push({
        userType: "citizen",
        zaloUserId: { notIn: staffZaloUserIds }
      });
    }

    if (interestGroup) {
      whereClause.AND.push({ interestGroup });
    }

    // total sẽ được tính sau khi dedup (xem bên dưới)
    let total = 0;

    // Lấy tất cả khớp (không giới hạn trang trước) để dedup, rồi mới phân trang
    const allMatchedFollowers = await prisma.follower.findMany({
      where: whereClause,
      include: {
        appointments: true,
        testResults: true,
      },
      orderBy: { followedAt: "desc" },
    });

    // Loại bỏ duplicate theo id (xảy ra khi OR match cả displayName lẫn staffLink.zaloUserId)
    const seenIds = new Set();
    const dedupedFollowers = allMatchedFollowers.filter(f => {
      if (seenIds.has(f.id)) return false;
      seenIds.add(f.id);
      return true;
    });

    // Phân trang thủ công sau khi dedup
    total = dedupedFollowers.length;
    const followers = dedupedFollowers.slice(skip, skip + limit);

    const staffLinkMap = {};
    allStaffLinks.forEach((link) => {
      staffLinkMap[link.zaloUserId] = link;
    });

    // Đính kèm staffLink và chuẩn hóa hiển thị đồng bộ
    let enrichedFollowers = followers.map((f) => {
      const staffLink = staffLinkMap[f.zaloUserId] || null;
      return {
        ...f,
        userType: staffLink ? "staff" : f.userType,
        department: staffLink ? (staffLink.department || f.department) : f.department,
        phone: staffLink ? (staffLink.phone || f.phone) : f.phone,
        staffLink,
      };
    });

    // ----------------------------------------------------------------------
    // TỰ ĐỘNG GỘP TRÙNG LẶP (Deduplicate) ĐỂ GIAO DIỆN CHỈ CÓ "1 TÊN DUY NHẤT"
    // Gộp các tài khoản bị tách làm 2 (do khác biệt SĐT, Zalo Mini App ID và OA ID)
    // ----------------------------------------------------------------------
    const cleanPhone = (p) => {
      if (!p) return "";
      let s = String(p).replace(/\D/g, "");
      if (s.startsWith("84")) s = "0" + s.substring(2);
      return s;
    };

    const nameAvatarMap = new Map();
    const phoneMap = new Map();

    for (const f of enrichedFollowers) {
      const phoneKey = cleanPhone(f.phone);
      const nameKey = `${f.displayName}|${f.avatarUrl || "no-avatar"}`;
      
      const existingByPhone = phoneKey ? phoneMap.get(phoneKey) : null;
      const existingByName = nameAvatarMap.get(nameKey);
      const existing = existingByPhone || existingByName;

      if (existing) {
        // Ưu tiên giữ lại bản ghi có thông tin Cán bộ (staffLink) hoặc ngày cập nhật mới nhất
        if (f.staffLink && !existing.staffLink) {
          if (phoneKey) phoneMap.set(phoneKey, f);
          nameAvatarMap.set(nameKey, f);
        } else if (f.userType === 'staff' && existing.userType !== 'staff') {
          if (phoneKey) phoneMap.set(phoneKey, f);
          nameAvatarMap.set(nameKey, f);
        } else if (new Date(f.followedAt || 0) > new Date(existing.followedAt || 0)) {
          if (phoneKey) phoneMap.set(phoneKey, f);
          nameAvatarMap.set(nameKey, f);
        }
      } else {
        if (phoneKey) phoneMap.set(phoneKey, f);
        nameAvatarMap.set(nameKey, f);
      }
    }

    // Lấy danh sách duy nhất theo id sau khi gộp
    const dedupedSet = new Set();
    const finalGroupedFollowers = [];
    
    // Ưu tiên từ phoneMap
    phoneMap.forEach(f => {
      if (!dedupedSet.has(f.id)) {
        dedupedSet.add(f.id);
        finalGroupedFollowers.push(f);
      }
    });

    // Thêm các bản ghi còn lại từ nameAvatarMap
    nameAvatarMap.forEach(f => {
      if (!dedupedSet.has(f.id)) {
        dedupedSet.add(f.id);
        finalGroupedFollowers.push(f);
      }
    });

    enrichedFollowers = finalGroupedFollowers;

    // Tự động sửa chữa dữ liệu (Self-healing) bất đồng bộ đối với các bản ghi bị lệch userType
    const mismatchedUserIds = staffZaloUserIds.filter(uid => {
      const found = followers.find(f => f.zaloUserId === uid);
      return found && found.userType !== "staff";
    });

    if (mismatchedUserIds.length > 0 || (userType === "all" && allStaffLinks.length > 0)) {
      // Chạy nền sửa chữa dữ liệu lệch
      (async () => {
        try {
          const targets = await prisma.follower.findMany({
            where: {
              zaloUserId: { in: staffZaloUserIds },
              userType: { not: "staff" }
            }
          });
          if (targets.length > 0) {
            console.log(`[Self-Healing] Phát hiện ${targets.length} cán bộ bị lệch phân loại. Đang tự động sửa...`);
            for (const t of targets) {
              const link = staffLinkMap[t.zaloUserId];
              await prisma.follower.update({
                where: { id: t.id },
                data: {
                  userType: "staff",
                  department: link.department || t.department,
                  phone: link.phone || t.phone
                }
              });
            }
          }
        } catch (e) {
          console.error("[Self-Healing Error]", e);
        }
      })();
    }

    return NextResponse.json({
      data: enrichedFollowers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { zaloUserId, displayName, avatarUrl, phone } = body;

    if (!zaloUserId) {
      return NextResponse.json({ error: "Thiếu zaloUserId" }, { status: 400 });
    }

    const follower = await prisma.follower.upsert({
      where: { zaloUserId },
      update: {
        ...(displayName && { displayName }),
        ...(avatarUrl && { avatarUrl }),
        ...(phone && { phone }),
      },
      create: {
        zaloUserId,
        displayName: displayName || "Người dùng Zalo",
        avatarUrl,
        phone,
      },
    });

    return NextResponse.json({ data: follower }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
