// ============================================================
// lib/emailPool.js — Quản lý Email Pool với Round-Robin
// ============================================================

export class EmailPool {
  constructor(accounts) {
    if (!accounts || accounts.length === 0) {
      throw new Error("Email pool phải có ít nhất 1 tài khoản Gmail.");
    }
    this.accounts = accounts;
    this.currentIndex = 0;
    this.sentCount = new Map();
    accounts.forEach((a) => this.sentCount.set(a.id, 0));
  }

  /** Lấy tài khoản tiếp theo theo Round-Robin */
  next() {
    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    this.sentCount.set(account.id, (this.sentCount.get(account.id) ?? 0) + 1);
    return account;
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
