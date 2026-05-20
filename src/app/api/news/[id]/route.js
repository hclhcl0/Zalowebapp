/**
 * API: Chi tiết Tin tức & Cảnh báo (GET, PUT, DELETE)
 * GET    /api/news/[id] → Chi tiết bài viết
 * PUT    /api/news/[id] → Cập nhật bài viết
 * DELETE /api/news/[id] → Xóa bài viết
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendPromotionMessage } from "@/lib/zalo";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const article = await prisma.newsArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json({ error: "Bài viết không tồn tại" }, { status: 404 });
    }

    return NextResponse.json({ data: article });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    const body = await request.json();
    const { title, content, category, isPublished, broadcastNow, coverUrl, summary } = body;

    const existingArticle = await prisma.newsArticle.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return NextResponse.json({ error: "Bài viết không tồn tại" }, { status: 404 });
    }

    // Kiểm tra quyền: Chỉ admin mới được thay đổi trạng thái Publish hoặc gửi Broadcast
    const isStaff = session.user.role === "staff";
    let targetPublish = existingArticle.isPublished;
    
    if (isPublished !== undefined) {
      if (isStaff && isPublished !== existingArticle.isPublished) {
        return NextResponse.json({ error: "Nhân viên không có quyền xuất bản bài viết" }, { status: 403 });
      }
      targetPublish = isPublished;
    }

    if (broadcastNow && isStaff) {
      return NextResponse.json({ error: "Nhân viên không có quyền gửi broadcast Zalo" }, { status: 403 });
    }

    const article = await prisma.newsArticle.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(summary !== undefined && { summary }),
        isPublished: targetPublish,
        publishedAt: targetPublish && !existingArticle.isPublished ? new Date() : existingArticle.publishedAt,
      },

    });

    if (broadcastNow) {
      const allFollowers = await prisma.follower.findMany({ select: { zaloUserId: true } });
      for (const f of allFollowers) {
        await sendPromotionMessage(f.zaloUserId, article.title, article.content.substring(0, 300));
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return NextResponse.json({ data: article });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // Chỉ Admin mới được xóa bài viết
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới được xóa bài viết" }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    await prisma.newsArticle.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Xóa thành công" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
