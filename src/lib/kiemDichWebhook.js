/**
 * Module xử lý Webhook thông báo thu phí kiểm dịch y tế (oneCDC -> CDC Đà Nẵng Zalo OA)
 * Tài liệu mẫu: curl_webhook_thongbao_kiemdich.txt
 */
import { NextResponse } from "next/server.js";
import { prisma } from "./prisma.js";
import { sendTextMessage } from "./zalo.js";

const DEFAULT_API_KEY = "cdc_onecdc_kiemdich_2026_secret";

/**
 * Xóa dấu tiếng Việt và chuẩn hóa chuỗi để so khớp tên không dấu
 */
export function removeVietnameseTones(str) {
  if (!str) return "";
  let s = String(str);
  s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  s = s.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  s = s.replace(/ì|í|ỉ|ĩ/g, "i");
  s = s.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  s = s.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  s = s.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  s = s.replace(/đ/g, "d");
  s = s.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "a");
  s = s.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "e");
  s = s.replace(/Ì|Í|Ỉ|Ĩ/g, "i");
  s = s.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "o");
  s = s.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "u");
  s = s.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "y");
  s = s.replace(/Đ/g, "d");
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Chuẩn hóa số điện thoại và sinh các biến thể (0905..., 84905..., +84905...)
 */
export function normalizePhoneVariants(rawPhone) {
  if (!rawPhone) return [];
  const digitsOnly = String(rawPhone).replace(/[^\d]/g, "");
  if (!digitsOnly) return [];

  let standard9 = ""; // 9 số cuối (bỏ mã quốc gia hoặc số 0 đầu)
  if (digitsOnly.startsWith("84") && digitsOnly.length >= 11) {
    standard9 = digitsOnly.substring(2);
  } else if (digitsOnly.startsWith("0") && digitsOnly.length >= 10) {
    standard9 = digitsOnly.substring(1);
  } else if (digitsOnly.length === 9) {
    standard9 = digitsOnly;
  } else {
    standard9 = digitsOnly.slice(-9);
  }

  const variants = new Set([
    digitsOnly,
    `0${standard9}`,
    `84${standard9}`,
    `+84${standard9}`,
    standard9,
  ]);

  return Array.from(variants);
}

/**
 * Lấy API Key hợp lệ được cấu hình cho Webhook oneCDC
 */
export async function getExpectedApiKey() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "onecdc_webhook_api_key" },
    });
    if (config?.value?.trim()) {
      return config.value.trim();
    }
  } catch (err) {
    console.warn("[Webhook oneCDC] Lỗi đọc SystemConfig API Key:", err.message);
  }

  if (process.env.ONECDC_WEBHOOK_API_KEY?.trim()) {
    return process.env.ONECDC_WEBHOOK_API_KEY.trim();
  }

  // Tự động lưu key mặc định vào DB nếu chưa có
  try {
    await prisma.systemConfig.upsert({
      where: { key: "onecdc_webhook_api_key" },
      update: {},
      create: {
        key: "onecdc_webhook_api_key",
        value: DEFAULT_API_KEY,
        label: "Khóa bảo mật Webhook oneCDC (Thu phí kiểm dịch)",
      },
    });
  } catch (err) {
    console.warn("[Webhook oneCDC] Không thể tạo key mặc định:", err.message);
  }

  return DEFAULT_API_KEY;
}

/**
 * Xác thực API Key từ Request (Header X-Api-Key, Authorization Bearer, hoặc query ?api_key=)
 */
export async function validateApiKey(request) {
  const expectedKey = await getExpectedApiKey();
  const headerKey =
    request.headers.get("x-api-key") ||
    request.headers.get("X-Api-Key") ||
    request.headers.get("x-api-token");

  if (headerKey && headerKey.trim() === expectedKey) return true;

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === expectedKey) return true;
  }

  try {
    const url = new URL(request.url);
    const queryKey = url.searchParams.get("api_key") || url.searchParams.get("key");
    if (queryKey && queryKey.trim() === expectedKey) return true;
  } catch {}

  return false;
}

/**
 * Tìm kiếm cán bộ người chỉ định trong cơ sở dữ liệu CDC (StaffZaloLink & Follower)
 * Ưu tiên: SĐT người chỉ định -> Tên người chỉ định -> Fallback
 */
export async function findRecipientZalo(recipient) {
  if (!recipient) return { found: false, reason: "Thiếu thông tin người nhận (recipient)" };

  const rawPhone = recipient.sdt || recipient.phone || recipient.dien_thoai || "";
  const rawName = recipient.ten || recipient.name || recipient.ho_ten || "";

  // 1. Tìm theo SĐT
  if (rawPhone) {
    const phoneVariants = normalizePhoneVariants(rawPhone);

    // 1a. Tra trong bảng StaffZaloLink (Ưu tiên danh sách cán bộ CDC đã liên kết)
    const staffByPhone = await prisma.staffZaloLink.findFirst({
      where: {
        phone: { in: phoneVariants },
      },
    });

    if (staffByPhone?.zaloUserId) {
      return {
        found: true,
        zaloUserId: staffByPhone.zaloUserId,
        name: staffByPhone.staffNameRaw || staffByPhone.staffName,
        phone: staffByPhone.phone,
        department: staffByPhone.department,
        matchedBy: "staff_phone",
      };
    }

    // 1b. Tra trong bảng Follower theo SĐT
    const followerByPhone = await prisma.follower.findFirst({
      where: {
        phone: { in: phoneVariants },
      },
    });

    if (followerByPhone?.zaloUserId) {
      return {
        found: true,
        zaloUserId: followerByPhone.zaloUserId,
        name: followerByPhone.fullName || followerByPhone.displayName,
        phone: followerByPhone.phone,
        department: followerByPhone.department,
        matchedBy: "follower_phone",
      };
    }
  }

  // 2. Tìm theo Họ Tên nếu SĐT không khớp hoặc SĐT rỗng
  if (rawName) {
    const cleanTarget = removeVietnameseTones(rawName);

    if (cleanTarget.length >= 3) {
      // 2a. Lấy danh sách cán bộ StaffZaloLink để so sánh không dấu
      const allStaff = await prisma.staffZaloLink.findMany({
        select: {
          id: true,
          staffNameRaw: true,
          staffName: true,
          zaloUserId: true,
          department: true,
          phone: true,
        },
      });

      const matchedStaff = allStaff.find((s) => {
        const c1 = removeVietnameseTones(s.staffNameRaw);
        const c2 = removeVietnameseTones(s.staffName);
        return c1 === cleanTarget || c2 === cleanTarget;
      });

      if (matchedStaff?.zaloUserId) {
        return {
          found: true,
          zaloUserId: matchedStaff.zaloUserId,
          name: matchedStaff.staffNameRaw || matchedStaff.staffName,
          phone: matchedStaff.phone,
          department: matchedStaff.department,
          matchedBy: "staff_name",
        };
      }

      // 2b. Tra trong bảng Follower có userType='staff' hoặc tất cả
      const allFollowers = await prisma.follower.findMany({
        where: {
          OR: [
            { userType: "staff" },
            { department: { not: null } },
            { fullName: { not: null } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          displayName: true,
          zaloUserId: true,
          phone: true,
          department: true,
        },
        take: 300,
      });

      const matchedFollower = allFollowers.find((f) => {
        const c1 = removeVietnameseTones(f.fullName);
        const c2 = removeVietnameseTones(f.displayName);
        return c1 === cleanTarget || c2 === cleanTarget;
      });

      if (matchedFollower?.zaloUserId) {
        return {
          found: true,
          zaloUserId: matchedFollower.zaloUserId,
          name: matchedFollower.fullName || matchedFollower.displayName,
          phone: matchedFollower.phone,
          department: matchedFollower.department,
          matchedBy: "follower_name",
        };
      }
    }
  }

  // 3. Kiểm tra cấu hình Zalo ID dự phòng (fallback) nếu có
  try {
    const fallbackConfig = await prisma.systemConfig.findUnique({
      where: { key: "onecdc_webhook_fallback_zalo_id" },
    });
    if (fallbackConfig?.value?.trim()) {
      return {
        found: true,
        zaloUserId: fallbackConfig.value.trim(),
        name: "Admin / Chuyển tiếp dự phòng",
        isFallback: true,
        originalRecipient: recipient,
        matchedBy: "fallback_config",
      };
    }
  } catch {}

  return {
    found: false,
    reason: `Không tìm thấy tài khoản Zalo của cán bộ chỉ định: "${rawName}" (SĐT: ${rawPhone || "chưa có"})`,
    originalRecipient: recipient,
  };
}

/**
 * Soạn nội dung tin nhắn Zalo gửi đến cán bộ
 */
export function formatZaloMessage(payload) {
  const {
    event,
    recipient = {},
    kiem_dich_vien = {},
    ke_toan = {},
    phieu = {},
    tau = [],
    ly_do_tu_choi,
    noi_dung,
  } = payload;

  const recipientName = recipient.ten || "Đồng chí";
  const soPhieu = phieu.so_phieu || `Phiếu #${phieu.id || ""}`;
  const doiTuong = phieu.doi_tuong_thanh_toan || "Khách hàng/Hãng bay";
  const soTien = phieu.so_tien != null ? Number(phieu.so_tien).toFixed(2) : "0.00";
  const donViTien = phieu.don_vi_tien || "USD";
  const soChuyen = phieu.so_chuyen ? ` (${phieu.so_chuyen} chuyến)` : "";
  const ngayLap = phieu.ngay_lap || "Hôm nay";

  // Định dạng danh sách phương tiện (tàu bay / tàu biển)
  let tauInfo = "";
  if (Array.isArray(tau) && tau.length > 0) {
    tauInfo = tau
      .map((t, idx) => {
        const stt = tau.length > 1 ? `${idx + 1}. ` : "";
        const ten = t.ten_tau || t.so_hieu || "N/A";
        const hang = t.hang_bay ? `Hãng: ${t.hang_bay} | ` : "";
        const chặng = t.hanh_trinh ? `Chặng: ${t.hanh_trinh} | ` : "";
        const ngay = t.ngay ? `Ngày: ${t.ngay}` : "";
        const dacTinh = t.dac_tinh ? ` (${t.dac_tinh})` : "";
        return `   • ${stt}${ten}: ${hang}${chặng}${ngay}${dacTinh}`.trim();
      })
      .join("\n");
  }

  // Case 1: Chuyển kế toán
  if (event === "chuyen_ke_toan") {
    const kdvName = kiem_dich_vien.ten || "Kiểm dịch viên";
    const kdvPhone = kiem_dich_vien.sdt ? ` (${kiem_dich_vien.sdt})` : "";

    let lines = [
      "🔔 THÔNG BÁO THU PHÍ KIỂM DỊCH",
      "━━━━━━━━━━━━━━━━━━━━━━",
      `Kính gửi: ${recipientName}`,
      "",
      `KDV ${kdvName}${kdvPhone} vừa chuyển 01 phiếu thu phí kiểm dịch y tế sang Kế toán để xuất hóa đơn:`,
      "",
      `📋 Số phiếu: ${soPhieu}`,
      `🏢 Đối tượng: ${doiTuong}`,
      `💰 Số tiền: ${soTien} ${donViTien}${soChuyen}`,
      `📅 Ngày lập: ${ngayLap}`,
    ];

    if (tauInfo) {
      lines.push(`🚢/✈️ Phương tiện:\n${tauInfo}`);
    }

    lines.push("");
    lines.push("👉 Vui lòng vào phần mềm oneCDC để kiểm tra và xuất hóa đơn.");

    return lines.join("\n");
  }

  // Case 2: Kế toán từ chối, gửi ngược lại cho KDV
  if (event === "ke_toan_tu_choi") {
    const keToanName = ke_toan.ten || "Kế toán CDC";
    const keToanPhone = ke_toan.sdt ? ` (${ke_toan.sdt})` : "";
    const lyDo = ly_do_tu_choi || "Chưa nêu lý do cụ thể";

    let lines = [
      "⚠️ THÔNG BÁO PHIẾU BỊ TỪ CHỐI",
      "━━━━━━━━━━━━━━━━━━━━━━",
      `Kính gửi: ${recipientName}`,
      "",
      `Phiếu thu phí kiểm dịch y tế đã bị Kế toán từ chối và chuyển trả lại:`,
      "",
      `📋 Số phiếu: ${soPhieu}`,
      `🏢 Đối tượng: ${doiTuong}`,
      `💰 Số tiền: ${soTien} ${donViTien}`,
      `👤 Kế toán từ chối: ${keToanName}${keToanPhone}`,
      `❌ Lý do từ chối: ${lyDo}`,
    ];

    if (tauInfo) {
      lines.push(`🚢/✈️ Phương tiện:\n${tauInfo}`);
    }

    lines.push("");
    lines.push("👉 Vui lòng vào phần mềm oneCDC kiểm tra lại và chỉnh sửa theo yêu cầu.");

    return lines.join("\n");
  }

  // Fallback: Sự kiện khác hoặc dùng nội dung soạn sẵn
  return noi_dung || `[CDC Đà Nẵng] Thông báo phiếu ${soPhieu} (${doiTuong}) - ${soTien} ${donViTien}.`;
}

/**
 * Hàm điều phối chính xử lý Webhook
 * @param {Request} request Next.js request
 * @param {string|null} forcedEvent Gán cứng event nếu gọi từ endpoint riêng (ví dụ 'chuyen_ke_toan' hoặc 'ke_toan_tu_choi')
 */
export async function processKiemDichWebhook(request, forcedEvent = null) {
  // 1. Kiểm tra API Key
  const isAuthorized = await validateApiKey(request);
  if (!isAuthorized) {
    console.warn("[Webhook oneCDC] 401 Unauthorized: API Key không khớp");
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Khóa API Key không hợp lệ hoặc thiếu header X-Api-Key",
      },
      { status: 401 }
    );
  }

  // 2. Parse dữ liệu JSON
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "Body không đúng định dạng JSON: " + err.message,
      },
      { status: 400 }
    );
  }

  // 3. Xác định sự kiện
  const event = forcedEvent || body.event;
  if (!event || (event !== "chuyen_ke_toan" && event !== "ke_toan_tu_choi")) {
    return NextResponse.json(
      {
        success: false,
        error: "Sự kiện (event) không hợp lệ. Hỗ trợ: 'chuyen_ke_toan' hoặc 'ke_toan_tu_choi'",
      },
      { status: 400 }
    );
  }

  // 4. Kiểm tra thông tin người nhận chỉ định
  const recipient = body.recipient;
  if (!recipient || (!recipient.sdt && !recipient.ten)) {
    return NextResponse.json(
      {
        success: false,
        error: "Thiếu thông tin người chỉ định nhận tin (cần trường 'recipient: { ten, sdt }')",
      },
      { status: 400 }
    );
  }

  // 5. Tìm kiếm tài khoản Zalo của người chỉ định
  const staffTarget = await findRecipientZalo(recipient);

  // Nếu KHÔNG tìm thấy người chỉ định
  if (!staffTarget.found) {
    console.warn(`[Webhook oneCDC] Không tìm thấy Zalo của cán bộ chỉ định:`, recipient);

    // Lưu log thông báo chưa gửi được vào MessageLog
    try {
      await prisma.messageLog.create({
        data: {
          zaloUserId: "__not_linked__",
          direction: "outbound",
          type: "webhook_kiemdich",
          content: `[Chưa liên kết Zalo] Không tìm thấy Zalo cán bộ: ${recipient.ten} (${recipient.sdt}) - Phiếu: ${body.phieu?.so_phieu || "N/A"}`,
          rawPayload: JSON.stringify({
            event,
            recipient,
            payload: body,
            reason: staffTarget.reason,
          }),
        },
      });
    } catch (logErr) {
      console.error("[Webhook oneCDC] Lỗi ghi MessageLog:", logErr.message);
    }

    // Trả HTTP 200 kèm cảnh báo để đối tác không bị retry lặp (theo tài liệu: timeout 10s, không tự gửi lại)
    return NextResponse.json(
      {
        success: false,
        status: "recipient_not_linked",
        message: staffTarget.reason,
        event,
        recipient,
        so_phieu: body.phieu?.so_phieu,
        instruction:
          "Cán bộ cần quan tâm Zalo OA CDC Đà Nẵng và đăng ký thông tin nhân viên (khớp SĐT/Họ tên) để nhận tin tự động.",
      },
      { status: 200 }
    );
  }

  // 6. Định dạng tin nhắn và gửi đến cán bộ chỉ định
  let messageContent = formatZaloMessage({ ...body, event });

  if (staffTarget.isFallback) {
    messageContent = `⚠️ [CHUYỂN TIẾP DỰ PHÒNG]\nCán bộ chỉ định: ${recipient.ten} (${recipient.sdt || "Không có SĐT"}) chưa liên kết Zalo.\n\n` + messageContent;
  }

  let zaloResult = null;
  let sendError = null;

  try {
    zaloResult = await sendTextMessage(staffTarget.zaloUserId, messageContent);
    if (zaloResult?.error !== 0) {
      sendError = zaloResult?.message || `Lỗi Zalo API mã ${zaloResult?.error}`;
    }
  } catch (err) {
    sendError = err.message;
  }

  // 7. Ghi log vào MessageLog
  try {
    await prisma.messageLog.create({
      data: {
        zaloUserId: staffTarget.zaloUserId,
        direction: "outbound",
        type: "webhook_kiemdich",
        content: messageContent.substring(0, 500),
        rawPayload: JSON.stringify({
          event,
          recipient,
          matchedStaff: {
            name: staffTarget.name,
            phone: staffTarget.phone,
            department: staffTarget.department,
            matchedBy: staffTarget.matchedBy,
            isFallback: !!staffTarget.isFallback,
          },
          zaloResult,
          sendError,
          so_phieu: body.phieu?.so_phieu,
        }),
      },
    });
  } catch (logErr) {
    console.error("[Webhook oneCDC] Lỗi ghi MessageLog:", logErr.message);
  }

  // 8. Trả kết quả phản hồi HTTP
  if (sendError) {
    console.warn(`[Webhook oneCDC] Gửi tin Zalo thất bại: ${sendError}`);
    return NextResponse.json(
      {
        success: false,
        error: `Gửi tin Zalo đến cán bộ thất bại: ${sendError}`,
        event,
        recipient: {
          ten: recipient.ten,
          sdt: recipient.sdt,
          matchedName: staffTarget.name,
          zaloUserId: staffTarget.zaloUserId,
        },
        zaloResult,
      },
      { status: 200 }
    );
  }

  console.log(
    `[Webhook oneCDC] Gửi thành công event "${event}" đến cán bộ: ${staffTarget.name} (Zalo UID: ${staffTarget.zaloUserId}, khớp theo: ${staffTarget.matchedBy})`
  );

  return NextResponse.json(
    {
      success: true,
      message: "Đã gửi thông báo Zalo thành công đến cán bộ chỉ định",
      event,
      recipient: {
        ten: recipient.ten,
        sdt: recipient.sdt,
        matchedName: staffTarget.name,
        department: staffTarget.department,
        matchedBy: staffTarget.matchedBy,
      },
      so_phieu: body.phieu?.so_phieu,
      zaloResult,
    },
    { status: 200 }
  );
}
