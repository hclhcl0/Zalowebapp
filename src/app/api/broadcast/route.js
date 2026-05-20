/**
 * API: Gửi tin nhắn Truyền thông (Promotion) từ Zalo OA
 * POST /api/broadcast
 * Body: { scope: "all" | "list", userIds?: string[], title: string, content: string, url?: string }
 * 
 * Theo Zalo API v3.0: Không có endpoint sendall/multicast.
 * Phải gửi từng user_id một qua /message/promotion với body template.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPromotionMessage, sendListMessage, sendVideoMessage, uploadVideoToZalo } from "@/lib/zalo";

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
        return NextResponse.json({ error: "Tin nhắn danh sách phải có ít nhất 1 thẻ (element)" }, { status: 400 });
      }
      for (const el of elements) {
        if (!el.title?.trim() || !el.imageUrl?.trim()) {
          return NextResponse.json({ error: "Tiêu đề và hình ảnh của mỗi thẻ không được để trống" }, { status: 400 });
        }
      }
    } else if (messageType === "video") {
      if (!url?.trim()) {
        return NextResponse.json({ error: "Đường dẫn video không được để trống" }, { status: 400 });
      }
    }

    // Lấy danh sách user_id cần gửi
    let targetUserIds = [];

    if (scope === "all") {
      // Lấy tất cả zaloUserId từ DB
      const allFollowers = await prisma.follower.findMany({
        select: { zaloUserId: true },
      });
      targetUserIds = allFollowers.map((f) => f.zaloUserId);
    } else if (scope === "list" && Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      return NextResponse.json({ error: "Phạm vi gửi không hợp lệ" }, { status: 400 });
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: "Không có người nhận nào. Hãy đồng bộ danh sách người quan tâm trước." }, { status: 400 });
    }

    // Lấy tên miền hiện tại để chuyển đường dẫn ảnh tương đối thành tuyệt đối (yêu cầu của Zalo)
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

      // Đảm bảo subtitle không bao giờ trống để tránh lỗi -201 từ Zalo
      const subtitle = el.subtitle?.trim() || el.title?.trim() || "CDC Đà Nẵng";
      return { 
        ...el, 
        imageUrl, 
        actionValue,
        subtitle: subtitle.substring(0, 120) // Giới hạn tối đa 120 ký tự theo quy định của Zalo
      };
    });

    // Chuyển đổi link cho tin nhắn thường nếu là link tương đối
    let processedUrl = url || "";
    if (processedUrl.startsWith("/")) {
      processedUrl = `${baseUrl}${processedUrl}`;
    }

    // Nếu gửi video, chuẩn bị URL tuyệt đối của video để gửi trực tiếp cho người dùng
    let finalVideoUrl = "";
    if (messageType === "video") {
      finalVideoUrl = processedUrl;
    }

    // Gửi từng người một — Zalo không hỗ trợ bulk send
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const userId of targetUserIds) {
      try {
        let result;
        if (messageType === "list") {
          result = await sendListMessage(userId, processedElements);
        } else if (messageType === "video") {
          result = await sendVideoMessage(userId, finalVideoUrl);
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
        // Thêm delay nhỏ để tránh rate limit Zalo (100ms giữa mỗi request)
        await new Promise((r) => setTimeout(r, 100));
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

    // Lưu log broadcast vào DB
    await prisma.messageLog.create({
      data: {
        zaloUserId: "__broadcast__",
        direction: "outbound",
        type: "broadcast",
        content: messageType === "video" ? `[Tin nhắn Video]\nĐường dẫn: ${url}` : `[${title}]\n${content}`,
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
    console.error("[Broadcast API Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Lấy lịch sử broadcast
export async function GET() {
  try {
    const logs = await prisma.messageLog.findMany({
      where: { zaloUserId: "__broadcast__" },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ data: logs });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
