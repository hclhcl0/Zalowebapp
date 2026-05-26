/**
 * API: Đăng ký liên kết nhân viên ↔ Zalo ID
 * GET  /api/followers/register?uid=XXX  → Lấy thông tin follower + kiểm tra đã đăng ký chưa
 * POST /api/followers/register          → Lưu/cập nhật liên kết StaffZaloLink
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRegToken } from "@/lib/regToken";

export const dynamic = "force-dynamic";

// Chuẩn hóa tên: bỏ dấu, chữ thường, trim khoảng trắng thừa
function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+/g, " ");
}

// ── GET: lấy thông tin follower + trạng thái đăng ký ──────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const uidParam = searchParams.get("uid"); // backward compat (link cũ)

    let uid;

    if (token) {
      // ── Luồng mới: xác minh token có chữ ký ──
      const result = verifyRegToken(token);
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 401 });
      }
      uid = result.zaloUserId;
    } else if (uidParam) {
      // ── Luồng cũ: uid trực tiếp — vẫn chấp nhận để không gãy link đã gửi ──
      uid = uidParam;
    } else {
      return NextResponse.json({ error: "Thiếu token hoặc uid" }, { status: 400 });
    }

    const follower = await prisma.follower.findUnique({
      where: { zaloUserId: uid },
      select: {
        zaloUserId: true,
        displayName: true,
        avatarUrl: true,
        phone: true,
        userType: true,
        department: true,
      },
    });

    if (!follower) {
      return NextResponse.json({ error: "Không tìm thấy tài khoản Zalo này trong hệ thống" }, { status: 404 });
    }

    // Kiểm tra đã đăng ký chưa
    const existing = await prisma.staffZaloLink.findUnique({
      where: { zaloUserId: uid },
    });

    return NextResponse.json({ follower, existing: existing || null });
  } catch (err) {
    console.error("[Register GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: lưu đăng ký ─────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, uid: uidBody, staffNameRaw, department, phone } = body;

    // Ưu tiên xác minh token (luồng mới); fallback uid (luồng cũ)
    let uid;
    if (token) {
      const result = verifyRegToken(token);
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 401 });
      }
      uid = result.zaloUserId;
    } else if (uidBody) {
      uid = uidBody;
    } else {
      return NextResponse.json({ error: "Thiếu token xác thực" }, { status: 400 });
    }

    if (!staffNameRaw?.trim()) return NextResponse.json({ error: "Vui lòng nhập họ và tên" }, { status: 400 });

    // Kiểm tra follower tồn tại
    const follower = await prisma.follower.findUnique({ where: { zaloUserId: uid } });
    if (!follower) {
      return NextResponse.json({ error: "Tài khoản Zalo không hợp lệ. Vui lòng dùng link được gửi từ Zalo OA CDC." }, { status: 404 });
    }

    const staffName = normalizeName(staffNameRaw);
    if (!staffName) return NextResponse.json({ error: "Tên không hợp lệ" }, { status: 400 });

    // Chuẩn hóa SĐT của người đang đăng ký
    const cleanPhone = (p) => p ? String(p).replace(/\D/g, "").replace(/^84/, "0") : null;
    const registrantPhone = cleanPhone(phone) || cleanPhone(follower.phone);

    // Kiểm tra tên đã được dùng bởi người khác chưa
    const nameConflicts = await prisma.staffZaloLink.findMany({ where: { staffName } });
    const trueConflict = nameConflicts.find(c => {
      if (c.zaloUserId === uid) return false; // chính mình đang cập nhật lại → không phải conflict
      // Nếu có SĐT của cả 2 → so sánh SĐT để phân biệt
      const existingPhone = cleanPhone(c.phone);
      if (registrantPhone && existingPhone) {
        return registrantPhone === existingPhone; // chỉ block nếu cả tên + SĐT trùng
      }
      // Không có SĐT để phân biệt → coi là trùng, cảnh báo nhưng vẫn cho đăng ký
      return false;
    });
    if (trueConflict) {
      return NextResponse.json({
        error: `Tên "${staffNameRaw}" và số điện thoại này đã được đăng ký bởi một tài khoản Zalo khác. Nếu đây là lỗi, hãy liên hệ Phòng Kế Hoạch - Nghiệp vụ.`
      }, { status: 409 });
    }

    // Upsert vào StaffZaloLink
    const link = await prisma.staffZaloLink.upsert({
      where: { zaloUserId: uid },
      update: {
        staffNameRaw: staffNameRaw.trim(),
        staffName,
        department: department || null,
        phone: phone?.trim() || null,
      },
      create: {
        staffNameRaw: staffNameRaw.trim(),
        staffName,
        zaloUserId: uid,
        department: department || null,
        phone: phone?.trim() || null,
      },
    });

    // Cập nhật Follower: đánh dấu là nhân viên (staff)
    await prisma.follower.update({
      where: { zaloUserId: uid },
      data: {
        userType: "staff",
        ...(department && { department }),
        ...(phone?.trim() && { phone: phone.trim() }),
      },
    });

    return NextResponse.json({
      success: true,
      link,
      message: `Đã liên kết thành công: ${staffNameRaw.trim()} ↔ Zalo`,
    });
  } catch (err) {
    console.error("[Register POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
