// ============================================================
// lib/emailPool.js — Quản lý Email Pool
// Hỗ trợ 2 loại xác thực:
//   1. OAuth2   (refreshToken có sẵn) — ưu tiên, không bị lỗi 454
//   2. App Password (fallback)        — SMTP pool + auto retry
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
        // ── OAuth2 transporter ──────────────────────────────────
        // Không cần App Password, không bị lỗi 454
        const oauth2Client = new google.auth.OAuth2(
          acc.clientId,
          acc.clientSecret,
          "https://developers.google.com/oauthplayground" // placeholder, không dùng redirect ở đây
        );
        oauth2Client.setCredentials({ refresh_token: acc.refreshToken });

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
        // ── App Password transporter (SMTP pool) ─────────────────
        this.transporters.set(
          acc.id,
          nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            pool: true,
            maxConnections: 1,
            maxMessages: 100,
            rateDelta: 1200,
            rateLimit: 1,
            auth: {
              user: acc.user,
              pass: acc.appPassword,
            },
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
   * Gửi email với retry tự động khi gặp lỗi 454 / 421
   * (chỉ áp dụng cho App Password; OAuth2 không gặp lỗi này)
   */
  async sendMail(accountId, mailOptions, retries = 2) {
    const transporter = this.transporters.get(accountId);
    if (!transporter) throw new Error("Không tìm thấy transporter: " + accountId);

    const account = this.accounts.find((a) => a.id === accountId);
    const isOAuth2 = Boolean(account?.refreshToken);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await transporter.sendMail(mailOptions);
      } catch (err) {
        // OAuth2 không retry — nếu lỗi thì báo ngay
        if (isOAuth2) throw err;

        const shouldRetry =
          err.message?.includes("454") ||
          err.message?.includes("421") ||
          err.message?.includes("Too many login") ||
          err.message?.includes("try again");

        if (shouldRetry && attempt < retries) {
          const waitMs = 5000 * (attempt + 1);
          console.warn(
            `[EmailPool] ${err.message.slice(0, 80)} → Retry sau ${waitMs}ms (${attempt + 1}/${retries})`
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw err;
      }
    }
  }

  /** Đóng tất cả transporter khi hoàn thành batch */
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
