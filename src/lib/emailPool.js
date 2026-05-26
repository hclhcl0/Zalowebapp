// ============================================================
// lib/emailPool.js — Quản lý Email Pool
// Hỗ trợ 2 loại xác thực:
//   1. OAuth2   (refreshToken có sẵn) — ưu tiên, không bị lỗi 454
//   2. App Password (fallback)        — gửi từng email riêng lẻ (không dùng pool mode)
// ============================================================
import nodemailer from "nodemailer";
import { google } from "googleapis";

export class EmailPool {
  constructor(accounts) {
    if (!accounts || accounts.length === 0) {
      throw new Error("Email pool phải có ít nhất 1 tài khoản Gmail.");
    }
    this.accounts = accounts;
    this.currentIndex = 0;
    this.sentCount = new Map();
    this.transporters = new Map();

    accounts.forEach((acc) => {
      this.sentCount.set(acc.id, 0);

      if (acc.refreshToken) {
        // ── OAuth2 transporter ──────────────────────────────────────
        // Không cần App Password, không bị lỗi 454
        // KHÔNG dùng pool:true cho OAuth2 vì token có thể hết hạn
        this.transporters.set(
          acc.id,
          nodemailer.createTransport({
            service: "gmail",
            auth: {
              type: "OAuth2",
              user: acc.user,
              clientId: acc.clientId,
              clientSecret: acc.clientSecret,
              refreshToken: acc.refreshToken,
              accessToken: acc.accessToken || undefined,
            },
          })
        );
      } else {
        // ── App Password transporter ────────────────────────────────
        // QUAN TRỌNG: KHÔNG dùng pool:true vì với pool mode,
        // nodemailer queue messages và có thể bị drop khi close().
        // Dùng kết nối đơn lẻ (non-pool) để đảm bảo mỗi sendMail
        // await đúng = email thực sự đã được gửi trước khi tiếp tục.
        this.transporters.set(
          acc.id,
          nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,         // SSL
            pool: false,          // ĐÃ SỬA: tắt pool mode để đảm bảo await đúng
            auth: {
              user: acc.user,
              pass: acc.appPassword,
            },
            // Timeout settings
            connectionTimeout: 10000,   // 10s để kết nối
            greetingTimeout: 8000,      // 8s chờ greeting SMTP
            socketTimeout: 30000,       // 30s chờ mỗi lệnh
          })
        );
      }
    });
  }

  /** Lấy tài khoản tiếp theo theo Round-Robin */
  next() {
    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    this.sentCount.set(account.id, (this.sentCount.get(account.id) ?? 0) + 1);
    return account;
  }

  /**
   * Gửi email với retry tự động khi gặp lỗi tạm thời (454 / 421 / ECONNRESET)
   * Với pool:false, sendMail() chờ đến khi server SMTP xác nhận đã nhận → đảm bảo gửi thật
   */
  async sendMail(accountId, mailOptions, retries = 2) {
    const transporter = this.transporters.get(accountId);
    if (!transporter) throw new Error("Không tìm thấy transporter: " + accountId);

    const account = this.accounts.find((a) => a.id === accountId);
    const isOAuth2 = Boolean(account?.refreshToken);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const info = await transporter.sendMail(mailOptions);
        // Log messageId để debug nếu cần
        console.log(`[EmailPool] Gửi OK → ${mailOptions.to} | msgId: ${info.messageId} | account: ${account?.user}`);
        return info;
      } catch (err) {
        // OAuth2: không retry — báo lỗi ngay
        if (isOAuth2) {
          console.error(`[EmailPool] OAuth2 lỗi → ${mailOptions.to}: ${err.message}`);
          throw err;
        }

        const isRetryable =
          err.message?.includes("454") ||
          err.message?.includes("421") ||
          err.message?.includes("Too many login") ||
          err.message?.includes("try again") ||
          err.code === "ECONNRESET" ||
          err.code === "ETIMEDOUT" ||
          err.code === "ECONNREFUSED";

        if (isRetryable && attempt < retries) {
          const waitMs = 6000 * (attempt + 1);
          console.warn(
            `[EmailPool] Lỗi "${err.message.slice(0, 80)}" → Retry sau ${waitMs}ms (${attempt + 1}/${retries})`
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        console.error(`[EmailPool] Lỗi cuối → ${mailOptions.to}: ${err.message}`);
        throw err;
      }
    }
  }

  /**
   * Đóng tất cả transporter — chỉ gọi sau khi TẤT CẢ sendMail đã hoàn thành
   * Với pool:false thì close() an toàn (không có queue đang chờ)
   */
  closeAll() {
    this.transporters.forEach((t) => {
      try { t.close(); } catch (_) {}
    });
  }

  /** Thống kê số email đã gửi */
  getStats() {
    const stats = {};
    this.sentCount.forEach((count, id) => {
      const acc = this.accounts.find((a) => a.id === id);
      stats[id] = { count, user: acc?.user, type: acc?.refreshToken ? "oauth2" : "app_password" };
    });
    return stats;
  }

  get totalAccounts() {
    return this.accounts.length;
  }
}
