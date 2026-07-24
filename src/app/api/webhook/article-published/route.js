/**
 * Webhook: Nhận sự kiện từ Payload CMS khi bài viết được xuất bản
 * POST /api/webhook/article-published
 * Body: { title, slug, description, htmlContent, imageUrl, webhookSecret }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendListMessage, publishZaloArticleAndWait, uploadImageToZalo } from "@/lib/zalo";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// Convert WebP → JPG và lưu vào /uploads, trả về URL công khai
async function convertWebpToJpg(webpUrl, baseUrl) {
  try {
    const res = await fetch(webpUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const jpgBuffer = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `cover_${Date.now()}.jpg`;
    fs.writeFileSync(path.join(uploadDir, filename), jpgBuffer);
    console.log(`[Webhook] Converted WebP to JPG: /uploads/${filename}`);
    return `${baseUrl}/uploads/${filename}`;
  } catch (e) {
    console.warn("[Webhook] WebP convert thất bại:", e.message);
    return null;
  }
}


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
  console.log(`[Webhook] imageUrl nhận được: "${imageUrl}" → resolved: "${resolvedImageUrl}"`);

  // Nếu không có imageUrl → tự tìm ảnh từ CMS API
  if (!resolvedImageUrl && slug) {
    try {
      const cmsApiUrl = `${cmsUrl}/api/articles?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1`;
      const cmsRes = await fetch(cmsApiUrl);
      if (cmsRes.ok) {
        const cmsData = await cmsRes.json();
        const article = cmsData?.docs?.[0];
        // Ưu tiên: image field → thumbnailURL → url
        const imgField = article?.image;
        if (imgField?.thumbnailURL) {
          resolvedImageUrl = imgField.thumbnailURL;
        } else if (imgField?.url) {
          resolvedImageUrl = imgField.url;
        }
        console.log(`[Webhook] Tự tìm ảnh từ CMS: "${resolvedImageUrl}"`);
      }
    } catch (cmsErr) {
      console.warn("[Webhook] Không lấy được ảnh từ CMS:", cmsErr.message);
    }
  }

  // Upload ảnh lên Zalo Media Store để đảm bảo Zalo tải được
  // (CMS media URL là nội bộ, Zalo server không truy cập trực tiếp được)
  let coverAttachmentId = null;
  if (resolvedImageUrl) {
    try {
      console.log(`[Webhook] Đang upload ảnh lên Zalo: ${resolvedImageUrl}`);
      const uploaded = await uploadImageToZalo(resolvedImageUrl);
      coverAttachmentId = uploaded.imageId; // Dùng attachment_id cho cover
      console.log(`[Webhook] Upload ảnh Zalo OK: attachment_id=${coverAttachmentId}`);
    } catch (uploadErr) {
      console.warn(`[Webhook] Upload ảnh lên Zalo thất bại: ${uploadErr.message} — dùng URL gốc`);
    }
  }

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
      coverAttachmentId, // Ưu tiên dùng attachment_id nếu upload thành công
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
  // Nếu có BROADCAST_TEST_ZALO_ID → chỉ gửi cho 1 người đó (chế độ test)
  const testZaloId = process.env.BROADCAST_TEST_ZALO_ID?.trim();
  const allFollowers = await prisma.follower.findMany({ select: { zaloUserId: true } });
  const allUserIds = allFollowers.map((f) => f.zaloUserId);
  const userIds = testZaloId ? [testZaloId] : allUserIds;

  if (testZaloId) {
    console.log(`[Webhook] CHẾ ĐỘ TEST — chỉ gửi cho 1 người: ${testZaloId}`);
  }

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

