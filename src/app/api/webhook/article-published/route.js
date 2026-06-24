/**
 * Webhook: Nhận sự kiện từ Payload CMS khi bài viết được xuất bản
 * POST /api/webhook/article-published
 * Body: { title, slug, description, imageUrl, webhookSecret }
 * 
 * Payload CMS gọi endpoint này (fire-and-forget) khi admin tick
 * "Tự động gửi lên Zalo OA ngay khi xuất bản" và bấm Publish.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendListMessage } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, slug, description, imageUrl, webhookSecret } = body;

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

    // 3. Lấy URL mẫu bài viết từ settings (VD: https://cdc.danang.gov.vn/bai-viet/{slug})
    const patternConfig = await prisma.systemConfig.findUnique({
      where: { key: "payload_article_url_pattern" },
    });
    const pattern = patternConfig?.value?.trim() || "";
    const articleUrl = pattern ? pattern.replace("{slug}", slug) : "";

    // 4. Lấy host để resolve relative imageUrl nếu cần
    const cmsConfig = await prisma.systemConfig.findUnique({
      where: { key: "payload_cms_url" },
    });
    const cmsUrl = cmsConfig?.value?.trim() || "";
    let resolvedImageUrl = imageUrl || "";
    if (resolvedImageUrl.startsWith("/") && cmsUrl) {
      resolvedImageUrl = `${cmsUrl}${resolvedImageUrl}`;
    }

    // 5. Lấy tất cả followers
    const allFollowers = await prisma.follower.findMany({
      select: { zaloUserId: true },
    });
    const userIds = allFollowers.map((f) => f.zaloUserId);

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        note: "Không có người quan tâm nào, bỏ qua broadcast.",
        total: 0,
      });
    }

    // 6. Gửi Zalo Broadcast (tin nhắn danh sách, 1 thẻ)
    const element = {
      title: title.substring(0, 120),
      subtitle: (description || title).substring(0, 120),
      imageUrl: resolvedImageUrl,
      actionType: "oa.open.url",
      actionValue: articleUrl,
    };

    let successCount = 0;
    let failCount = 0;

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
          articleUrl,
          total: userIds.length,
          successCount,
          failCount,
        }),
      },
    });

    console.log(`[Webhook] Auto broadcast "${title}": ${successCount}/${userIds.length} thành công`);

    return NextResponse.json({
      success: true,
      total: userIds.length,
      successCount,
      failCount,
    });
  } catch (err) {
    console.error("[Webhook article-published Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
