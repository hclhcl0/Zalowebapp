/**
 * Webhook: Nhận sự kiện từ Payload CMS khi bài viết được xuất bản
 * POST /api/webhook/article-published
 * Body: { title, slug, description, htmlContent, imageUrl, webhookSecret }
 *
 * Payload CMS gọi endpoint này (fire-and-forget) khi admin tick
 * "Tự động gửi lên Zalo OA ngay khi xuất bản" và bấm Publish.
 *
 * Luồng:
 * 1. Xác thực webhook secret
 * 2. Tạo Bài viết trên Zalo OA (createArticleToZalo)
 * 3. Poll lấy URL bài viết
 * 4. Broadcast tin nhắn đến followers với link bài Zalo OA
 * 5. Lưu log
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendListMessage, publishZaloArticleAndWait } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, slug, description, htmlContent, imageUrl, webhookSecret } = body;

    // 1. Xác thực webhook secret
    const secretConfig = await prisma.systemConfig.findUnique({
      where: { key: "payload_webhook_secret" },
    });
    if (!secretConfig?.value || secretConfig.value !== webhookSecret) {
      console.warn("[Webhook] Unauthorized: invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate input
    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: "Thiếu thông tin bài viết (title, slug)" },
        { status: 400 }
      );
    }

    // 3. Lấy URL bài viết trên website (để fallback nếu Zalo article thất bại)
    const patternConfig = await prisma.systemConfig.findUnique({
      where: { key: "payload_article_url_pattern" },
    });
    const pattern = patternConfig?.value?.trim() || "";
    const websiteArticleUrl = pattern ? pattern.replace("{slug}", slug) : "";

    // 4. Resolve relative imageUrl nếu cần
    const cmsConfig = await prisma.systemConfig.findUnique({
      where: { key: "payload_cms_url" },
    });
    const cmsUrl = cmsConfig?.value?.trim() || "https://ecdc.vnos.org";
    let resolvedImageUrl = imageUrl || "";
    if (resolvedImageUrl.startsWith("/") && cmsUrl) {
      resolvedImageUrl = `${cmsUrl}${resolvedImageUrl}`;
    }

    // 5. Tạo Bài viết trên Zalo OA
    let zaloArticleUrl = null;
    let zaloArticleId = null;
    let articleCreateError = null;

    try {
      console.log(`[Webhook] Đang tạo bài viết Zalo OA cho: "${title}"`);
      const articleResult = await publishZaloArticleAndWait({
        title,
        description: description || "",
        htmlContent: htmlContent || "",
        coverUrl: resolvedImageUrl,
        author: "CDC Đà Nẵng",
      }, 25000); // Chờ tối đa 25 giây

      zaloArticleUrl = articleResult.articleUrl;
      zaloArticleId = articleResult.articleId;
      console.log(`[Webhook] Bài viết Zalo OA: ${zaloArticleUrl || "chưa có URL"}`);
    } catch (err) {
      articleCreateError = err.message;
      console.error("[Webhook] Tạo bài viết Zalo OA thất bại:", err.message);
    }

    // URL để gửi đến followers: ưu tiên Zalo OA article, fallback về website
    const broadcastUrl = zaloArticleUrl || websiteArticleUrl;

    // 6. Lấy tất cả followers và broadcast
    const allFollowers = await prisma.follower.findMany({
      select: { zaloUserId: true },
    });
    const userIds = allFollowers.map((f) => f.zaloUserId);

    let successCount = 0;
    let failCount = 0;

    if (userIds.length > 0 && broadcastUrl) {
      const element = {
        title: title.substring(0, 120),
        subtitle: (description || "CDC Đà Nẵng vừa đăng bài viết mới").substring(0, 120),
        imageUrl: resolvedImageUrl,
        actionType: "oa.open.url",
        actionValue: broadcastUrl,
      };

      for (const userId of userIds) {
        try {
          const result = await sendListMessage(userId, [element]);
          if (result?.error === 0) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
        // Delay tránh rate limit Zalo
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // 7. Lưu log vào DB
    await prisma.messageLog.create({
      data: {
        zaloUserId: "__broadcast__",
        direction: "outbound",
        type: "broadcast",
        content: `[Auto CMS] ${title}`,
        rawPayload: JSON.stringify({
          source: "payload_cms_webhook",
          scope: "all",
          slug,
          websiteArticleUrl,
          zaloArticleUrl,
          zaloArticleId,
          articleCreateError,
          total: userIds.length,
          successCount,
          failCount,
        }),
      },
    });

    console.log(
      `[Webhook] Hoàn thành "${title}": Zalo article=${zaloArticleUrl || "N/A"}, broadcast=${successCount}/${userIds.length}`
    );

    return NextResponse.json({
      success: true,
      zaloArticleUrl,
      zaloArticleId,
      articleCreateError,
      total: userIds.length,
      successCount,
      failCount,
    });
  } catch (err) {
    console.error("[Webhook article-published Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
