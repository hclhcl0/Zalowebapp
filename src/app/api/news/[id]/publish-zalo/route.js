import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createArticleToZalo } from "@/lib/zalo";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Chỉ quản trị viên mới được xuất bản lên Zalo OA" }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    
    // 1. Fetch the article from the database
    const article = await prisma.newsArticle.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json({ error: "Bài viết không tồn tại" }, { status: 404 });
    }

    // 2. Validation
    if (!article.coverUrl) {
      return NextResponse.json({ error: "Bài viết chưa có Ảnh bìa (Cover URL). Vui lòng cập nhật Ảnh bìa trước khi đăng lên Zalo." }, { status: 400 });
    }

    // Chuyển đường dẫn ảnh bìa tương đối thành tuyệt đối nếu cần
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;
    
    let coverUrl = article.coverUrl || "";
    if (coverUrl.startsWith("/")) {
      coverUrl = `${baseUrl}${coverUrl}`;
    }

    // 3. Publish to Zalo OA Media Store
    const zaloResult = await createArticleToZalo({
      title: article.title,
      content: article.content,
      summary: article.summary,
      coverUrl: coverUrl,
      author: article.author
    });

    // 4. Update the article with Zalo Article ID (token in this case representing the article creation process)
    const updatedArticle = await prisma.newsArticle.update({
      where: { id },
      data: {
        zaloArticleId: zaloResult.token || "published", // Some Zalo endpoints return 'token', others might return 'article_id'
        isPublished: true, // Auto publish on our site as well
        publishedAt: article.publishedAt ? article.publishedAt : new Date()
      }
    });

    return NextResponse.json({ 
      message: "Đăng lên Zalo OA thành công", 
      data: updatedArticle,
      zaloResponse: zaloResult 
    });

  } catch (err) {
    console.error("Lỗi khi đăng Zalo Article:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
