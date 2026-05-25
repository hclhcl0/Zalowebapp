/**
 * API: Chi tiết & Cập nhật người quan tâm Zalo
 * GET    /api/followers/[id] → Lấy chi tiết follower
 * PUT    /api/followers/[id] → Cập nhật số điện thoại / ghi chú của follower
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const follower = await prisma.follower.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { appointedAt: "desc" } },
        testResults: { orderBy: { testedAt: "desc" } },
      },
    });

    if (!follower) {
      return NextResponse.json({ error: "Không tìm thấy người quan tâm" }, { status: 404 });
    }

    // Lấy thêm thông tin cập nhật mới nhất từ Zalo API (nếu có thể)
    let freshProfile = null;
    try {
      freshProfile = await getUserProfile(follower.zaloUserId);
    } catch (e) {
      console.warn("Could not fetch fresh profile from Zalo API:", e.message);
    }

    // Kiểm tra xem có đang là Staff không
    const staffLink = await prisma.staffZaloLink.findUnique({
      where: { zaloUserId: follower.zaloUserId }
    });

    // Self-healing: Nếu có liên kết nhân viên nhưng phân loại trong bảng Follower chưa cập nhật
    if (staffLink && follower.userType !== "staff") {
      await prisma.follower.update({
        where: { id },
        data: {
          userType: "staff",
          department: staffLink.department || follower.department,
          phone: staffLink.phone || follower.phone,
        }
      }).catch(e => console.error("[Self-Healing Detail Error]", e));
      follower.userType = "staff";
      follower.department = staffLink.department || follower.department;
      follower.phone = staffLink.phone || follower.phone;
    }

    return NextResponse.json({
      data: {
        ...follower,
        staffLink: staffLink || null,
        zaloProfile: freshProfile?.data || null,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    const { phone, displayName, userType, department, notes, fullName, dob, cccd } = body;

    const follower = await prisma.follower.update({
      where: { id },
      data: {
        ...(phone !== undefined && { phone }),
        ...(displayName !== undefined && { displayName }),
        ...(userType !== undefined && { userType }),
        ...(department !== undefined && { department: department === "" ? null : department }),
        ...(notes !== undefined && { notes: notes === "" ? null : notes }),
        ...(fullName !== undefined && { fullName: fullName === "" ? null : fullName }),
        ...(dob !== undefined && { dob: dob === "" ? null : dob }),
        ...(cccd !== undefined && { cccd: cccd === "" ? null : cccd }),
      },
    });

    return NextResponse.json({ data: follower });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
