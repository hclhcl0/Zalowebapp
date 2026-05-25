/**
 * POST /api/salary-email/send-custom
 * Nhận record, mapping và pool Gmail để gửi email tuỳ chỉnh hàng loạt (dùng SSE)
 */
import { EmailPool } from "@/lib/emailPool";
import { generateCustomEmail } from "@/lib/customEmailTemplate";
import { sendTextMessage } from "@/lib/zalo";
import { generateCustomZaloMessage } from "@/lib/zaloMessageTemplates";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

function enc(controller, data) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function cleanPhone(p) {
  if (!p) return "";
  let cleaned = String(p).replace(/[^\d]/g, "");
  if (cleaned.startsWith("84") && cleaned.length > 9) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

function normalizeName(n) {
  return String(n || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

async function findZaloUserId(record, columnMapping) {
  if (record.zaloUserId) return record.zaloUserId;

  // 1. Tìm theo số điện thoại từ mapping cột nếu có
  let rawPhone = "";
  if (columnMapping && columnMapping.phoneCol) {
    rawPhone = record.data?.[columnMapping.phoneCol] || "";
  }
  if (!rawPhone && record.phone) {
    rawPhone = record.phone;
  }
  
  const phone = cleanPhone(rawPhone);
  if (phone) {
    const follower = await prisma.follower.findFirst({
      where: { phone: { contains: phone } }
    });
    if (follower) return follower.zaloUserId;
  }

  // 2. Tìm theo tên nhân viên (không dấu, chữ thường)
  const normName = normalizeName(record.tenNhanVien);
  if (normName) {
    const followers = await prisma.follower.findMany();
    const match = followers.find(f => normalizeName(f.displayName) === normName);
    if (match) return match.zaloUserId;
  }

  return null;
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
      emailTitle,
      channel = "email"
    } = body;

    if (!records?.length) {
      return new Response("Không có dữ liệu nhân viên.", { status: 400 });
    }
    
    if (channel !== "zalo" && !accounts?.length) {
      return new Response("Cần ít nhất 1 tài khoản Gmail để gửi email.", { status: 400 });
    }
    
    if (!columnMapping?.nameCol || (channel !== "zalo" && !columnMapping?.emailCol)) {
      return new Response("Thiếu cột họ tên hoặc email trong mapping.", { status: 400 });
    }

    const transporters = new Map();
    if (channel === "email" || channel === "both") {
      for (const acc of accounts) {
        transporters.set(
          acc.id,
          nodemailer.createTransport({
            service: "gmail",
            auth: { user: acc.user, pass: acc.appPassword },
          })
        );
      }
    }

    const pool = accounts?.length ? new EmailPool(accounts) : null;
    const finalSubject = subject || emailTitle || "Thông báo lương - CDC Đà Nẵng";
    const finalTitle = emailTitle || subject || "Thông báo lương - CDC Đà Nẵng";

    const stream = new ReadableStream({
      async start(controller) {
        enc(controller, { type: "start", total: records.length });

        for (let i = 0; i < records.length; i++) {
          if (req.signal.aborted) break;
          const record = records[i];
          
          let result = { 
            tenNhanVien: record.tenNhanVien, 
            email: record.email || "", 
            status: "success", 
            sentVia: "" 
          };
          let sentViaList = [];

          try {
            // 1. GỬI QUA ZALO
            if (channel === "zalo" || channel === "both") {
              const zaloUserId = await findZaloUserId(record, columnMapping);
              if (!zaloUserId) {
                throw new Error("Không tìm thấy Zalo User ID (cán bộ chưa quan tâm OA hoặc thông tin chưa đồng bộ).");
              }
              const zaloMsg = generateCustomZaloMessage(record, {
                emailTitle: finalTitle,
                columnMapping,
                customMessage,
                footerNote,
              });
              const zaloRes = await sendTextMessage(zaloUserId, zaloMsg);
              if (zaloRes.error !== 0) {
                throw new Error(`Zalo API error: ${zaloRes.message} (Mã: ${zaloRes.error})`);
              }
              sentViaList.push("Zalo");
            }

            // 2. GỬI QUA GMAIL
            if (channel === "email" || channel === "both") {
              const account = pool.next();
              const transporter = transporters.get(account.id);
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
              sentViaList.push(`Gmail (${account.user})`);
            }

            result.status = "success";
            result.sentVia = sentViaList.join(" & ");
          } catch (err) {
            result.status = "error";
            result.sentVia = sentViaList.length ? sentViaList.join(" & ") : (channel === "zalo" ? "Zalo" : "Gmail");
            result.error = err.message;
          }

          enc(controller, { type: "progress", index: i + 1, total: records.length, result });

          if (batchSize > 0 && (i + 1) % batchSize === 0 && i < records.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
          }
        }

        enc(controller, { type: "done", stats: pool ? pool.getStats() : { sentCount: 0 } });
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
      let email = "";
      if (columnMapping.emailCol) {
        email = String(rowObj[columnMapping.emailCol] || "").trim();
      }
      const phone = columnMapping.phoneCol ? String(rowObj[columnMapping.phoneCol] || "").trim() : "";
      const zaloId = columnMapping.zaloIdCol ? String(rowObj[columnMapping.zaloIdCol] || "").trim() : "";

      if (!name) continue;
      
      let validEmail = email;
      if (email && !email.includes("@")) {
        validEmail = ""; // Invalid email
      }

      // Require at least one valid contact method (Email, Phone, or Zalo ID)
      if (!validEmail && !phone && !zaloId) continue;

      const deptKeywords = ["phòng", "ban ", "khoa", "tổ ", "đội ", "tổng cộng", "cộng"];
      if (deptKeywords.some((k) => name.toLowerCase().startsWith(k))) continue;

      const data = {};
      (columnMapping.displayCols || []).forEach(({ key }) => {
        data[key] = rowObj[key];
      });
      if (columnMapping.totalCol) {
        data[columnMapping.totalCol] = rowObj[columnMapping.totalCol];
      }

      const extraFields = {};
      if (columnMapping.zaloIdCol) {
        extraFields[columnMapping.zaloIdCol] = rowObj[columnMapping.zaloIdCol];
      }
      if (columnMapping.phoneCol) {
        extraFields[columnMapping.phoneCol] = rowObj[columnMapping.phoneCol];
      }

      records.push({
        id: `${i}`,
        tenNhanVien: name,
        email,
        ...extraFields,
        data,
      });
    }

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[send-custom/parse-custom-excel]", err);
    return NextResponse.json({ error: "Lỗi xử lý file Excel: " + err.message }, { status: 500 });
  }
}
