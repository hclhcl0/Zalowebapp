/**
 * POST /api/salary-email/test-send
 * Gửi 1 email test đến địa chỉ chỉ định và trả về log chi tiết
 */
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const { toEmail, account } = body;

    if (!toEmail || !account?.user || !account?.appPassword) {
      return Response.json({ error: "Thiếu thông tin: toEmail, account.user, account.appPassword" }, { status: 400 });
    }

    const cleanPass = account.appPassword.replace(/\s/g, "");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      pool: false,
      auth: {
        user: account.user,
        pass: cleanPass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
      logger: false,
      debug: false,
    });

    // Bước 1: Verify kết nối SMTP
    let verifyResult = null;
    try {
      await transporter.verify();
      verifyResult = { ok: true, message: "Kết nối SMTP thành công ✅" };
    } catch (verifyErr) {
      return Response.json({
        step: "verify",
        ok: false,
        error: verifyErr.message,
        code: verifyErr.code,
        diagnosis: getDiagnosis(verifyErr),
      });
    }

    // Bước 2: Gửi email test
    let sendResult = null;
    try {
      const info = await transporter.sendMail({
        from: `"CDC Test" <${account.user}>`,
        to: toEmail,
        subject: `[TEST] Kiểm tra gửi email - ${new Date().toLocaleString("vi-VN")}`,
        html: `
          <div style="font-family: Arial; padding: 20px; max-width: 500px;">
            <h2 style="color: #1d4ed8;">✅ Email test thành công!</h2>
            <p>Đây là email kiểm tra từ hệ thống CDC Đà Nẵng.</p>
            <hr/>
            <p><strong>Từ tài khoản:</strong> ${account.user}</p>
            <p><strong>Gửi lúc:</strong> ${new Date().toLocaleString("vi-VN")}</p>
            <p style="color: #6b7280; font-size: 12px;">Nếu nhận được email này → hệ thống gửi email hoạt động bình thường.</p>
          </div>
        `,
        text: `Email test từ ${account.user} lúc ${new Date().toLocaleString("vi-VN")}`,
      });

      sendResult = {
        ok: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      };
    } catch (sendErr) {
      return Response.json({
        step: "sendMail",
        ok: false,
        verifyResult,
        error: sendErr.message,
        code: sendErr.code,
        responseCode: sendErr.responseCode,
        diagnosis: getDiagnosis(sendErr),
      });
    }

    transporter.close();

    return Response.json({
      ok: true,
      verifyResult,
      sendResult,
      summary: `Email đã được chấp nhận bởi Gmail SMTP → ${toEmail}. Kiểm tra hộp thư (kể cả Spam).`,
    });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

function getDiagnosis(err) {
  const msg = err.message || "";
  const code = err.responseCode || 0;

  if (msg.includes("454") || msg.includes("Too many login")) {
    return "Gmail đang tạm khóa tài khoản do quá nhiều lần đăng nhập thất bại. Chờ 1 tiếng rồi thử lại, hoặc dùng OAuth2.";
  }
  if (msg.includes("535") || msg.includes("Username and Password not accepted")) {
    return "Sai App Password hoặc chưa bật 2FA. Vào myaccount.google.com/apppasswords để tạo lại App Password.";
  }
  if (msg.includes("534") || msg.includes("less secure")) {
    return "Gmail yêu cầu bật 2FA trước khi dùng App Password.";
  }
  if (msg.includes("550") || code === 550) {
    return "Email đích bị từ chối (địa chỉ không tồn tại hoặc bị chặn).";
  }
  if (msg.includes("ECONNREFUSED") || msg.includes("ECONNRESET")) {
    return "Không kết nối được SMTP server. Kiểm tra firewall VPS: port 465 có bị chặn không?";
  }
  if (msg.includes("ETIMEDOUT")) {
    return "Timeout kết nối. VPS có thể bị chặn port 465 bởi nhà cung cấp.";
  }
  if (msg.includes("Invalid login") || msg.includes("BadCredentials")) {
    return "Thông tin đăng nhập sai. Kiểm tra lại email và App Password (không có khoảng trắng, đúng 16 ký tự).";
  }
  return "Lỗi không xác định. Xem thêm thông tin trong trường 'error'.";
}
