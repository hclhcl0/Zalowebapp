/**
 * API: Xóa hoặc Cập nhật liên kết StaffZaloLink theo ID
 * DELETE /api/followers/staff-links/[id]
 * PUT    /api/followers/staff-links/[id]
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id || resolvedParams.params?.id, 10);
    if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

    // Lấy thông tin trước khi xóa để reset userType
    const link = await prisma.staffZaloLink.findUnique({ where: { id } });
    if (!link) return NextResponse.json({ error: "Không tìm thấy liên kết" }, { status: 404 });

    await prisma.staffZaloLink.delete({ where: { id } });

    // Reset userType về citizen nếu không còn link nào cho Zalo ID này
    const remaining = await prisma.staffZaloLink.findFirst({ where: { zaloUserId: link.zaloUserId } });
    if (!remaining) {
      await prisma.follower.update({
        where: { zaloUserId: link.zaloUserId },
        data: { userType: "citizen", department: null },
      }).catch(() => {}); // ignore nếu follower đã bị xóa
    }

    return NextResponse.json({ success: true, message: "Đã xóa liên kết" });
  } catch (err) {
    console.error("[Delete StaffLink]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id || resolvedParams.params?.id, 10);
    if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

    const body = await request.json();
    const { staffNameRaw, department, phone } = body;

    if (!staffNameRaw?.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập họ và tên nhân viên" }, { status: 400 });
    }

    // Lấy thông tin hiện tại
    const currentLink = await prisma.staffZaloLink.findUnique({ where: { id } });
    if (!currentLink) {
      return NextResponse.json({ error: "Không tìm thấy liên kết cần sửa" }, { status: 404 });
    }

    const staffName = normalizeName(staffNameRaw);

    // Kiểm tra trùng tên với liên kết của người khác
    if (staffName !== currentLink.staffName) {
      const conflict = await prisma.staffZaloLink.findUnique({ where: { staffName } });
      if (conflict && conflict.id !== id) {
        return NextResponse.json({
          error: `Tên "${staffNameRaw.trim()}" đã được sử dụng bởi tài khoản Zalo khác.`
        }, { status: 409 });
      }
    }

    // Cập nhật bảng StaffZaloLink
    const updatedLink = await prisma.staffZaloLink.update({
      where: { id },
      data: {
        staffNameRaw: staffNameRaw.trim(),
        staffName,
        department: department || null,
        phone: phone?.trim() || null,
      },
    });

    // Đồng bộ sang bảng Follower
    await prisma.follower.update({
      where: { zaloUserId: currentLink.zaloUserId },
      data: {
        fullName: staffNameRaw.trim(),
        userType: "staff",
        department: department || null,
        phone: phone?.trim() || null,
      },
    }).catch(() => {}); // bỏ qua nếu follower chưa tồn tại

    return NextResponse.json({
      success: true,
      data: updatedLink,
      message: "Cập nhật thông tin nhân viên thành công!"
    });
  } catch (err) {
    console.error("[Update StaffLink]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
