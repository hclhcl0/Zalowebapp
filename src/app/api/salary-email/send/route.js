import { EmailPool } from "@/lib/emailPool";
import { generateSalaryEmail } from "@/lib/salaryEmailTemplate";
import { sendTextMessage } from "@/lib/zalo";
import { generateSalaryZaloMessage } from "@/lib/zaloMessageTemplates";
import { prisma } from "@/lib/prisma";

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
  if (record.zaloUserId !== undefined) {
    return record.zaloUserId || null;
  }

  const normName = normalizeName(record.tenNhanVien);
  if (normName) {
    const staffLink = await prisma.staffZaloLink.findUnique({ where: { staffName: normName } });
    if (staffLink) return staffLink.zaloUserId;
  }

  const phone = cleanPhone(record.phone || record.sdt);
  if (phone) {
    const possibleFormats = [phone];
    if (phone.startsWith("0")) {
      possibleFormats.push("84" + phone.slice(1));
      possibleFormats.push("+84" + phone.slice(1));
    }
    const followers = await prisma.follower.findMany({
      where: { phone: { in: possibleFormats } }
    });
    if (followers.length > 0) {
      const staffFollower = followers.find(f => f.userType === "staff");
      if (staffFollower) return staffFollower.zaloUserId;
      return followers[0].zaloUserId;
    }
  }

  if (normName) {
    const followers = await prisma.follower.findMany();
    const match = followers.find(f => normalizeName(f.displayName) === normName);
    if (match) return match.zaloUserId;
  }

  return null;
}


export async function POST(req) {
  const body = await req.json();
  const { records, accounts, subject, batchSize = 10, batchDelayMs = 2000, customMessage, channel = "email" } = body;

  if (!records?.length) return new Response("Không có dữ liệu nhân viên.", { status: 400 });
  
  if (channel !== "zalo" && !accounts?.length) {
    return new Response("Cần ít nhất 1 tài khoản Gmail để gửi email.", { status: 400 });
  }

  // Dùng EmailPool mới — có SMTP pooling và retry tự động
  const pool = (channel === "email" || channel === "both") && accounts?.length
    ? new EmailPool(accounts)
    : null;

  const emailSubject = subject || "Thông báo lương quý - CDC Đà Nẵng";

  const stream = new ReadableStream({
    async start(controller) {
      enc(controller, { type: "start", total: records.length });
      try {
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
              const zaloUserId = await findZaloUserId(record);
              if (!zaloUserId) {
                throw new Error("Không tìm thấy Zalo User ID (cán bộ chưa quan tâm OA hoặc thông tin chưa đồng bộ).");
              }
              const zaloMsg = generateSalaryZaloMessage(record, { quarterTitle: emailSubject, customMessage });
              const zaloRes = await sendTextMessage(zaloUserId, zaloMsg);
              if (zaloRes.error !== 0) {
                throw new Error(`Zalo API error: ${zaloRes.message} (Mã: ${zaloRes.error})`);
              }
              sentViaList.push("Zalo");
            }

            // 2. GỬI QUA GMAIL (dùng pool.sendMail có retry)
            if (pool && (channel === "email" || channel === "both")) {
              const account = pool.next();
              const html = generateSalaryEmail(record, { quarterTitle: emailSubject, customMessage });
              await pool.sendMail(account.id, {
                from: `"CDC Đà Nẵng - Phòng TCHC" <${account.user}>`,
                to: record.email,
                subject: emailSubject,
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
      } finally {
        pool?.closeAll();
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
}
