/**
 * Hệ thống phân quyền CDC Đà Nẵng
 * ============================================================
 * Role definitions and permission helpers
 */

// ============================================================
// ĐỊNH NGHĨA CÁC ROLE
// ============================================================
export const ROLES = {
  ADMIN:            "admin",            // Toàn quyền
  STAFF:            "staff",            // Nhân viên cơ bản (xem, tra cứu)
  BROADCASTER:      "broadcaster",      // Gởi tin truyền thông (Broadcast OA)
  INTERNAL_SENDER:  "internal_sender",  // Gởi tin nội bộ (Salary/Tax Email)
  KNOWLEDGE_EDITOR: "knowledge_editor", // Quản lý kho tri thức AI
};

// ============================================================
// NHÃN HIỂN THỊ
// ============================================================
export const ROLE_LABELS = {
  admin:            "👑 Quản trị viên",
  staff:            "👤 Nhân viên",
  broadcaster:      "📢 Tin truyền thông",
  internal_sender:  "📧 Tin nội bộ",
  knowledge_editor: "🧠 Kho tri thức AI",
};

// ============================================================
// MÔ TẢ QUYỀN HẠN
// ============================================================
export const ROLE_DESCRIPTIONS = {
  admin:            "Toàn quyền quản trị hệ thống",
  staff:            "Xem thông tin, tra cứu cơ bản",
  broadcaster:      "Soạn và gởi tin truyền thông Zalo OA",
  internal_sender:  "Gởi phiếu lương, thông báo nội bộ qua Email & Zalo",
  knowledge_editor: "Thêm, sửa, xóa tài liệu trong kho tri thức AI",
};

// ============================================================
// DANH SÁCH TẤT CẢ ROLE (cho dropdown)
// ============================================================
export const ALL_ROLES = Object.values(ROLES);

// ============================================================
// HÀM KIỂM TRA QUYỀN
// ============================================================

/** Kiểm tra có quyền gởi Tin truyền thông không */
export function canBroadcast(role) {
  return role === ROLES.ADMIN || role === ROLES.BROADCASTER;
}

/** Kiểm tra có quyền gởi Tin nội bộ không */
export function canSendInternal(role) {
  return role === ROLES.ADMIN || role === ROLES.INTERNAL_SENDER;
}

/** Kiểm tra có quyền quản lý Kho tri thức AI không */
export function canEditKnowledge(role) {
  return role === ROLES.ADMIN || role === ROLES.KNOWLEDGE_EDITOR || role === ROLES.STAFF;
}

/** Kiểm tra có phải Admin không */
export function isAdmin(role) {
  return role === ROLES.ADMIN;
}

/** Kiểm tra có quyền truy cập hệ thống không (đăng nhập hợp lệ) */
export function isValidUser(role) {
  return ALL_ROLES.includes(role);
}
