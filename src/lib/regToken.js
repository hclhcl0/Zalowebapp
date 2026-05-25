/**
 * regToken.js — Tạo và xác minh token đăng ký nhân viên
 *
 * Cơ chế: HMAC-SHA256 + timestamp
 * Format token: base64url( uid|timestamp|hmac )
 * Thời hạn: 7 ngày
 *
 * Ưu điểm:
 *  - Token bị ràng buộc với đúng 1 Zalo User ID
 *  - Có thời hạn → link cũ không dùng được mãi
 *  - Không cần DB lưu token (stateless)
 *  - Không lộ Zalo User ID trực tiếp trong URL
 */

import crypto from "crypto";

// Secret key — đọc từ env, fallback cứng để dev không crash
const SECRET = process.env.REG_TOKEN_SECRET || "cdc-danang-reg-secret-2025";

// Thời hạn token: 7 ngày (tính bằng ms)
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Tạo token từ Zalo User ID */
export function createRegToken(zaloUserId) {
  const ts = Date.now().toString();
  const payload = `${zaloUserId}|${ts}`;
  const hmac = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");
  // Ghép payload + hmac, encode toàn bộ
  const raw = `${payload}|${hmac}`;
  return Buffer.from(raw).toString("base64url");
}

/**
 * Xác minh và giải mã token
 * @returns {{ ok: true, zaloUserId: string } | { ok: false, reason: string }}
 */
export function verifyRegToken(token) {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 3) return { ok: false, reason: "Token không hợp lệ" };

    const [zaloUserId, tsStr, hmacReceived] = parts;
    const ts = parseInt(tsStr, 10);

    // Kiểm tra thời hạn
    if (Date.now() - ts > TOKEN_TTL_MS) {
      return { ok: false, reason: "Link đăng ký đã hết hạn (quá 7 ngày). Vui lòng liên hệ Phòng Kế Hoạch - Nghiệp vụ để nhận link mới." };
    }

    // Kiểm tra chữ ký HMAC
    const payload = `${zaloUserId}|${tsStr}`;
    const hmacExpected = crypto
      .createHmac("sha256", SECRET)
      .update(payload)
      .digest("base64url");

    // So sánh theo cách constant-time để chống timing attack
    const hmacReceivedBuf = Buffer.from(hmacReceived);
    const hmacExpectedBuf = Buffer.from(hmacExpected);

    if (
      hmacReceivedBuf.length !== hmacExpectedBuf.length ||
      !crypto.timingSafeEqual(hmacReceivedBuf, hmacExpectedBuf)
    ) {
      return { ok: false, reason: "Chữ ký token không hợp lệ. Vui lòng dùng đúng link được gửi từ Zalo OA CDC." };
    }

    return { ok: true, zaloUserId };
  } catch {
    return { ok: false, reason: "Token bị lỗi hoặc đã bị chỉnh sửa." };
  }
}
