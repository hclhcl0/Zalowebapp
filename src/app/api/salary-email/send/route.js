/**
 * POST /api/salary-email/send
 * Gửi email báo lương theo danh sách từ Excel với SSE streaming
 */
import { EmailPool } from "@/lib/emailPool";
import { generateSalaryEmail } from "@/lib/salaryEmailTemplate";
import nodemailer from "nodemailer";

function enc(controller, data) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req) {
  const body = await req.json();
  const { records, accounts, subject, batchSize = 10, batchDelayMs = 2000, customMessage } = body;

  if (!records?.length) return new Response("Không có dữ liệu nhân viên.", { status: 400 });
  if (!accounts?.length) return new Response("Cần ít nhất 1 tài khoản Gmail.", { status: 400 });

  const transporters = new Map();
  for (const acc of accounts) {
    transporters.set(acc.id, nodemailer.createTransport({
      service: "gmail",
      auth: { user: acc.user, pass: acc.appPassword },
    }));
  }

  const pool = new EmailPool(accounts);
  const emailSubject = subject || "Thông báo lương quý - CDC Đà Nẵng";

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
          const html = generateSalaryEmail(record, { quarterTitle: emailSubject, customMessage });
          await transporter.sendMail({
            from: `"CDC Đà Nẵng - Phòng TCHC" <${account.user}>`,
            to: record.email,
            subject: emailSubject,
            html,
          });
          result = { tenNhanVien: record.tenNhanVien, email: record.email, status: "success", sentVia: account.user };
        } catch (err) {
          result = { tenNhanVien: record.tenNhanVien, email: record.email, status: "error", sentVia: account.user, error: err.message };
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
}
