/**
 * POST /api/salary-email/send-custom
 * Nhận record, mapping và pool Gmail để gửi email tuỳ chỉnh hàng loạt (dùng SSE)
 */
import { EmailPool } from "@/lib/emailPool";
import { generateCustomEmail } from "@/lib/customEmailTemplate";
import nodemailer from "nodemailer";

function enc(controller, data) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      records,
      accounts,
      columnMapping,
      subject,
      batchSize = 10,
      batchDelayMs = 2000,
      customMessage,
      footerNote,
      emailTitle
    } = body;

    if (!records?.length) {
      return new Response("Không có dữ liệu nhân viên.", { status: 400 });
    }
    if (!accounts?.length) {
      return new Response("Cần ít nhất 1 tài khoản Gmail.", { status: 400 });
    }
    if (!columnMapping?.nameCol || !columnMapping?.emailCol) {
      return new Response("Thiếu cột họ tên hoặc email trong mapping.", { status: 400 });
    }

    const transporters = new Map();
    for (const acc of accounts) {
      transporters.set(
        acc.id,
        nodemailer.createTransport({
          service: "gmail",
          auth: { user: acc.user, pass: acc.appPassword },
        })
      );
    }

    const pool = new EmailPool(accounts);
    const finalSubject = subject || emailTitle || "Thông báo lương - CDC Đà Nẵng";
    const finalTitle = emailTitle || subject || "Thông báo lương - CDC Đà Nẵng";

    const stream = new ReadableStream({
      async start(controller) {
        enc(controller, { type: "start", total: records.length });

        for (let i = 0; i < records.length; i++) {
          if (req.signal.aborted) break;
          const record = records[i];
          const account = pool.next();
          const transporter = transporters.get(account.id);

          let result;
          try {
            const html = generateCustomEmail(record, {
              emailTitle: finalTitle,
              columnMapping,
              customMessage,
              footerNote,
            });
            await transporter.sendMail({
              from: `"CDC Đà Nẵng - Phòng TCHC" <${account.user}>`,
              to: record.email,
              subject: finalSubject,
              html,
            });
            result = {
              tenNhanVien: record.tenNhanVien,
              email: record.email,
              status: "success",
              sentVia: account.user,
            };
          } catch (err) {
            result = {
              tenNhanVien: record.tenNhanVien,
              email: record.email,
              status: "error",
              sentVia: account.user,
              error: err.message,
            };
          }

          enc(controller, { type: "progress", index: i + 1, total: records.length, result });

          if (batchSize > 0 && (i + 1) % batchSize === 0 && i < records.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
          }
        }

        enc(controller, { type: "done", stats: pool.getStats() });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[send-custom-emails]", err);
    return new Response("Lỗi hệ thống: " + err.message, { status: 500 });
  }
}

/**
 * PUT /api/salary-email/send-custom
 * Xử lý file Excel tùy chỉnh (dùng base64) và mapping để parse ra danh sách records
 */
import * as XLSX from "xlsx";

function normalizeVi(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { fileBase64, headerRowIndex, isSubHeader, columnMapping } = body;

    const binaryStr = atob(fileBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const workbook = XLSX.read(bytes, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const topRow = (allRows[headerRowIndex] || []).map((h) => String(h || "").trim());
    const nextRow = (allRows[headerRowIndex + 1] || []).map((h) => String(h || "").trim());

    let actualIsSubHeader = isSubHeader || false;
    if (isSubHeader === undefined) {
      let currentTop = "";
      const maxLen = Math.max(topRow.length, nextRow.length);
      for (let i = 0; i < maxLen; i++) {
        const t = topRow[i] || "";
        const n = nextRow[i] || "";
        if (t !== "") currentTop = t;
        if (t === "" && currentTop !== "" && n !== "") {
          actualIsSubHeader = true;
          break;
        }
      }
    }

    const headerMap = [];
    let currentTop = "";
    const maxLen = Math.max(topRow.length, nextRow.length);
    for (let i = 0; i < maxLen; i++) {
      const t = topRow[i] || "";
      const n = nextRow[i] || "";
      if (t !== "") currentTop = t;
      let headerName = currentTop;
      if (actualIsSubHeader && n !== "") {
        if (currentTop && currentTop !== n) {
          headerName = `${currentTop} - ${n}`;
        } else {
          headerName = n;
        }
      }
      if (headerName !== "" && !headerMap.some((h) => h.name === headerName)) {
        headerMap.push({ index: i, name: headerName });
      }
    }

    const records = [];
    const dataStartIdx = headerRowIndex + (actualIsSubHeader ? 2 : 1);
    for (let i = dataStartIdx; i < allRows.length; i++) {
      const row = allRows[i];
      const rowObj = {};
      headerMap.forEach(({ index, name }) => {
        rowObj[name] = row[index] ?? "";
      });

      const name = String(rowObj[columnMapping.nameCol] || "").trim();
      const email = String(rowObj[columnMapping.emailCol] || "").trim();
      if (!name || !email || !email.includes("@")) continue;

      const deptKeywords = ["phòng", "ban ", "khoa", "tổ ", "đội ", "tổng cộng", "cộng"];
      if (deptKeywords.some((k) => name.toLowerCase().startsWith(k))) continue;

      const data = {};
      (columnMapping.displayCols || []).forEach(({ key }) => {
        data[key] = rowObj[key];
      });
      if (columnMapping.totalCol) {
        data[columnMapping.totalCol] = rowObj[columnMapping.totalCol];
      }

      records.push({
        id: `${i}`,
        tenNhanVien: name,
        email,
        data,
      });
    }

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[send-custom/parse-custom-excel]", err);
    return NextResponse.json({ error: "Lỗi xử lý file Excel: " + err.message }, { status: 500 });
  }
}
