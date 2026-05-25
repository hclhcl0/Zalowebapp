import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/followers/patient-register?uid=...
// Trả về thông tin follower hiện tại
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Thiếu UID" }, { status: 400 });
    }

    // Tìm trong bảng Follower (không qua StaffZaloLink)
    const follower = await prisma.follower.findUnique({
      where: { zaloUserId: uid },
    });

    if (!follower) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // Kiểm tra xem có đang là Staff không
    const staffLink = await prisma.staffZaloLink.findUnique({
      where: { zaloUserId: uid }
    });

    // Nếu đã có thông tin fullName, tức là đã đăng ký rồi
    const existing = follower.fullName ? {
      fullName: follower.fullName,
      dob: follower.dob || "",
      cccd: follower.cccd || "",
      phone: follower.phone || "",
    } : null;

    return NextResponse.json({
      follower: {
        zaloUserId: follower.zaloUserId,
        displayName: follower.displayName,
        avatarUrl: follower.avatarUrl,
        userType: staffLink ? "staff" : follower.userType,
      },
      existing
    });
  } catch (error) {
    console.error("Lỗi GET /api/followers/patient-register:", error);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

// POST /api/followers/patient-register
// Lưu thông tin khách hàng (bệnh nhân)
export async function POST(request) {
  try {
    const body = await request.json();
    const { uid, fullName, dob, cccd, phone } = body;

    if (!uid || !fullName || !phone) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const follower = await prisma.follower.findUnique({
      where: { zaloUserId: uid },
    });

    if (!follower) {
      return NextResponse.json({ error: "Người dùng Zalo chưa quan tâm OA" }, { status: 404 });
    }

    // [BẢO VỆ] Kiểm tra xem có đang là Staff không
    const isStaff = await prisma.staffZaloLink.findUnique({
      where: { zaloUserId: uid }
    });
    if (isStaff) {
      return NextResponse.json({ error: "Tài khoản của bạn đang là Nhân viên CDC. Không thể đăng ký làm Khách hàng." }, { status: 400 });
    }

    // Cập nhật thông tin bệnh nhân trực tiếp vào bảng Follower
    // Có thể đổi userType thành 'citizen' để đảm bảo đúng phân loại
    await prisma.follower.update({
      where: { zaloUserId: uid },
      data: {
        fullName: fullName.trim(),
        dob: dob ? dob.trim() : null,
        cccd: cccd ? cccd.trim() : null,
        phone: phone.trim(),
        userType: "citizen", 
      }
    });

    return NextResponse.json({ success: true, message: "Lưu thông tin thành công" });
  } catch (error) {
    console.error("Lỗi POST /api/followers/patient-register:", error);
    return NextResponse.json({ error: "Lỗi máy chủ khi lưu dữ liệu" }, { status: 500 });
  }
}
