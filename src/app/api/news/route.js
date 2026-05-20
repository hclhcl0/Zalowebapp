/**
 * API: Quản lý Tin tức & Cảnh báo
 * GET  /api/news         → Lấy danh sách (lọc theo category)
 * POST /api/news         → Tạo bài mới (phân quyền nháp/xuất bản)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { sendPromotionMessage } from "@/lib/zalo";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const articles = await prisma.newsArticle.findMany({
      where: { ...(category && { category }) },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: articles });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category, publish, broadcastNow, coverUrl, summary } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    const isStaff = session.user.role === "staff";
    
    // Phân quyền: Nhân viên không thể trực tiếp Publish hoặc Broadcast ngay lập tức
    if (isStaff && (publish || broadcastNow)) {
      return NextResponse.json(
        { error: "Nhân viên chỉ có thể lưu nháp, không có quyền xuất bản hoặc gửi broadcast" },
        { status: 403 }
      );
    }

    const article = await prisma.newsArticle.create({
      data: {
        title,
        content,
        category,
        coverUrl,
        summary,
        isPublished: !isStaff && !!publish,
        publishedAt: (!isStaff && publish) ? new Date() : null,
      },
    });

    // Nếu là admin và chọn "Broadcast ngay" - gửi đến tất cả người quan tâm
    if (!isStaff && broadcastNow) {
      const { prisma: db } = await import("@/lib/prisma");
      const allFollowers = await db.follower.findMany({ select: { zaloUserId: true } });
      for (const f of allFollowers) {
        await sendPromotionMessage(f.zaloUserId, title, content.substring(0, 300));
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return NextResponse.json({ data: article }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
