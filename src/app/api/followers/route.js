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

    // Lấy tổng số lượng để tính phân trang
    const total = await prisma.follower.count({ where: whereClause });

    const followers = await prisma.follower.findMany({
      where: whereClause,
      include: {
        appointments: true,
        testResults: true,
      },
      orderBy: { followedAt: "desc" },
      skip,
      take: limit,
    });

    const staffLinkMap = {};
    allStaffLinks.forEach((link) => {
      staffLinkMap[link.zaloUserId] = link;
    });

    // Đính kèm staffLink và chuẩn hóa hiển thị đồng bộ
    const enrichedFollowers = followers.map((f) => {
      const staffLink = staffLinkMap[f.zaloUserId] || null;
      return {
        ...f,
        userType: staffLink ? "staff" : f.userType,
        department: staffLink ? (staffLink.department || f.department) : f.department,
        phone: staffLink ? (staffLink.phone || f.phone) : f.phone,
        staffLink,
      };
    });

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
