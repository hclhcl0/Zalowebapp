/**
 * Webhook: Nhận sự kiện từ Payload CMS khi bài viết được xuất bản
 * POST /api/webhook/article-published
 * Body: { title, slug, description, htmlContent, imageUrl, webhookSecret }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendListMessage, publishZaloArticleAndWait } from "@/lib/zalo";

export const dynamic = "force-dynamic";

// Xử lý nặng trong background (không block response)
async function processArticleSync({ title, slug, description, htmlContent, imageUrl }) {
  const cmsConfig = await prisma.systemConfig.findUnique({ where: { key: "payload_cms_url" } });
  const cmsUrl = cmsConfig?.value?.trim() || "https://ecdc.vnos.org";

  const patternConfig = await prisma.systemConfig.findUnique({ where: { key: "payload_article_url_pattern" } });
  const pattern = patternConfig?.value?.trim() || "";
  const websiteArticleUrl = pattern ? pattern.replace("{slug}", slug) : `${cmsUrl}/bai-viet/${slug}`;

  // Resolve relative image URL
  let resolvedImageUrl = imageUrl || "";
  if (resolvedImageUrl.startsWith("/")) resolvedImageUrl = `${cmsUrl}${resolvedImageUrl}`;

  // 1. Tạo Bài viết Zalo OA
  let zaloArticleUrl = null;
  let zaloArticleId = null;
  let articleCreateError = null;

  try {
    console.log(`[Webhook] Tạo bài viết Zalo OA: "${title}"`);
    const result = await publishZaloArticleAndWait({
      title,
      description: description || "",
      htmlContent: htmlContent || "",
      coverUrl: resolvedImageUrl,
      author: "CDC Đà Nẵng",
    }, 20000);
    zaloArticleUrl = result.articleUrl;
    zaloArticleId = result.articleId;
    console.log(`[Webhook] Zalo article: ${zaloArticleUrl || "no URL"}`);
  } catch (err) {
    articleCreateError = err.message;
    console.error("[Webhook] Lỗi tạo bài Zalo OA:", err.message);
  }

  const broadcastUrl = zaloArticleUrl || websiteArticleUrl;

  // 2. Broadcast đến followers
  const allFollowers = await prisma.follower.findMany({ select: { zaloUserId: true } });
  const userIds = allFollowers.map((f) => f.zaloUserId);
  let successCount = 0, failCount = 0;

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
        if (result?.error === 0) successCount++; else failCount++;
      } catch { failCount++; }
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  // 3. Lưu log
  await prisma.messageLog.create({
    data: {
      zaloUserId: "__broadcast__",
      direction: "outbound",
      type: "broadcast",
      content: `[Auto CMS] ${title}`,
      rawPayload: JSON.stringify({
        source: "payload_cms_webhook",
        slug, websiteArticleUrl, zaloArticleUrl, zaloArticleId,
        articleCreateError, total: userIds.length, successCount, failCount,
      }),
    },
  });

  console.log(`[Webhook] Done "${title}": article=${zaloArticleUrl || "N/A"}, broadcast=${successCount}/${userIds.length}`);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, slug, description, htmlContent, imageUrl, webhookSecret } = body;

    // 1. Xác thực secret
    const envSecret = process.env.ZALO_ADMIN_WEBHOOK_SECRET?.trim();
    let expectedSecret = envSecret;
    if (!expectedSecret) {
      const secretConfig = await prisma.systemConfig.findUnique({ where: { key: "payload_webhook_secret" } });
      expectedSecret = secretConfig?.value;
    }
    if (!expectedSecret || expectedSecret !== webhookSecret) {
      console.warn("[Webhook] Unauthorized: invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Validate input
    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json({ error: "Thiếu title hoặc slug" }, { status: 400 });
    }

    // 3. Xử lý nền — KHÔNG await để trả lời ngay
    processArticleSync({ title, slug, description, htmlContent, imageUrl }).catch((err) =>
      console.error("[Webhook] Background error:", err.message)
    );

    // 4. Trả lời ngay 202 để tránh timeout Cloudflare
    return NextResponse.json({ received: true, message: "Đang xử lý bài viết" }, { status: 202 });

  } catch (err) {
    console.error("[Webhook article-published Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

