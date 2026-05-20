/**
 * POST /api/salary-email/send-tax
 * Gửi email báo thuế TNCN hàng loạt với SSE progress streaming
 */
import { EmailPool } from "@/lib/emailPool";
import { generateTaxEmail } from "@/lib/taxEmailTemplate";
import { sendTextMessage } from "@/lib/zalo";
import { generateTaxZaloMessage } from "@/lib/zaloMessageTemplates";
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

async function findZaloUserId(record) {
  if (record.zaloUserId) return record.zaloUserId;

  // 1. Tìm theo số điện thoại
  const phone = cleanPhone(record.phone || record.sdt);
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
      subject,
      batchSize = 10,
      batchDelayMs = 2000,
      customMessage,
      showKhoanDetail = true,
      channel = "email"
    } = body;

    if (!records?.length) {
      return new Response("Không có dữ liệu nhân viên.", { status: 400 });
    }
    
    if (channel !== "zalo" && !accounts?.length) {
      return new Response("Cần ít nhất 1 tài khoản Gmail để gửi email.", { status: 400 });
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

          const emailTitle = subject || `Thông báo Thuế Thu Nhập Cá Nhân tháng ${record.thang}`;

          try {
            // 1. GỬI QUA ZALO
            if (channel === "zalo" || channel === "both") {
              const zaloUserId = await findZaloUserId(record);
              if (!zaloUserId) {
                throw new Error("Không tìm thấy Zalo User ID (cán bộ chưa quan tâm OA hoặc thông tin chưa đồng bộ).");
              }
              const zaloMsg = generateTaxZaloMessage(record, { quarterTitle: emailTitle, customMessage });
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
              const html = generateTaxEmail(record, {
                emailTitle,
                customMessage,
                showKhoanDetail,
              });
              await transporter.sendMail({
                from: `"CDC Đà Nẵng - Phòng Kế toán" <${account.user}>`,
                to: record.email,
                subject: emailTitle,
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
    console.error("[send-tax-emails]", err);
    return new Response("Lỗi hệ thống: " + err.message, { status: 500 });
  }
}
