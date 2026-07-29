import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
    }

    const doc = await prisma.aiKnowledge.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ success: false, error: "Tài liệu không tồn tại" }, { status: 404 });
    }

    if (session.user.role?.includes("staff")) {
      if (doc.category !== session.user.department) {
        return NextResponse.json({ success: false, error: "Không có quyền xoá tài liệu của phòng ban khác" }, { status: 403 });
      }
    }

    await prisma.aiKnowledge.delete({
      where: { id },
    });

    try {
      const { clearKnowledgeCache } = await import("@/lib/gemini");
      clearKnowledgeCache();
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/knowledge/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
    }

    const doc = await prisma.aiKnowledge.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ success: false, error: "Tài liệu không tồn tại" }, { status: 404 });
    }

    if (session.user.role?.includes("staff")) {
      if (doc.category !== session.user.department) {
        return NextResponse.json({ success: false, error: "Không có quyền xem tài liệu của phòng ban khác" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("[GET /api/knowledge/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
    }

    const doc = await prisma.aiKnowledge.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ success: false, error: "Tài liệu không tồn tại" }, { status: 404 });
    }

    if (session.user.role?.includes("staff")) {
      if (doc.category !== session.user.department) {
        return NextResponse.json({ success: false, error: "Không có quyền sửa tài liệu của phòng ban khác" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { title, category, allowedDepartment, content } = body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    
    if (category !== undefined) {
      if (session.user.role?.includes("staff")) {
        updateData.category = session.user.department;
      } else {
        updateData.category = category;
      }
    }
    
    if (allowedDepartment !== undefined) {
      if (session.user.role?.includes("staff")) {
        updateData.allowedDepartment = session.user.department;
      } else {
        updateData.allowedDepartment = (allowedDepartment === "ALL" || allowedDepartment === "all" || allowedDepartment === "") ? null : allowedDepartment;
      }
    }

    if (content !== undefined) updateData.content = content.trim();

    const updatedDoc = await prisma.aiKnowledge.update({
      where: { id },
      data: updateData,
    });

    try {
      const { clearKnowledgeCache } = await import("@/lib/gemini");
      clearKnowledgeCache();
    } catch (e) {}

    return NextResponse.json({ success: true, data: updatedDoc });
  } catch (error) {
    console.error("[PUT /api/knowledge/[id]] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
