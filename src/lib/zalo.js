/**
 * Zalo OA API Helper
 * Token được đọc từ database (bảng SystemConfig) thay vì biến môi trường,
 * giúp Admin có thể cập nhật token ngay trên giao diện mà không cần restart server.
 */

import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const ZALO_OA_API  = "https://openapi.zalo.me/v2.0/oa";
const ZALO_ZNS_API = "https://business.openapi.zalo.me/message/template";

// Lấy Access Token từ database
async function getAccessToken() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "zalo_access_token" },
  });
  return config?.value ?? process.env.ZALO_ACCESS_TOKEN ?? "";
}

// ============================================================
// TỰ ĐỘNG LÀM MỚI TOKEN KHI HẾT HẠN
// Kiểm tra updatedAt của token; nếu > 23 giờ thì refresh trước khi dùng
// ============================================================
async function getValidToken() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "zalo_access_token" },
  });

  if (!config?.value) {
    return process.env.ZALO_ACCESS_TOKEN ?? "";
  }

  // Nếu token đã tồn tại hơn 23 giờ → refresh trước
  const ageMs = Date.now() - new Date(config.updatedAt).getTime();
  const TWENTY_THREE_HOURS = 23 * 60 * 60 * 1000;

  if (ageMs > TWENTY_THREE_HOURS) {
    console.log("[Zalo] Token cũ hơn 23 giờ, đang tự động làm mới...");
    try {
      const refreshed = await refreshZaloAccessToken();
      if (refreshed?.access_token) {
        console.log("[Zalo] Token đã được làm mới tự động thành công.");
        return refreshed.access_token;
      }
    } catch (err) {
      console.error("[Zalo] Tự động làm mới token thất bại:", err.message);
    }
  }

  return config.value;
}

// ============================================================
// HÀM GỌI ZALO API VỚI TỰ ĐỘNG THỬ LẠI KHI TOKEN HẾT HẠN
// Nếu API trả về error -216 (token expired), tự refresh token và thử lại 1 lần
// ============================================================
async function callZaloAPI(url, options = {}) {
  let token = await getValidToken();
  const makeRequest = (t) => fetch(url, {
    ...options,
    headers: { ...options.headers, access_token: t },
  });

  let res = await makeRequest(token);
  let data = await res.json();

  // Nếu token hết hạn → refresh và thử lại 1 lần
  if (data.error === -216) {
    console.log("[Zalo] Token hết hạn (error -216), đang làm mới và thử lại...");
    try {
      const refreshed = await refreshZaloAccessToken();
      if (refreshed?.access_token) {
        token = refreshed.access_token;
        res = await makeRequest(token);
        data = await res.json();
        console.log("[Zalo] Đã làm mới token và gọi lại API thành công.");
      }
    } catch (err) {
      console.error("[Zalo] Làm mới token thất bại:", err.message);
    }
  }

  return data;
}

// ============================================================
// GỬI TIN NHẮN VĂN BẢN
// ============================================================
export async function sendTextMessage(toUserId, text) {
  return callZaloAPI("https://openapi.zalo.me/v2.0/oa/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { user_id: toUserId },
      message: { text },
    }),
  });
}

// ============================================================
// GỬI ZNS (Tin nhắn mẫu)
// ============================================================
export async function sendZNS({ phone, templateId, templateData }) {
  return callZaloAPI(ZALO_ZNS_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      template_id: templateId,
      template_data: templateData,
      tracking_id: `cdc_${Date.now()}`,
    }),
  });
}

// ============================================================
// GỬI TIN TRUYỀN THÔNG (Chuyển sang gửi dạng CS để tránh lỗi -233)
// ============================================================
export async function sendPromotionMessage(userId, title, content, url = "") {
  const token = await getAccessToken();

  // Dùng API v2.0 thay vì v3.0 /message/promotion để tránh lỗi -233 đối với tài khoản cơ quan nhà nước
  const textContent = `${title.toUpperCase()}\n\n${content}${url ? `\n\nXem chi tiết: ${url}` : ""}`;

  const res = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: token },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text: textContent },
    }),
  });
  return res.json();
}

// ============================================================
// GỬI TIN DANH SÁCH (List/Carousel Message) - Gửi qua /message/cs
// ============================================================
export async function sendListMessage(userId, elementsData) {
  const token = await getAccessToken();

  // Chuyển đổi elementsData từ form sang format Zalo yêu cầu
  const elements = elementsData.map(el => {
    const default_action = {
      type: el.actionType || "oa.open.url"
    };

    switch (default_action.type) {
      case "oa.open.url":
        default_action.url = el.actionValue || "https://zalo.me";
        break;
      case "oa.query.show":
      case "oa.query.hide":
        default_action.payload = el.actionValue || "";
        break;
      case "oa.open.phone":
        default_action.payload = { phone_code: el.actionValue || "" };
        break;
      case "oa.open.sms":
        default_action.payload = { 
          phone_code: el.actionValue || "", 
          content: el.actionSmsContent || "" 
        };
        break;
    }

    return {
      title: el.title,
      subtitle: el.subtitle || "",
      image_url: el.imageUrl,
      default_action
    };
  });

  const res = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: token },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "list",
            elements,
          },
        },
      },
    }),
  });
  return res.json();
}


// ============================================================
// LẤY DANH SÁCH NGƯỜI THEO DÕI
// ============================================================
export async function getFollowers(offset = 0, count = 50) {
  return callZaloAPI(
    `${ZALO_OA_API}/getfollowers?data=${encodeURIComponent(JSON.stringify({ offset, count }))}`
  );
}

// ============================================================
// LẤY THÔNG TIN NGƯỜI DÙNG ZALO
// ============================================================
export async function getUserProfile(userId) {
  return callZaloAPI(
    `${ZALO_OA_API}/getprofile?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`
  );
}

// Lấy đường dẫn tệp video cục bộ hoặc tải xuống tệp tạm thời nếu từ URL ngoài
async function getLocalVideoPath(videoUrlOrPath) {
  // 1. Trường hợp đường dẫn tương đối trên máy chủ của ta
  if (videoUrlOrPath.startsWith("/uploads/") || videoUrlOrPath.startsWith("uploads/")) {
    const relativePath = videoUrlOrPath.startsWith("/") ? videoUrlOrPath : `/${videoUrlOrPath}`;
    const localPath = path.join(process.cwd(), "public", relativePath);
    if (fs.existsSync(localPath)) {
      return { path: localPath, isTemp: false };
    }
  }

  // 2. Trường hợp đã là đường dẫn tuyệt đối (trên server)
  if (path.isAbsolute(videoUrlOrPath) && fs.existsSync(videoUrlOrPath)) {
    return { path: videoUrlOrPath, isTemp: false };
  }

  // 3. Trường hợp URL tuyệt đối (kiểm tra xem có trỏ tới uploads cục bộ qua domain không)
  try {
    const url = new URL(videoUrlOrPath);
    if (url.pathname.startsWith("/uploads/")) {
      const localPath = path.join(process.cwd(), "public", url.pathname);
      if (fs.existsSync(localPath)) {
        return { path: localPath, isTemp: false };
      }
    }
  } catch (e) {
    // Không phải URL hợp lệ, bỏ qua
  }

  // 4. Nếu là URL ngoài thực tế, tải về thư mục tạm thời
  try {
    const response = await fetch(videoUrlOrPath);
    if (!response.ok) {
      throw new Error(`Tải video thất bại: ${response.statusText}`);
    }
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.mp4`;
    const tempFilePath = path.join(uploadDir, tempFilename);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(tempFilePath, buffer);

    return { path: tempFilePath, isTemp: true };
  } catch (err) {
    throw new Error(`Không thể tải video từ nguồn bên ngoài: ${err.message}`);
  }
}

// Upload video lên Zalo Media Store qua cơ chế preparevideo và verify
export async function uploadVideoToZalo(videoUrlOrPath) {
  const token = await getAccessToken();
  if (!token) throw new Error("Không tìm thấy Zalo Access Token trong hệ thống");

  const { path: localPath, isTemp } = await getLocalVideoPath(videoUrlOrPath);

  try {
    const fileBuffer = fs.readFileSync(localPath);
    const fileBlob = new Blob([fileBuffer], { type: "video/mp4" });
    const formData = new FormData();
    formData.append("file", fileBlob, path.basename(localPath));

    console.log(`[Zalo SDK] Khởi động preparevideo cho tệp: ${path.basename(localPath)}`);
    const res = await fetch("https://openapi.zalo.me/v2.0/article/upload_video/preparevideo", {
      method: "POST",
      headers: {
        access_token: token,
      },
      body: formData,
    });

    const data = await res.json();
    if (data.error !== 0) {
      throw new Error(`Lỗi khởi tạo upload video Zalo: ${data.message} (Mã: ${data.error})`);
    }

    const videoToken = data.data.token;
    console.log(`[Zalo SDK] Nhận video token từ preparevideo: ${videoToken}. Bắt đầu kiểm tra trạng thái (polling)...`);

    // Polling GET verify
    let attempts = 0;
    const maxAttempts = 30; // 30 lần * 5s = 150s (2.5 phút)
    
    while (attempts < maxAttempts) {
      // Đợi 5 giây trước khi verify (để Zalo xử lý video)
      await new Promise((r) => setTimeout(r, 5000));
      attempts++;

      console.log(`[Zalo SDK] Đang verify trạng thái video, lần thử ${attempts}/${maxAttempts}...`);
      const verifyRes = await fetch("https://openapi.zalo.me/v2.0/article/upload_video/verify", {
        method: "GET",
        headers: {
          access_token: token,
          token: videoToken,
        },
      });

      const verifyData = await verifyRes.json();
      if (verifyData.error !== 0) {
        throw new Error(`Lỗi xác thực video Zalo: ${verifyData.message} (Mã: ${verifyData.error})`);
      }

      const { status, video_id, status_message } = verifyData.data;
      console.log(`[Zalo SDK] Trạng thái video: ${status} (${status_message || "Đang xử lý"})`);

      if (status === 1) {
        console.log(`[Zalo SDK] Video xử lý THÀNH CÔNG. Video ID: ${video_id}`);
        return video_id; // Thành công!
      } else if (status === 4) {
        throw new Error(`Zalo báo lỗi chuyển đổi video: ${status_message}`);
      }
    }

    throw new Error("Hết thời gian chờ Zalo chuyển đổi video (Timeout 150s)");
  } finally {
    // Dọn dẹp tệp tạm thời
    if (isTemp && fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        console.log(`[Zalo SDK] Đã dọn dẹp tệp video tạm thời: ${localPath}`);
      } catch (err) {
        console.error("[Zalo SDK] Không thể dọn dẹp tệp tạm thời:", err);
      }
    }
  }
}

// ============================================================
// GỬI TIN NHẮN VIDEO (Chuyển đổi thành tin nhắn chứa link video để tương thích và bypass lỗi -201)
// ============================================================
export async function sendVideoMessage(userId, videoUrl) {
  const token = await getAccessToken();
  const textContent = `🎥 CDC ĐÀ NẴNG - TIN NHẮN VIDEO\n\nMời bạn xem video tại đây:\n${videoUrl}`;

  const res = await fetch("https://openapi.zalo.me/v2.0/oa/message", {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: token },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text: textContent },
    }),
  });
  return res.json();
}


// ============================================================
// LÀM MỚI ACCESS TOKEN
// ============================================================
export async function refreshZaloAccessToken() {
  const [appIdCfg, secretCfg, refreshCfg] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: "zalo_app_id" } }),
    prisma.systemConfig.findUnique({ where: { key: "zalo_app_secret" } }),
    prisma.systemConfig.findUnique({ where: { key: "zalo_refresh_token" } }),
  ]);

  const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: secretCfg?.value ?? "",
    },
    body: new URLSearchParams({
      refresh_token: refreshCfg?.value ?? "",
      app_id: appIdCfg?.value ?? "",
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  // Tự động cập nhật token mới vào database
  if (data.access_token) {
    await prisma.systemConfig.upsert({
      where: { key: "zalo_access_token" },
      update: { value: data.access_token },
      create: { key: "zalo_access_token", value: data.access_token, label: "Access Token" },
    });
  }
  if (data.refresh_token) {
    await prisma.systemConfig.upsert({
      where: { key: "zalo_refresh_token" },
      update: { value: data.refresh_token },
      create: { key: "zalo_refresh_token", value: data.refresh_token, label: "Refresh Token" },
    });
  }

  return data;
}

// Tạo bài viết lên Zalo OA Media Store
export async function createArticleToZalo(articleData) {
  const token = await getAccessToken();
  if (!token) throw new Error("Missing Zalo Access Token");

  const url = `https://openapi.zalo.me/v2.0/article/create?access_token=${token}`;

  const payload = {
    type: "normal",
    title: articleData.title,
    description: articleData.summary || articleData.content.substring(0, 150) + "...",
    author: articleData.author || "CDC Đà Nẵng",
    cover: {
      photo_url: articleData.coverUrl,
      status: "show"
    },
    body: [
      {
        type: "text",
        content: articleData.content
      }
    ],
    status: "show"
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Zalo API Error: ${data.message} (Code: ${data.error})`);
  }

  // Zalo trả về token tiến trình tạo bài viết (data.data.token)
  return data.data;
}
