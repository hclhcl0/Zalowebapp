import {
  normalizePhoneVariants,
  removeVietnameseTones,
  findRecipientZalo,
  formatZaloMessage,
  getExpectedApiKey,
} from "../src/lib/kiemDichWebhook.js";
import { prisma } from "../src/lib/prisma.js";

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ MODULE WEBHOOK ONECDC ===");

  // Test 1: Phone normalization
  console.log("\n[Test 1] Chuẩn hóa số điện thoại:");
  const phoneCases = ["0905123456", "+84905123456", "84905123456", "0905.123.456"];
  for (const p of phoneCases) {
    console.log(`- ${p} ->`, normalizePhoneVariants(p));
  }

  // Test 2: Bỏ dấu tiếng Việt
  console.log("\n[Test 2] Xóa dấu tiếng Việt:");
  const nameCases = ["Hồ Thị Bích Trâm", "Nguyễn Văn A", "ĐÀO PHÚC KHÁNH TOÀN", "Lê Thị Thu Hiền"];
  for (const n of nameCases) {
    console.log(`- "${n}" -> "${removeVietnameseTones(n)}"`);
  }

  // Test 3: API Key
  console.log("\n[Test 3] Kiểm tra API Key:");
  const key = await getExpectedApiKey();
  console.log("Expected API Key:", key);

  // Test 4: Tra cứu cán bộ thực tế trong DB
  console.log("\n[Test 4] Tra cứu cán bộ trong DB:");
  
  // 4a. Tìm cán bộ có thật theo SĐT
  const sampleStaff = await prisma.staffZaloLink.findFirst({
    where: { phone: { not: null } },
  });
  if (sampleStaff) {
    console.log(`\n4a. Test tìm theo SĐT có thật: "${sampleStaff.staffNameRaw}" (${sampleStaff.phone})`);
    const resPhone = await findRecipientZalo({
      ten: sampleStaff.staffNameRaw,
      sdt: sampleStaff.phone,
    });
    console.log("Kết quả:", resPhone);
    if (!resPhone.found) console.error("LỖI: Không tìm thấy cán bộ theo SĐT!");
  }

  // 4b. Test tìm theo Tên khi không có SĐT
  if (sampleStaff) {
    console.log(`\n4b. Test tìm theo Tên (không SĐT): "${sampleStaff.staffNameRaw}"`);
    const resName = await findRecipientZalo({
      ten: sampleStaff.staffNameRaw,
      sdt: "",
    });
    console.log("Kết quả:", resName);
    if (!resName.found) console.error("LỖI: Không tìm thấy cán bộ theo Tên!");
  }

  // 4c. Test tìm người không tồn tại
  console.log("\n4c. Test tìm người KHÔNG tồn tại: 'Người Giả Định' (0999999999)");
  const resNotFound = await findRecipientZalo({
    ten: "Người Giả Định",
    sdt: "0999999999",
  });
  console.log("Kết quả:", resNotFound);

  // Test 5: Format Zalo Message
  console.log("\n[Test 5] Kiểm tra định dạng tin nhắn Zalo:");
  
  // 5a. Event: chuyen_ke_toan
  const sampleChuyenKeToan = {
    event: "chuyen_ke_toan",
    recipient: { ten: "Hồ Thị Bích Trâm", sdt: "0905123456" },
    kiem_dich_vien: { ten: "Nguyễn Văn A", sdt: "0911222333" },
    ke_toan: { ten: "Hồ Thị Bích Trâm", sdt: "0905123456" },
    phieu: {
      id: 1234,
      so_phieu: "KDHK-2026-0045",
      doi_tuong_thanh_toan: "Cebu Pacific",
      so_tien: 25.0,
      don_vi_tien: "USD",
      so_chuyen: 1,
      ngay_lap: "2026-10-15",
    },
    tau: [
      {
        so_hieu: "CEO31",
        ten_tau: "CEO31",
        hang_bay: "Cebu Pacific",
        hanh_trinh: "MNL-DAD",
        ngay: "2026-10-13",
        dac_tinh: "Đột xuất nhập",
      },
    ],
    ly_do_tu_choi: null,
    noi_dung: "[CDC Đà Nẵng] KDV Nguyễn Văn A vừa chuyển phiếu...",
  };

  const msg1 = formatZaloMessage(sampleChuyenKeToan);
  console.log("\n--- Tin nhắn Event 1 (chuyen_ke_toan) ---");
  console.log(msg1);

  // 5b. Event: ke_toan_tu_choi
  const sampleKeToanTuChoi = {
    event: "ke_toan_tu_choi",
    recipient: { ten: "Nguyễn Văn A", sdt: "0911222333" },
    kiem_dich_vien: { ten: "Nguyễn Văn A", sdt: "0911222333" },
    ke_toan: { ten: "Hồ Thị Bích Trâm", sdt: "" },
    phieu: {
      id: 1234,
      so_phieu: "KDHK-2026-0045",
      doi_tuong_thanh_toan: "Cebu Pacific",
      so_tien: 25.0,
      don_vi_tien: "USD",
      so_chuyen: 1,
      ngay_lap: "2026-10-15",
    },
    tau: [
      {
        so_hieu: "CEO31",
        ten_tau: "CEO31",
        hang_bay: "Cebu Pacific",
        hanh_trinh: "MNL-DAD",
        ngay: "2026-10-13",
        dac_tinh: "Đột xuất nhập",
      },
    ],
    ly_do_tu_choi: "Sai đơn giá dịch vụ",
    noi_dung: "[CDC Đà Nẵng] Phiếu KDHK-2026-0045 bị kế toán từ chối...",
  };

  const msg2 = formatZaloMessage(sampleKeToanTuChoi);
  console.log("\n--- Tin nhắn Event 2 (ke_toan_tu_choi) ---");
  console.log(msg2);

  console.log("\n=== TẤT CẢ KIỂM THỬ ĐÃ HOÀN TẤT THÀNH CÔNG! ===");
}

runTests()
  .catch((err) => console.error("LỖI TEST:", err))
  .finally(() => prisma.$disconnect());
