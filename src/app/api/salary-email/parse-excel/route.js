/**
 * POST /api/salary-email/parse-excel
 * Nhận file Excel thông tin nội bộ quý → parse danh sách nhân viên + thông tin nội bộ
 */
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanPhone(p) {
  if (!p) return null;
  const s = String(p).replace(/\D/g, "");
  if (s.startsWith("84")) return "0" + s.slice(2);
  if (s.startsWith("0")) return s;
  return "0" + s;
}

function normalizeName(n) {
  return String(n || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function readVal(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  const n = parseFloat(s);
  return isNaN(n) ? s : n;
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const sheetNameParam = formData.get("sheetName");

    if (!file) return NextResponse.json({ error: "Không tìm thấy file." }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? ""))
      return NextResponse.json({ error: "Chỉ hỗ trợ .xlsx, .xls, .csv" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheets = workbook.SheetNames;
    const sheetName = sheetNameParam && sheets.includes(sheetNameParam) ? sheetNameParam : sheets[0];
    const sheet = workbook.Sheets[sheetName];
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    // Tìm hàng tiêu đề
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(allRows.length, 10); i++) {
      const rowStr = JSON.stringify(allRows[i]).toLowerCase();
      if (rowStr.includes("họ và tên") || rowStr.includes("địa chỉ mail") || rowStr.includes("email")) {
        headerRowIndex = i;
        break;
      }
    }
    if (headerRowIndex === -1)
      return NextResponse.json({ error: "Không tìm thấy hàng tiêu đề hợp lệ. Vui lòng kiểm tra lại tên cột." }, { status: 400 });

    const headers = allRows[headerRowIndex];
    const subHeaders = allRows[headerRowIndex + 1];

    const findCol = (keywords, fromIndex = 0) =>
      headers.findIndex((h, idx) => idx >= fromIndex && keywords.some((k) => String(h || "").toLowerCase().includes(k.toLowerCase())));
    const findSubCol = (keyword, startSearchIdx) => {
      if (!subHeaders) return -1;
      for (let i = startSearchIdx; i < subHeaders.length; i++) {
        if (String(subHeaders[i] || "").toLowerCase().includes(keyword.toLowerCase())) return i;
      }
      return -1;
    };

    const idxName  = findCol(["Họ và tên", "TenNhanVien", "tenNhanVien"]);
    const idxEmail = findCol(["Địa chỉ mail", "email", "Email"]);
    const idxTotal = findCol(["Thành tiền", "tongThuNhap", "Tổng thu nhập"]);
    const idxZalo  = findCol(["zalo id", "zalo_id", "zaloid", "zalo userid", "zalo user id", "id zalo", "zalo"]);
    const idxPhone = findCol(["Điện thoại", "SDT", "Phone", "SĐT", "Số điện thoại"]);
    const idxMonth1 = findCol(["Tháng 1", "Tháng 01", "heSoLieuT1"]);
    const idxMonth2 = findCol(["Tháng 2", "Tháng 02", "heSoLieuT2"], idxMonth1 + 1);
    const idxMonth3 = findCol(["Tháng 3", "Tháng 03", "heSoLieuT3"], idxMonth2 + 1);

    const hasSubHdr = subHeaders && JSON.stringify(subHeaders).includes("Hệ số");
    const startDataIdx = hasSubHdr ? headerRowIndex + 2 : headerRowIndex + 1;

    // Tải trước Followers và Links để đối chiếu tự động
    const allFollowers = await prisma.follower.findMany();
    const allLinks = await prisma.staffZaloLink.findMany();

    const records = [];

    for (let i = startDataIdx; i < allRows.length; i++) {
      const row = allRows[i];
      const name = String(row[idxName] || "").trim();
      const email = String(row[idxEmail] || "").trim();
      if (!name) continue;
      const deptKeywords = ["Phòng", "Ban ", "Khoa", "Tổ ", "Đội "];
      if (deptKeywords.some((k) => name.toLowerCase().startsWith(k.toLowerCase())) || name.toLowerCase().includes("giám đốc")) continue;
      if (!email || !email.includes("@")) continue;

      const phone = idxPhone !== -1 ? String(row[idxPhone] || "").trim() : "";
      const phoneVal = phone ? cleanPhone(phone) : null;
      const normName = normalizeName(name);

      let targetZaloId = idxZalo !== -1 ? String(row[idxZalo] || "").trim() : null;

      // Logic tự động đối chiếu
      if (!targetZaloId) {
        let match = null;
        if (phoneVal) {
          match = allFollowers.find(f => cleanPhone(f.phone) === phoneVal);
        }
        if (!match) {
          match = allFollowers.find(f => normalizeName(f.displayName) === normName);
        }
        if (match) {
          targetZaloId = match.zaloUserId;
        }
      }

      // Lưu tự động vào DB nếu khớp Zalo ID
      if (targetZaloId) {
        const existingLink = allLinks.find(l => l.zaloUserId === targetZaloId);
        const needsUpdate = !existingLink || 
                            existingLink.staffNameRaw !== name || 
                            (phoneVal && existingLink.phone !== phoneVal);

        if (needsUpdate) {
          try {
            await prisma.staffZaloLink.upsert({
              where: { zaloUserId: targetZaloId },
              update: {
                staffNameRaw: name,
                staffName: normName,
                ...(phoneVal && { phone: phoneVal }),
              },
              create: {
                staffNameRaw: name,
                staffName: normName,
                zaloUserId: targetZaloId,
                phone: phoneVal,
              }
            });

            await prisma.follower.update({
              where: { zaloUserId: targetZaloId },
              data: { userType: "staff" }
            }).catch(() => {});
          } catch (err) {
            console.error("Auto link Zalo error for " + name + ":", err);
          }
        }
      }

      let idxXL1 = -1, idxXL2 = -1, idxXL3 = -1;
      const idxKqXepLoai = findCol(["Kết quả xếp loại", "Xếp loại"], idxMonth3 + 1);
      if (idxKqXepLoai !== -1 && subHeaders && String(subHeaders[idxKqXepLoai] || "").toLowerCase().includes("tháng")) {
        idxXL1 = idxKqXepLoai; idxXL2 = idxKqXepLoai + 2; idxXL3 = idxKqXepLoai + 4;
      } else {
        idxXL1 = findSubCol("Tháng 1", idxMonth3 + 1);
        idxXL2 = findSubCol("Tháng 2", idxMonth3 + 1);
        idxXL3 = findSubCol("Tháng 3", idxMonth3 + 1);
        if (idxXL1 === -1) idxXL1 = findCol(["xepLoaiT1", "Xếp loại tháng 1", "Tháng 1"], idxMonth3 + 1);
        if (idxXL2 === -1) idxXL2 = findCol(["xepLoaiT2", "Xếp loại tháng 2", "Tháng 2"], idxMonth3 + 1);
        if (idxXL3 === -1) idxXL3 = findCol(["xepLoaiT3", "Xếp loại tháng 3", "Tháng 3"], idxMonth3 + 1);
      }

      const tongHeSoT1 = Number(readVal(row[idxMonth1 + 3])) || 0;
      const tongHeSoT2 = Number(readVal(row[idxMonth2 + 3])) || 0;
      const tongHeSoT3 = Number(readVal(row[idxMonth3 + 3])) || 0;
      const heSoXepLoaiT1 = Number(readVal(row[idxXL1 + 1])) || 0;
      const heSoXepLoaiT2 = Number(readVal(row[idxXL2 + 1])) || 0;
      const heSoXepLoaiT3 = Number(readVal(row[idxXL3 + 1])) || 0;

      records.push({
        tenNhanVien: name, email,
        phone: phone || undefined,
        zaloUserId: targetZaloId || undefined,
        heSoLieuT1: readVal(row[idxMonth1] || row[idxMonth1 + 1]),
        pcvkT1: readVal(row[idxMonth1 + 1]),
        pccvT1: readVal(row[idxMonth1 + 2]),
        tongHeSoT1,
        heSoLieuT2: readVal(row[idxMonth2]),
        pcvkT2: readVal(row[idxMonth2 + 1]),
        pccvT2: readVal(row[idxMonth2 + 2]),
        tongHeSoT2,
        heSoLieuT3: readVal(row[idxMonth3]),
        pcvkT3: readVal(row[idxMonth3 + 1]),
        pccvT3: readVal(row[idxMonth3 + 2]),
        tongHeSoT3,
        xepLoaiT1: String(row[idxXL1] || ""),
        xepLoaiT2: String(row[idxXL2] || ""),
        xepLoaiT3: String(row[idxXL3] || ""),
        heSoXepLoaiT1, heSoXepLoaiT2, heSoXepLoaiT3,
        thanhTienT1: tongHeSoT1 * heSoXepLoaiT1 * 2340000,
        thanhTienT2: tongHeSoT2 * heSoXepLoaiT2 * 2340000,
        thanhTienT3: tongHeSoT3 * heSoXepLoaiT3 * 2340000,
        tongThuNhap: readVal(row[idxTotal]),
      });
    }

    return NextResponse.json({ success: true, total: records.length, records, sheets, selectedSheet: sheetName });
  } catch (err) {
    console.error("[salary-email/parse-excel]", err);
    return NextResponse.json({ error: "Lỗi khi xử lý file: " + err.message }, { status: 500 });
  }
}
