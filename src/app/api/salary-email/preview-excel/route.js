/**
 * POST /api/salary-email/preview-excel
 * Nhận file Excel tùy chỉnh → trả về headers + dữ liệu mẫu cho tab Custom
 */
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

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

    // Tìm hàng header đầu tiên có ít nhất 2 ô không trống
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(allRows.length, 15); i++) {
      const nonEmpty = allRows[i].filter((c) => String(c || "").trim() !== "").length;
      if (nonEmpty >= 2) { headerRowIndex = i; break; }
    }

    const topRow = (allRows[headerRowIndex] || []).map((h) => String(h || "").trim());
    const nextRow = (allRows[headerRowIndex + 1] || []).map((h) => String(h || "").trim());

    // Phát hiện sub-header (merged cells)
    let isSubHeader = false;
    let currentTop = "";
    const maxLen = Math.max(topRow.length, nextRow.length);
    for (let i = 0; i < maxLen; i++) {
      const t = topRow[i] || "";
      const n = nextRow[i] || "";
      if (t !== "") currentTop = t;
      if (t === "" && currentTop !== "" && n !== "") { isSubHeader = true; break; }
    }

    const headerMap = [];
    currentTop = "";
    for (let i = 0; i < maxLen; i++) {
      const t = topRow[i] || "";
      const n = nextRow[i] || "";
      if (t !== "") currentTop = t;
      let headerName = currentTop;
      if (isSubHeader && n !== "") {
        headerName = (currentTop && currentTop !== n) ? `${currentTop} - ${n}` : n;
      }
      if (headerName !== "" && !headerMap.some((h) => h.name === headerName))
        headerMap.push({ index: i, name: headerName });
    }

    const headers = headerMap.map((h) => h.name);
    const dataStartIdx = headerRowIndex + (isSubHeader ? 2 : 1);
    const previewRaw = allRows.slice(dataStartIdx, dataStartIdx + 5);
    const previewRows = previewRaw.map((row) => {
      const obj = {};
      headerMap.forEach(({ index, name }) => { obj[name] = row[index] ?? ""; });
      return obj;
    });

    return NextResponse.json({
      success: true, headers, rows: previewRows,
      totalRows: Math.max(0, allRows.length - dataStartIdx),
      headerRowIndex, isSubHeader,
      sheets, selectedSheet: sheetName
    });
  } catch (err) {
    console.error("[salary-email/preview-excel]", err);
    return NextResponse.json({ error: "Lỗi khi đọc file: " + err.message }, { status: 500 });
  }
}
