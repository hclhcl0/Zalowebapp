/**
 * API: Gửi tin nhắn Zalo Nội Bộ cho Cán bộ Nhân viên
 * POST /api/salary-email/send-zalo
 * GET  /api/salary-email/send-zalo
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPromotionMessage, sendListMessage } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { scope, userIds, title, content, url = "", messageType = "text", elements = [] } = body;

    // Validate inputs
    if (messageType === "text") {
      if (!title?.trim() || !content?.trim()) {
        return NextResponse.json({ error: "Tiêu đề và nội dung không được để trống" }, { status: 400 });
      }
    } else if (messageType === "list") {
      if (!Array.isArray(elements) || elements.length === 0) {
        return NextResponse.json({ error: "Tin nhắn danh sách phải có ít nhất 1 thẻ" }, { status: 400 });
      }
      for (const el of elements) {
        if (!el.title?.trim() || !el.imageUrl?.trim()) {
          return NextResponse.json({ error: "Tiêu đề và hình ảnh của mỗi thẻ không được để trống" }, { status: 400 });
        }
      }
    } else {
      return NextResponse.json({ error: "Loại tin nhắn không hỗ trợ" }, { status: 400 });
    }

    // Lấy danh sách Zalo User ID cần gửi (chỉ nhân viên cơ quan)
    let targetUserIds = [];

    if (scope === "all_staff") {
      const allStaffLinks = await prisma.staffZaloLink.findMany({
        select: { zaloUserId: true }
      });
      const staffZaloUserIds = allStaffLinks.map((link) => link.zaloUserId);

      const staffFollowers = await prisma.follower.findMany({
        where: {
          OR: [
            { userType: "staff" },
            { zaloUserId: { in: staffZaloUserIds } }
          ]
        },
        select: { zaloUserId: true },
      });
      targetUserIds = staffFollowers.map((f) => f.zaloUserId);
    } else if (scope === "list_staff" && Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      return NextResponse.json({ error: "Phạm vi gửi không hợp lệ" }, { status: 400 });
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy cán bộ nhân viên nào để gửi." }, { status: 400 });
    }

    // Tải tên miền hiện tại để chuyển đường dẫn ảnh tương đối thành tuyệt đối (yêu cầu của Zalo)
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    const processedElements = elements.map(el => {
      let imageUrl = el.imageUrl || "";
      if (imageUrl.startsWith("/")) {
        imageUrl = `${baseUrl}${imageUrl}`;
      }
      
      let actionValue = el.actionValue || "";
      if (el.actionType === "oa.open.url" && actionValue.startsWith("/")) {
        actionValue = `${baseUrl}${actionValue}`;
      }

      const subtitle = el.subtitle?.trim() || el.title?.trim() || "CDC Đà Nẵng";
      return { 
        ...el, 
        imageUrl, 
        actionValue,
        subtitle: subtitle.substring(0, 120)
      };
    });

    let processedUrl = url || "";
    if (processedUrl.startsWith("/")) {
      processedUrl = `${baseUrl}${processedUrl}`;
    }

    // Gửi tuần tự cho từng nhân viên
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const userId of targetUserIds) {
      try {
        let result;
        if (messageType === "list") {
          result = await sendListMessage(userId, processedElements);
        } else {
          result = await sendPromotionMessage(userId, title, content, processedUrl);
        }

        if (result.error && result.error !== 0) {
          failCount++;
          if (errors.length < 5) {
            errors.push(`User ${userId}: ${result.message} (Mã: ${result.error})`);
          }
        } else {
          successCount++;
        }
        await new Promise((r) => setTimeout(r, 100)); // Delay tránh rate limit
      } catch (e) {
        failCount++;
      }
    }

    if (successCount === 0 && failCount > 0) {
      return NextResponse.json(
        { error: `Tất cả tin gửi thất bại. Lỗi đầu tiên: ${errors[0] || "Không rõ"}` },
        { status: 400 }
      );
    }

    // Lưu log broadcast nội bộ vào DB
    await prisma.messageLog.create({
      data: {
        zaloUserId: "__broadcast_staff__",
        direction: "outbound",
        type: "broadcast",
        content: messageType === "list" ? `[Tin nhắn Danh sách]\n${processedElements.length} thẻ tham số` : `[${title}]\n${content}`,
        rawPayload: JSON.stringify({ scope, total: targetUserIds.length, successCount, failCount, url, messageType }),
      },
    });

    return NextResponse.json({
      success: true,
      total: targetUserIds.length,
      successCount,
      failCount,
      errors: errors.slice(0, 3),
    });
  } catch (err) {
    console.error("[Broadcast Staff API Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const logs = await prisma.messageLog.findMany({
      where: { zaloUserId: "__broadcast_staff__" },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ data: logs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
