// ============================================================
// lib/emailPool.js — Quản lý Email Pool với SMTP Connection Pooling
// ============================================================
import nodemailer from "nodemailer";

export class EmailPool {
  constructor(accounts) {
    if (!accounts || accounts.length === 0) {
      throw new Error("Email pool phải có ít nhất 1 tài khoản Gmail.");
    }
    this.accounts = accounts;
    this.currentIndex = 0;
    this.sentCount = new Map();

    // Tạo transporter dùng SMTP pool thực sự (tái dùng kết nối, không re-auth mỗi email)
    this.transporters = new Map();
    accounts.forEach((acc) => {
      this.sentCount.set(acc.id, 0);
      this.transporters.set(
        acc.id,
        nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,          // SSL
          pool: true,            // Tái sử dụng kết nối SMTP
          maxConnections: 1,     // 1 kết nối/tài khoản để tránh bị Gmail chặn
          maxMessages: 100,      // Tối đa 100 email/kết nối rồi mới tạo lại
          rateDelta: 1000,       // Giới hạn: tối đa 1 email/giây
          rateLimit: 1,
          auth: {
            user: acc.user,
            pass: acc.appPassword,
          },
        })
      );
    });
  }

  /** Lấy tài khoản tiếp theo theo Round-Robin */
  next() {
    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    this.sentCount.set(account.id, (this.sentCount.get(account.id) ?? 0) + 1);
    return account;
  }

  /** Lấy transporter của tài khoản */
  getTransporter(accountId) {
    return this.transporters.get(accountId);
  }

  /** Gửi email với retry tự động khi gặp lỗi 454 (Too many login attempts) */
  async sendMail(accountId, mailOptions, retries = 2) {
    const transporter = this.transporters.get(accountId);
    if (!transporter) throw new Error("Không tìm thấy transporter cho tài khoản: " + accountId);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await transporter.sendMail(mailOptions);
      } catch (err) {
        const is454 = err.message?.includes("454") || err.message?.includes("Too many login");
        const is421 = err.message?.includes("421") || err.message?.includes("try again");
        if ((is454 || is421) && attempt < retries) {
          // Chờ 5s trước khi retry
          const waitMs = 5000 * (attempt + 1);
          console.warn(`[EmailPool] Lỗi ${err.message.slice(0, 60)}... Retry sau ${waitMs}ms (lần ${attempt + 1}/${retries})`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw err;
      }
    }
  }

  /** Đóng tất cả transporter khi xong */
  closeAll() {
    this.transporters.forEach((t) => {
      try { t.close(); } catch (_) {}
    });
  }

  /** Thống kê số email đã gửi của từng tài khoản */
  getStats() {
    const stats = {};
    this.sentCount.forEach((count, id) => {
      stats[id] = count;
    });
    return stats;
  }

  get totalAccounts() {
    return this.accounts.length;
  }
}
