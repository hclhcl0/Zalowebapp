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
  MINIAPP_MANAGER:  "miniapp_manager",  // Quản lý cấu hình Zalo Mini App
};

// ============================================================
// NHÃN HIỂN THỊ
// ============================================================
export const ROLE_LABELS = {
  admin:            "👑 Quản trị viên",
  staff:            "👤 Nhân viên",
  broadcaster:      "📢 Tin truyền thông",
  internal_sender:  "📧 Gửi Zalo/Email",
  knowledge_editor: "🧠 Kho tri thức AI",
  miniapp_manager:  "📱 Quản lý Mini App",
};

// ============================================================
// MÔ TẢ QUYỀN HẠN
// ============================================================
export const ROLE_DESCRIPTIONS = {
  admin:            "Toàn quyền quản trị hệ thống",
  staff:            "Xem thông tin, tra cứu cơ bản",
  broadcaster:      "Soạn và gởi tin truyền thông Zalo OA",
  internal_sender:  "Gởi tin cá nhân hóa (Zalo/Email) cho danh sách",
  knowledge_editor: "Thêm, sửa, xóa tài liệu trong kho tri thức AI",
  miniapp_manager:  "Quản lý cài đặt, nội dung, bảng giá cho Zalo Mini App",
};

// ============================================================
// DANH SÁCH TẤT CẢ ROLE (cho dropdown)
// ============================================================
export const ALL_ROLES = Object.values(ROLES);

// ============================================================
// HÀM KIỂM TRA QUYỀN
// ============================================================

/** Helper: Kiểm tra chuỗi roles (ngăn cách bằng dấu phẩy) có chứa quyền đích không */
function hasRole(roleString, targetRole) {
  if (!roleString) return false;
  const roles = roleString.split(",").map(r => r.trim());
  return roles.includes(ROLES.ADMIN) || roles.includes(targetRole);
}

/** Kiểm tra có quyền gởi Tin truyền thông không */
export function canBroadcast(roleString) {
  return hasRole(roleString, ROLES.BROADCASTER);
}

/** Kiểm tra có quyền gởi Zalo/Email cá nhân hóa không */
export function canSendInternal(roleString) {
  return hasRole(roleString, ROLES.INTERNAL_SENDER);
}

/** Kiểm tra có quyền quản lý Kho tri thức AI không */
export function canEditKnowledge(roleString) {
  return hasRole(roleString, ROLES.KNOWLEDGE_EDITOR);
}

/** Kiểm tra có quyền quản lý Mini App không */
export function canManageMiniApp(roleString) {
  return hasRole(roleString, ROLES.MINIAPP_MANAGER);
}

/** Kiểm tra có phải Admin không */
export function isAdmin(roleString) {
  if (!roleString) return false;
  const roles = roleString.split(",").map(r => r.trim());
  return roles.includes(ROLES.ADMIN);
}

/** Kiểm tra có quyền truy cập hệ thống không (ít nhất 1 role hợp lệ) */
export function isValidUser(roleString) {
  if (!roleString) return false;
  const roles = roleString.split(",").map(r => r.trim());
  return roles.some(r => ALL_ROLES.includes(r));
}
