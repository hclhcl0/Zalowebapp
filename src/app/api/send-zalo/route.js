/**
 * API: Gới tin Zalo đa năng (nhân viên + khách hàng)
 * POST /api/send-zalo
 * Body: { scope, userIds, title, content, url, imageUrls[], videoUrls[], fileAttachments[] }
 * scope: 'all_staff' | 'list_staff' | 'all_citizen' | 'list_citizen' | 'all' | 'list'
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { canSendInternal, canBroadcast } from '@/lib/roles';
import { sendTextMessage, sendImageToUser, sendFileAsLink, sendVideoLink } from '@/lib/zalo';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  if (!canSendInternal(session.user.role) && !canBroadcast(session.user.role)) {
    return NextResponse.json({ error: 'Không có quyền gởi tin' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      scope = 'all_staff',
      userIds = [],
      title = '',
      content = '',
      url = '',
      imageUrls = [],    // string[]
      videoUrls = [],    // [{ name, url }]
      fileAttachments = [], // [{ name, url }]
      delay = 300,       // ms giữa mỗi lần gởi
    } = body;

    const hasAttachments = imageUrls.length > 0 || videoUrls.length > 0 || fileAttachments.length > 0;
    if (!content?.trim() && !hasAttachments) {
      return NextResponse.json({ error: 'Nội dung tin nhắn và đính kèm không được cùng trống' }, { status: 400 });
    }

    // ── Xác định danh sách ZaloUserID ──
    let targetUserIds = [];

    if (scope === 'all_staff' || scope === 'list_staff') {
      const allStaffLinks = await prisma.staffZaloLink.findMany({ select: { zaloUserId: true } });
      const staffZaloIds = allStaffLinks.map(l => l.zaloUserId);
      if (scope === 'all_staff') {
        const staffFollowers = await prisma.follower.findMany({
          where: { OR: [{ userType: 'staff' }, { zaloUserId: { in: staffZaloIds } }] },
          select: { zaloUserId: true },
        });
        targetUserIds = staffFollowers.map(f => f.zaloUserId);
      } else {
        targetUserIds = userIds.filter(id => staffZaloIds.includes(id) || true); // list đã chọn sẵn
        targetUserIds = userIds;
      }
    } else if (scope === 'all_citizen' || scope === 'list_citizen') {
      if (scope === 'all_citizen') {
        const allStaffLinks = await prisma.staffZaloLink.findMany({ select: { zaloUserId: true } });
        const staffZaloIds = allStaffLinks.map(l => l.zaloUserId);
        const citizens = await prisma.follower.findMany({
          where: { userType: 'citizen', NOT: { zaloUserId: { in: staffZaloIds } } },
          select: { zaloUserId: true },
        });
        targetUserIds = citizens.map(f => f.zaloUserId);
      } else {
        targetUserIds = userIds;
      }
    } else if (scope === 'all') {
      const all = await prisma.follower.findMany({ select: { zaloUserId: true } });
      targetUserIds = all.map(f => f.zaloUserId);
    } else if (scope === 'list') {
      targetUserIds = userIds;
    } else {
      return NextResponse.json({ error: 'Phạm vi gởi không hợp lệ' }, { status: 400 });
    }

    // Loại trùng
    targetUserIds = [...new Set(targetUserIds)];

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: 'Không có người nhận nào. Kiểm tra lại danh sích.' }, { status: 400 });
    }

    // ── GỜi tin ──
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Xây dựng nội dung tin nhắn
    let mainText = content ? (title ? `${title.toUpperCase()}\n\n${content}` : content) : '';
    if (mainText && url) mainText += `\n\n🔗 Xem thêm: ${url}`;
    else if (!mainText && url) mainText = `🔗 Xem thêm: ${url}`;

    for (const userId of targetUserIds) {
      try {
        // 1. GỜi tin văn bản chính (nếu có nội dung)
        if (mainText) {
          const textRes = await sendTextMessage(userId, mainText);
          if (textRes.error && textRes.error !== 0) throw new Error(textRes.message || 'Lỗi gởi text');
        }

        // 2. GỜi từng ảnh kèm theo
        for (const imgUrl of imageUrls) {
          if (imgUrl) {
            const absUrl = imgUrl.startsWith('/') ? `${process.env.NEXTAUTH_URL || 'https://zcdc.ksbtdanang.vn'}${imgUrl}` : imgUrl;
            await sendImageToUser(userId, absUrl);
            await new Promise(r => setTimeout(r, 200));
          }
        }

        // 3. GỜi video (dưới dạng link)
        for (const vid of videoUrls) {
          if (vid?.url) {
            const absUrl = vid.url.startsWith('/') ? `${process.env.NEXTAUTH_URL || 'https://zcdc.ksbtdanang.vn'}${vid.url}` : vid.url;
            await sendVideoLink(userId, vid.name || 'Video', absUrl);
            await new Promise(r => setTimeout(r, 200));
          }
        }

        // 4. GỜi file (dưới dạng link)
        for (const file of fileAttachments) {
          if (file?.url) {
            const absUrl = file.url.startsWith('/') ? `${process.env.NEXTAUTH_URL || 'https://zcdc.ksbtdanang.vn'}${file.url}` : file.url;
            await sendFileAsLink(userId, file.name || 'Tài liệu', absUrl);
            await new Promise(r => setTimeout(r, 200));
          }
        }

        successCount++;

        // Ghi log
        await prisma.messageLog.create({
          data: {
            zaloUserId: userId,
            direction: 'outbound',
            type: 'send_zalo',
            content: mainText.substring(0, 200),
            rawPayload: JSON.stringify({ scope, imageUrls, videoUrls, fileAttachments }),
            receivedAt: new Date(),
          },
        }).catch(() => {});

      } catch (err) {
        failCount++;
        if (errors.length < 5) errors.push({ userId, error: err.message });
      }

      // Delay giữa các lần gởi
      await new Promise(r => setTimeout(r, delay));
    }

    return NextResponse.json({
      success: true,
      total: targetUserIds.length,
      successCount,
      failCount,
      errors,
    });
  } catch (err) {
    console.error('[send-zalo API]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  try {
    const logs = await prisma.messageLog.findMany({
      where: { direction: 'outbound', type: 'send_zalo' },
      orderBy: { receivedAt: 'desc' },
      take: limit,
    });
    return NextResponse.json({ data: logs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
