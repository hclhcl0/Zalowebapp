/**
 * API: Xóa liên kết StaffZaloLink theo ID
 * DELETE /api/followers/staff-links/[id]
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    if (!id) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });

    // Lấy thông tin trước khi xóa để reset userType
    const link = await prisma.staffZaloLink.findUnique({ where: { id } });
    if (!link) return NextResponse.json({ error: "Không tìm thấy liên kết" }, { status: 404 });

    await prisma.staffZaloLink.delete({ where: { id } });

    // Optional: reset userType về citizen nếu không còn link nào
    const remaining = await prisma.staffZaloLink.findUnique({ where: { zaloUserId: link.zaloUserId } });
    if (!remaining) {
      await prisma.follower.update({
        where: { zaloUserId: link.zaloUserId },
        data: { userType: "citizen" },
      }).catch(() => {}); // ignore nếu follower đã bị xóa
    }

    return NextResponse.json({ success: true, message: "Đã xóa liên kết" });
  } catch (err) {
    console.error("[Delete StaffLink]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
