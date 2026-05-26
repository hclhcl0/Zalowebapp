/**
 * POST /api/salary-email/parse-tax-excel
 * Nhận file Excel thuế TNCN → parse danh sách nhân viên + thông tin thuế
 */
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function normalizeVi(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

function findIdx(headerRow, keywords) {
  return headerRow.findIndex((h) => {
    const norm = normalizeVi(toStr(h));
    return keywords.some((k) => norm.includes(normalizeVi(k)));
  });
}

function findIdxExact(headerRow, keywords) {
  return headerRow.findIndex((h) => {
    const norm = normalizeVi(toStr(h));
    return keywords.some((k) => norm === normalizeVi(k));
  });
}

function extractThang(rows) {
  for (const row of rows.slice(0, 3)) {
    for (const cell of row) {
      const s = toStr(cell);
      const match = s.match(/(\d{1,2}\/\d{4})/);
      if (match) return match[1];
    }
  }
  return "";
}

function autoDetectEmailCol(dataRows, startCol = 0) {
  const sampleRows = dataRows.slice(0, 10);
  const colCount = Math.max(...sampleRows.map((r) => r.length));
  for (let c = startCol; c < colCount; c++) {
    let emailCount = 0;
    for (const row of sampleRows) {
      const v = toStr(row[c]);
      if (v.includes("@") && v.includes(".")) emailCount++;
    }
    if (emailCount >= Math.floor(sampleRows.length * 0.5)) return c;
  }
  return -1;
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

    if (allRows.length < 3) return NextResponse.json({ error: "File không có đủ dữ liệu." }, { status: 400 });

    const thang = extractThang(allRows);

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(allRows.length, 5); i++) {
      const rowNorm = normalizeVi(JSON.stringify(allRows[i]));
      if (rowNorm.includes("ho va ten") || rowNorm.includes("ten nhan vien") || rowNorm.includes("ho ten")) {
        headerRowIdx = i; break;
      }
    }
    if (headerRowIdx === -1) headerRowIdx = 1;

    const headerRow = allRows[headerRowIdx];
    const dataRows = allRows.slice(headerRowIdx + 1);

    const idxName = findIdx(headerRow, ["ho va ten", "ho ten", "ten nhan vien"]);
    const idxSoTK = findIdx(headerRow, ["so tk", "tai khoan", "so tai khoan"]);
    const idxCong = findIdxExact(headerRow, ["cong", "tong cong"]);
    const idxBHXH = findIdx(headerRow, ["bhxh"]);
    const idxGiamTru = findIdx(headerRow, ["giam tru"]);
    const idxTNTT = findIdx(headerRow, ["thu nhap tinh thue", "tntt"]);
    const idxThue = findIdx(headerRow, ["thue tncn", "thue phai nop"]);
    const idxZalo = findIdx(headerRow, ["zalo id", "zalo_id", "zaloid", "zalo userid", "zalo user id", "id zalo", "zalo"]);

    let idxEmail = findIdx(headerRow, ["email", "dia chi mail", "dia chi email"]);
    if (idxEmail === -1) idxEmail = autoDetectEmailCol(dataRows, idxThue > 0 ? idxThue + 1 : 0);

    if (idxName === -1)
      return NextResponse.json({ error: `Không tìm thấy cột 'Họ và Tên'. Header: ${headerRow.map(toStr).join(" | ")}` }, { status: 400 });

    const titleRow = allRows[0] ?? [];
    const khoanStartIdx = (idxSoTK !== -1 ? idxSoTK : 3) + 1;
    const khoanEndIdx = idxCong !== -1 ? idxCong - 1 : idxName + 10;
    const khoanHeaders = [];
    for (let c = khoanStartIdx; c <= khoanEndIdx; c++) {
      let ten = toStr(headerRow[c]);
      if (!ten) ten = toStr(titleRow[c]);
      if (!ten) continue;
      ten = ten.split(/\r\n|\n/)[0].trim();
      khoanHeaders.push({ idx: c, ten });
    }

    const records = [];
    for (const row of dataRows) {
      const name = toStr(row[idxName]);
      if (!name) continue;
      const nameNorm = normalizeVi(name);
      if (["cong", "tong", "phong", "ban ", "khoa", "to ", "giam doc"].some((k) => nameNorm.startsWith(k) || nameNorm.includes(k))) continue;

      let email = idxEmail !== -1 ? toStr(row[idxEmail]) : "";
      if (!email.includes("@") && idxEmail !== -1 && idxEmail + 1 < row.length) {
        const alt = toStr(row[idxEmail + 1]);
        if (alt.includes("@")) email = alt;
      }
      if (!email || !email.includes("@")) continue;

      const khoans = khoanHeaders.map((kh) => ({ ten: kh.ten, soTien: toNum(row[kh.idx]) }));

      records.push({
        phong: toStr(row[0]),
        tenNhanVien: name,
        zaloUserId: idxZalo !== -1 ? toStr(row[idxZalo]) : undefined,
        soTK: toStr(idxSoTK !== -1 ? row[idxSoTK] : ""),
        email, khoans, thang,
        cong: toNum(idxCong !== -1 ? row[idxCong] : undefined),
        bhxh: toNum(idxBHXH !== -1 ? row[idxBHXH] : undefined),
        giamTruGiaCanh: toNum(idxGiamTru !== -1 ? row[idxGiamTru] : undefined),
        thuNhapTinhThue: toNum(idxTNTT !== -1 ? row[idxTNTT] : undefined),
        thueTNCN: toNum(idxThue !== -1 ? row[idxThue] : undefined),
      });
    }

    return NextResponse.json({ success: true, total: records.length, records, thang, sheets, selectedSheet: sheetName });
  } catch (err) {
    console.error("[salary-email/parse-tax-excel]", err);
    return NextResponse.json({ error: "Lỗi khi xử lý file: " + err.message }, { status: 500 });
  }
}
