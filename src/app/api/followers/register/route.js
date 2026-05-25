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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
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

    // Kiểm tra tên đã được dùng bởi người khác chưa
    const nameConflict = await prisma.staffZaloLink.findUnique({ where: { staffName } });
    if (nameConflict && nameConflict.zaloUserId !== uid) {
      return NextResponse.json({
        error: `Tên "${staffNameRaw}" đã được đăng ký bởi một tài khoản Zalo khác. Nếu đây là lỗi, hãy liên hệ Phòng Kế Hoạch - Nghiệp vụ.`
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
    // Lỗi unique constraint (tên trùng)
    if (err.code === "P2002") {
      return NextResponse.json({
        error: "Tên này đã được đăng ký. Mỗi tên chỉ được liên kết với 1 tài khoản Zalo."
      }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
