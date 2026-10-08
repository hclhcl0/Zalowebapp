/**
 * API: Gởi tin Zalo đa năng (nhân viên + khách hàng)
 * POST /api/send-zalo
 * Body: { scope, userIds, title, content, url, imageUrls[], videoUrls[], fileAttachments[], listElements[] }
 * scope: 'all_staff' | 'list_staff' | 'all_citizen' | 'list_citizen' | 'all' | 'list'
 *
 * Nhật ký: Mỗi lần gởi lưu 1 BroadcastLog với đầy đủ thông tin:
 *   - Ai gởi (sentBy, sentByName)
 *   - Phạm vi (scope)
 *   - Nội dung đầy đủ (title, content, attachments)
 *   - Kết quả: successCount, failCount
 *   - Chi tiết lỗi: failedUsers [{ userId, displayName, errorCode, reason }]
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { canSendInternal, canBroadcast } from '@/lib/roles';
import { sendTextMessage, sendImageToUser, sendFileAsLink, sendVideoLink, sendListMessage } from '@/lib/zalo';

export const dynamic = 'force-dynamic';

// ─── Zalo error code → mô tả tiếng Việt ─────────────────────
const ZALO_ERROR_MAP = {
  '-201': 'Người dùng chưa quan tâm hoặc đã hủy theo dõi OA',
  '-204': 'Người dùng đã chặn tin nhắn từ OA',
  '-213': 'OA chưa được cấp quyền thực hiện tính năng này',
  '-214': 'Ứng dụng chưa được liên kết với Zalo OA',
  '-216': 'Access Token hết hạn',
  '-218': 'Vượt quá hạn mức (quota) gởi tin trong ngày',
  '-221': 'Người dùng không tương tác với OA quá 7 ngày',
  '-107': 'Tham số tin nhắn không hợp lệ',
  '-108': 'Zalo User ID không hợp lệ',
  '-2':   'Zalo User ID không tồn tại',
  '-42':  'Vượt quota gởi tin trong ngày',
  '-4':   'Tin nhắn bị từ chối (nội dung vi phạm chính sách Zalo)',
  '-1':   'Lỗi hệ thống Zalo (thử lại sau)',
  '-1000':'Lỗi kết nối mạng hoặc timeout',
};


function describeZaloError(errorCode, originalMessage) {
  const code = String(errorCode);
  return ZALO_ERROR_MAP[code] || originalMessage || `Lỗi không xác định (code: ${code})`;
}

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
      messageType = 'text',
      title = '',
      content = '',
      url = '',
      imageUrls = [],
      videoUrls = [],
      fileAttachments = [],
      listElements = [],
      delay = 300,
    } = body;

    const hasAttachments = imageUrls.length > 0 || videoUrls.length > 0 || fileAttachments.length > 0;
    if (messageType === 'text' && !content?.trim() && !hasAttachments) {
      return NextResponse.json({ error: 'Nội dung tin nhắn và đính kèm không được cùng trống' }, { status: 400 });
    }
    if (messageType === 'list' && (!listElements || listElements.length === 0)) {
      return NextResponse.json({ error: 'Danh sách Carousel không được để trống' }, { status: 400 });
    }

    // ── Xác định danh sách ZaloUserID (kèm displayName để ghi log lỗi) ──
    let targetUsers = []; // [{ zaloUserId, displayName }]

    if (scope === 'all_staff' || scope === 'list_staff') {
      const allStaffLinks = await prisma.staffZaloLink.findMany({ select: { zaloUserId: true } });
      const staffZaloIds = allStaffLinks.map(l => l.zaloUserId);
      if (scope === 'all_staff') {
        const staffFollowers = await prisma.follower.findMany({
          where: { OR: [{ userType: 'staff' }, { zaloUserId: { in: staffZaloIds } }] },
          select: { zaloUserId: true, displayName: true, fullName: true },
        });
        targetUsers = staffFollowers.map(f => ({ zaloUserId: f.zaloUserId, displayName: f.fullName || f.displayName || f.zaloUserId }));
      } else {
        const picked = await prisma.follower.findMany({
          where: { zaloUserId: { in: userIds } },
          select: { zaloUserId: true, displayName: true, fullName: true },
        });
        const found = new Map(picked.map(f => [f.zaloUserId, f]));
        targetUsers = userIds.map(id => ({ zaloUserId: id, displayName: found.get(id)?.fullName || found.get(id)?.displayName || id }));
      }
    } else if (scope === 'all_citizen' || scope === 'list_citizen') {
      if (scope === 'all_citizen') {
        const allStaffLinks = await prisma.staffZaloLink.findMany({ select: { zaloUserId: true } });
        const staffZaloIds = allStaffLinks.map(l => l.zaloUserId);
        const citizens = await prisma.follower.findMany({
          where: { userType: 'citizen', NOT: { zaloUserId: { in: staffZaloIds } } },
          select: { zaloUserId: true, displayName: true, fullName: true },
        });
        targetUsers = citizens.map(f => ({ zaloUserId: f.zaloUserId, displayName: f.fullName || f.displayName || f.zaloUserId }));
      } else {
        const picked = await prisma.follower.findMany({
          where: { zaloUserId: { in: userIds } },
          select: { zaloUserId: true, displayName: true, fullName: true },
        });
        const found = new Map(picked.map(f => [f.zaloUserId, f]));
        targetUsers = userIds.map(id => ({ zaloUserId: id, displayName: found.get(id)?.fullName || found.get(id)?.displayName || id }));
      }
    } else if (scope === 'all') {
      const all = await prisma.follower.findMany({ select: { zaloUserId: true, displayName: true, fullName: true } });
      targetUsers = all.map(f => ({ zaloUserId: f.zaloUserId, displayName: f.fullName || f.displayName || f.zaloUserId }));
    } else if (scope === 'list') {
      const picked = await prisma.follower.findMany({
        where: { zaloUserId: { in: userIds } },
        select: { zaloUserId: true, displayName: true, fullName: true },
      });
      const found = new Map(picked.map(f => [f.zaloUserId, f]));
      targetUsers = userIds.map(id => ({ zaloUserId: id, displayName: found.get(id)?.fullName || found.get(id)?.displayName || id }));
    } else {
      return NextResponse.json({ error: 'Phạm vi gởi không hợp lệ' }, { status: 400 });
    }

    // Loại trùng
    const seen = new Set();
    targetUsers = targetUsers.filter(u => { if (seen.has(u.zaloUserId)) return false; seen.add(u.zaloUserId); return true; });

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: 'Không có người nhận nào. Kiểm tra lại danh sách.' }, { status: 400 });
    }

    // ── Gởi tin ──
    let successCount = 0;
    let failCount = 0;
    const failedUsers = []; // chi tiết lỗi từng người

    // Xây dựng nội dung văn bản chính
    let mainText = content ? (title ? `${title.toUpperCase()}\n\n${content}` : content) : '';
    if (mainText && url) mainText += `\n\n🔗 Xem thêm: ${url}`;
    else if (!mainText && url) mainText = `🔗 Xem thêm: ${url}`;

    for (const user of targetUsers) {
      const { zaloUserId: userId, displayName } = user;
      try {
        if (messageType === 'list') {
          const res = await sendListMessage(userId, listElements);
          if (res.error !== 0) {
            throw Object.assign(new Error(res.message || 'Lỗi gởi Carousel'), { code: res.error });
          }
        } else {
          if (mainText) {
            const textRes = await sendTextMessage(userId, mainText);
            if (textRes.error && textRes.error !== 0) {
              throw Object.assign(new Error(textRes.message || 'Lỗi gởi text'), { code: textRes.error });
            }
          }
          for (const imgUrl of imageUrls) {
            if (imgUrl) {
              const absUrl = imgUrl.startsWith('/') ? `${process.env.NEXTAUTH_URL || 'https://zcdc.ksbtdanang.vn'}${imgUrl}` : imgUrl;
              await sendImageToUser(userId, absUrl);
              await new Promise(r => setTimeout(r, 200));
            }
          }
          for (const vid of videoUrls) {
            if (vid?.url) {
              const absUrl = vid.url.startsWith('/') ? `${process.env.NEXTAUTH_URL || 'https://zcdc.ksbtdanang.vn'}${vid.url}` : vid.url;
              await sendVideoLink(userId, vid.name || 'Video', absUrl);
              await new Promise(r => setTimeout(r, 200));
            }
          }
          for (const file of fileAttachments) {
            if (file?.url) {
              const absUrl = file.url.startsWith('/') ? `${process.env.NEXTAUTH_URL || 'https://zcdc.ksbtdanang.vn'}${file.url}` : file.url;
              await sendFileAsLink(userId, file.name || 'Tài liệu', absUrl);
              await new Promise(r => setTimeout(r, 200));
            }
          }
        }
        successCount++;
      } catch (err) {
        failCount++;
        failedUsers.push({
          userId,
          displayName,
          errorCode: err.code ?? null,
          reason: describeZaloError(err.code, err.message),
        });
      }
      await new Promise(r => setTimeout(r, delay));
    }

    // ── Ghi BroadcastLog (1 bản ghi cho cả lần gởi) ──
    try {
      await prisma.broadcastLog.create({
        data: {
          sentBy:       session.user.email || session.user.name || 'unknown',
          sentByName:   session.user.fullName || session.user.name || session.user.email || 'Quản trị viên',
          scope,
          messageType,
          title:        title || null,
          content:      mainText || null,
          attachments:  JSON.stringify({ imageUrls, videoUrls, fileAttachments, listElements }),
          totalTargets: targetUsers.length,
          successCount,
          failCount,
          failedUsers:  failedUsers.length > 0 ? JSON.stringify(failedUsers) : null,
        },
      });
    } catch (logErr) {
      console.error('[BroadcastLog] Lỗi ghi nhật ký:', logErr.message);
    }

    return NextResponse.json({
      success: true,
      total: targetUsers.length,
      successCount,
      failCount,
      errors: failedUsers.slice(0, 10), // trả về tối đa 10 lỗi đầu cho UI
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
  const limit  = parseInt(searchParams.get('limit') || '50', 10);
  const page   = parseInt(searchParams.get('page')  || '1',  10);
  const sentBy = searchParams.get('sentBy') || '';

  try {
    const where = sentBy ? { sentBy } : {};
    const [total, logs] = await Promise.all([
      prisma.broadcastLog.count({ where }),
      prisma.broadcastLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return NextResponse.json({ data: logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    // Fallback: nếu bảng BroadcastLog chưa tồn tại, trả về mảng rỗng
    console.error('[send-zalo GET]', err.message);
    return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
  }
}
