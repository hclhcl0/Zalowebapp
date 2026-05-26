// ============================================================
// lib/zaloMessageTemplates.js — Mẫu tin nhắn Zalo thông báo nội bộ & cập nhật khác
// ============================================================

export function generateSalaryZaloMessage(data, opts = {}) {
  const { quarterTitle = "Thông báo thông báo nội bộ Quý", customMessage } = opts;
  
  let msg = `🔔 *${quarterTitle.toUpperCase()}*\n`;
  msg += `Kính gửi: *${data.tenNhanVien}*\n\n`;
  
  if (customMessage) {
    msg += `${customMessage}\n\n`;
  }
  
  msg += `*Chi tiết thông báo nội bộ:*\n`;
  
  // Month 1
  msg += `🔹 *Tháng 1:*\n`;
  msg += ` - Hệ số thông tin nội bộ: ${data.heSoLieuT1 || 0}\n`;
  msg += ` - PC vượt khung: ${data.pcvkT1 || 0}\n`;
  msg += ` - PC chức vụ: ${data.pccvT1 || 0}\n`;
  msg += ` - Tổng hệ số: ${data.tongHeSoT1 || 0}\n`;
  msg += ` - Xếp loại: ${data.xepLoaiT1 || "—"} (HS: ${data.heSoXepLoaiT1 || 0})\n`;
  msg += ` - Thành tiền: ${data.thanhTienT1 ? data.thanhTienT1.toLocaleString("vi-VN") : 0} VNĐ\n\n`;

  // Month 2
  msg += `🔹 *Tháng 2:*\n`;
  msg += ` - Hệ số thông tin nội bộ: ${data.heSoLieuT2 || 0}\n`;
  msg += ` - PC vượt khung: ${data.pcvkT2 || 0}\n`;
  msg += ` - PC chức vụ: ${data.pccvT2 || 0}\n`;
  msg += ` - Tổng hệ số: ${data.tongHeSoT2 || 0}\n`;
  msg += ` - Xếp loại: ${data.xepLoaiT2 || "—"} (HS: ${data.heSoXepLoaiT2 || 0})\n`;
  msg += ` - Thành tiền: ${data.thanhTienT2 ? data.thanhTienT2.toLocaleString("vi-VN") : 0} VNĐ\n\n`;

  // Month 3
  msg += `🔹 *Tháng 3:*\n`;
  msg += ` - Hệ số thông tin nội bộ: ${data.heSoLieuT3 || 0}\n`;
  msg += ` - PC vượt khung: ${data.pcvkT3 || 0}\n`;
  msg += ` - PC chức vụ: ${data.pccvT3 || 0}\n`;
  msg += ` - Tổng hệ số: ${data.tongHeSoT3 || 0}\n`;
  msg += ` - Xếp loại: ${data.xepLoaiT3 || "—"} (HS: ${data.heSoXepLoaiT3 || 0})\n`;
  msg += ` - Thành tiền: ${data.thanhTienT3 ? data.thanhTienT3.toLocaleString("vi-VN") : 0} VNĐ\n\n`;

  msg += `💰 *TỔNG THU NHẬP:* *${data.tongThuNhap ? data.tongThuNhap.toLocaleString("vi-VN") : 0}* VNĐ\n\n`;
  msg += `---------------------------------\n`;
  
  return msg;
}

export function generateCustomZaloMessage(data, opts = {}) {
  const { emailTitle = "Thông thông báo nội bộ", columnMapping, customMessage, footerNote } = opts;
  
  let msg = `🔔 *${emailTitle.toUpperCase()}*\n`;
  msg += `Kính gửi: *${data.tenNhanVien}*\n\n`;
  
  if (customMessage) {
    msg += `${customMessage}\n\n`;
  }
  
  msg += `*Thông tin chi tiết:*\n`;
  const displayCols = columnMapping.displayCols || [];
  displayCols.forEach(({ key, label }) => {
    const val = data.data?.[key] ?? "";
    const displayVal = typeof val === "number" ? val.toLocaleString("vi-VN") : String(val);
    msg += ` - ${label || key}: ${displayVal}\n`;
  });
  
  if (columnMapping.totalCol) {
    const val = data.data?.[columnMapping.totalCol] ?? "";
    const displayVal = typeof val === "number" ? val.toLocaleString("vi-VN") : String(val);
    msg += `💰 *${columnMapping.totalCol}:* *${displayVal}*\n\n`;
  }
  
  if (footerNote) {
    msg += `\n${footerNote}\n`;
  }
  
  return msg;
}

export function generateTaxZaloMessage(data, opts = {}) {
  const { quarterTitle = "Thông cập nhật thông tin khác TNCN", customMessage } = opts;
  
  let msg = `🔔 *${quarterTitle.toUpperCase()}*\n`;
  msg += `Kính gửi: *${data.tenNhanVien}*\n`;
  if (data.phong) msg += `Bộ phận: ${data.phong}\n`;
  if (data.soTK) msg += `Số tài khoản: ${data.soTK}\n`;
  if (data.thang) msg += `Kỳ cập nhật khác/Tháng: ${data.thang}\n`;
  msg += `\n`;
  
  if (customMessage) {
    msg += `${customMessage}\n\n`;
  }
  
  msg += `*Chi tiết thông tin nội bộ khác:*\n`;
  
  if (data.khoans && data.khoans.length > 0) {
    data.khoans.forEach((kh) => {
      msg += ` - ${kh.ten}: ${kh.soTien ? kh.soTien.toLocaleString("vi-VN") : 0} VNĐ\n`;
    });
  }
  
  if (data.cong !== undefined) {
    msg += ` - Cộng các khoản: ${data.cong.toLocaleString("vi-VN")} VNĐ\n`;
  }
  if (data.bhxh !== undefined) {
    msg += ` - BHXH khấu trừ: ${data.bhxh.toLocaleString("vi-VN")} VNĐ\n`;
  }
  if (data.giamTruGiaCanh !== undefined) {
    msg += ` - Giảm trừ gia cảnh: ${data.giamTruGiaCanh.toLocaleString("vi-VN")} VNĐ\n`;
  }
  if (data.thuNhapTinhThue !== undefined) {
    msg += ` - Thu nhập tính cập nhật khác: ${data.thuNhapTinhThue.toLocaleString("vi-VN")} VNĐ\n`;
  }
  if (data.thueTNCN !== undefined) {
    msg += `💰 *Thông tin nội bộ khác tạm khấu trừ:* *${data.thueTNCN.toLocaleString("vi-VN")}* VNĐ\n`;
  }
  
  msg += `\n---------------------------------\n`;
  
  return msg;
}
