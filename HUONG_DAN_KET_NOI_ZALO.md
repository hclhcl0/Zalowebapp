# 📘 Hướng dẫn Kết nối Hệ thống với Zalo OA

> **Dành cho:** Quản trị viên hệ thống CDC Đà Nẵng  
> **Phiên bản:** 1.0 — Cập nhật tháng 05/2026

---

## 📋 Mục lục

1. [Yêu cầu chuẩn bị](#1-yêu-cầu-chuẩn-bị)
2. [Bước 1 — Tạo ứng dụng trên Zalo Developers](#bước-1--tạo-ứng-dụng-trên-zalo-developers)
3. [Bước 2 — Liên kết ứng dụng với Zalo OA](#bước-2--liên-kết-ứng-dụng-với-zalo-oa)
4. [Bước 3 — Lấy Access Token & Refresh Token](#bước-3--lấy-access-token--refresh-token)
5. [Bước 4 — Nhập thông tin vào Trang Cài đặt Admin](#bước-4--nhập-thông-tin-vào-trang-cài-đặt-admin)
6. [Bước 5 — Cấu hình Webhook](#bước-5--cấu-hình-webhook)
7. [Bước 6 — Cấu hình ZNS (Zalo Notification Service)](#bước-6--cấu-hình-zns-zalo-notification-service)
8. [Kiểm tra kết nối](#kiểm-tra-kết-nối)
9. [Làm mới Access Token](#làm-mới-access-token)
10. [Câu hỏi thường gặp (FAQ)](#câu-hỏi-thường-gặp-faq)

---

## 1. Yêu cầu chuẩn bị

Trước khi bắt đầu, hãy đảm bảo bạn đã có:

| Yêu cầu | Chi tiết |
|---|---|
| ✅ Tài khoản Zalo | Tài khoản cá nhân là Quản trị viên của OA CDC Đà Nẵng |
| ✅ Zalo Official Account | OA đã được Zalo duyệt và kích hoạt |
| ✅ Hệ thống đã deploy | Admin Dashboard đang chạy trên một địa chỉ URL công khai (ví dụ: `https://admin.cdc-danang.vn`) |

> ⚠️ **Lưu ý quan trọng:** Webhook của Zalo **bắt buộc** phải sử dụng giao thức **HTTPS**. Hệ thống chạy trên `localhost` (máy tính cá nhân) sẽ **không nhận được** sự kiện Webhook từ Zalo.

---

## Bước 1 — Tạo ứng dụng trên Zalo Developers

**1.1.** Truy cập trang: **https://developers.zalo.me/**

**1.2.** Đăng nhập bằng tài khoản Zalo Quản trị viên của OA.

**1.3.** Nhấn vào nút **"Tạo ứng dụng mới"** (Create App).

**1.4.** Điền thông tin ứng dụng:

| Trường | Giá trị gợi ý |
|---|---|
| **Tên ứng dụng** | `CDC Đà Nẵng OA Manager` |
| **Mô tả** | `Hệ thống quản lý Zalo OA Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng` |
| **Loại ứng dụng** | Chọn **Official Account** |

**1.5.** Sau khi tạo xong, hệ thống cấp cho bạn:
- **App ID** (ví dụ: `1234567`)
- **App Secret** (ví dụ: `abcdef1234567890abcdef1234567890`)

> 🔒 **Bảo mật:** App Secret tương đương mật khẩu. Không chia sẻ cho bất kỳ ai và không đưa vào mã nguồn công khai (GitHub, GitLab...).

---

## Bước 2 — Liên kết ứng dụng với Zalo OA

**2.1.** Trong trang quản lý ứng dụng, chọn tab **"Official Account"**.

**2.2.** Nhấn **"Liên kết OA"** (Link OA).

**2.3.** Chọn OA **"CDC Đà Nẵng"** từ danh sách OA bạn đang quản lý.

**2.4.** Cấp đầy đủ các quyền (Permissions) sau:

| Quyền | Mục đích |
|---|---|
| `manage_oa` | Quản lý thông tin OA |
| `manage_article` | Đăng bài viết |
| `send_messages_all` | Gửi tin nhắn đến tất cả người theo dõi |
| `send_zns_messages` | Gửi tin ZNS |

**2.5.** Xác nhận và lưu lại **OA ID** (ví dụ: `1234567890123456789`).

---

## Bước 3 — Lấy Access Token & Refresh Token

Zalo sử dụng cơ chế **OAuth 2.0**. Bạn cần thực hiện quá trình xác thực một lần để lấy token.

### Cách lấy token lần đầu:

**3.1.** Trong trang Zalo Developers, chọn ứng dụng của bạn → Tab **"Official Account"** → Chọn **"Xác thực & Lấy Token"**.

**3.2.** Nhấn nút **"Lấy Access Token"**. Zalo sẽ mở cửa sổ xác nhận quyền.

**3.3.** Đăng nhập bằng tài khoản Quản trị viên OA và nhấn **"Xác nhận"**.

**3.4.** Hệ thống sẽ trả về:

```
Access Token:  eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...   (dài ~1000 ký tự)
Refresh Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...  (dài ~1000 ký tự)
Expires In:    86400 (giây) = 24 giờ
```

> ⚠️ **Thời hạn token:**
> - **Access Token:** Hết hạn sau **24 giờ**. Phải làm mới bằng Refresh Token.
> - **Refresh Token:** Hết hạn sau **3 tháng**. Khi hết hạn phải lặp lại Bước 3 từ đầu.

---

## Bước 4 — Nhập thông tin vào Trang Cài đặt Admin

**4.1.** Truy cập: **`https://your-admin-domain.com/settings`** (hoặc http://localhost:3000/settings khi phát triển).

**4.2.** Chọn tab **"🔌 Kết nối Zalo OA API"**.

**4.3.** Điền đầy đủ các trường:

| Trường | Lấy từ đâu |
|---|---|
| **App ID** | Trang ứng dụng Zalo Developers |
| **App Secret** | Trang ứng dụng Zalo Developers (nhấn "Hiện" để xem) |
| **OA ID** | Tab Official Account → Thông tin OA |
| **Access Token** | Kết quả của Bước 3 |
| **Refresh Token** | Kết quả của Bước 3 |

**4.4.** Nhấn nút **"💾 Lưu cài đặt"**.

**4.5.** Nhấn nút **"🔍 Kiểm tra kết nối Zalo"** để xác nhận hệ thống đã kết nối thành công.

Kết quả thành công sẽ hiển thị:
```
✅ Kết nối thành công!
🏥 Tên OA: CDC Đà Nẵng
🆔 OA ID: 1234567890123456789
👥 Người theo dõi: 12,450
```

---

## Bước 5 — Cấu hình Webhook

Webhook là cơ chế để Zalo "gọi ngược" vào hệ thống của bạn mỗi khi có sự kiện (người dùng nhắn tin, follow OA, v.v.).

**5.1.** Truy cập trang Cài đặt Admin → Tab **"🌐 Cấu hình Webhook"**.

**5.2.** Đặt một chuỗi **Verify Token** bất kỳ (ví dụ: `cdc_danang_webhook_2026`). Nhấn **Lưu cài đặt**.

**5.3.** Sao chép **URL Webhook** hiển thị trong ô readonly:
```
https://your-admin-domain.com/api/zalo/webhook
```

**5.4.** Quay lại trang **Zalo Developers** → Chọn ứng dụng → Tab **"Official Account"** → **"Cài đặt Webhook"**:

| Trường | Giá trị |
|---|---|
| **Callback URL** | `https://your-admin-domain.com/api/zalo/webhook` |
| **Verify Token** | Chuỗi bạn đã đặt ở bước 5.2 |

**5.5.** Chọn các **sự kiện cần nhận**:

| Sự kiện | Mô tả |
|---|---|
| ✅ `user_send_text` | Người dùng gửi tin nhắn văn bản |
| ✅ `user_send_image` | Người dùng gửi hình ảnh |
| ✅ `follow` | Người dùng mới quan tâm OA |
| ✅ `unfollow` | Người dùng bỏ quan tâm OA |

**5.6.** Nhấn **"Xác nhận Webhook"**. Zalo sẽ gửi một yêu cầu GET đến URL của bạn để xác minh. Hệ thống sẽ tự động phản hồi đúng.

> ✅ Nếu Zalo báo **"Xác nhận thành công"** thì Webhook đã hoạt động!

---

## Bước 6 — Cấu hình ZNS (Zalo Notification Service)

ZNS cho phép gửi tin nhắn thông báo (lịch hẹn, kết quả xét nghiệm...) chủ động đến người dân qua số điện thoại.

**6.1.** Đăng ký sử dụng ZNS tại: **https://zalo.cloud/zns**

> 📌 ZNS là dịch vụ **có phí**. Mỗi tin nhắn ZNS tốn một khoản phí nhỏ (tham khảo bảng giá tại Zalo Cloud).

**6.2.** Tạo các **Template ZNS** phù hợp. Gợi ý 3 template cần tạo:

---

### Template 1: Xác nhận lịch hẹn tiêm chủng

```
Kính gửi {{name}},
Lịch tiêm chủng của bạn đã được XÁC NHẬN:
📅 Ngày: {{date}}
💉 Dịch vụ: {{service}}
📍 Địa điểm: CDC Đà Nẵng - 103 Nguyễn Chí Thanh
Vui lòng đến trước 15 phút. Mang theo CCCD/Sổ tiêm chủng.
Hotline hỗ trợ: {{hotline}}
```

---

### Template 2: Nhắc lịch hẹn (1 ngày trước)

```
⏰ Nhắc lịch: Bạn có lịch hẹn tiêm chủng vào NGÀY MAI ({{date}}).
Dịch vụ: {{service}}
📍 CDC Đà Nẵng - 103 Nguyễn Chí Thanh
Nếu cần đổi lịch, vui lòng liên hệ trước: {{hotline}}
```

---

### Template 3: Thông báo có kết quả xét nghiệm

```
📋 Kết quả xét nghiệm của {{name}} đã sẵn sàng.
Mã tra cứu: {{result_code}}
Ngày xét nghiệm: {{test_date}}
Nhắn "KQ {{result_code}}" vào Zalo OA hoặc liên hệ {{hotline}} để nhận chi tiết.
```

---

**6.3.** Sau khi template được Zalo duyệt, bạn sẽ nhận được **Template ID** (dãy số).

**6.4.** Quay lại trang Cài đặt Admin → Tab **"📨 Cài đặt ZNS"** → Điền các **Template ID** vào đúng ô tương ứng → Nhấn **Lưu**.

---

## Kiểm tra kết nối

Sau khi hoàn thành tất cả các bước, thực hiện kiểm tra:

### Kiểm tra kết nối API
1. Vào **Cài đặt** → Tab **"Kết nối Zalo OA API"**
2. Nhấn **"🔍 Kiểm tra kết nối Zalo"**
3. Kết quả ✅ = thành công

### Kiểm tra Webhook
1. Nhắn một tin nhắn bất kỳ vào Zalo OA CDC Đà Nẵng từ điện thoại cá nhân
2. Kiểm tra trong database bảng `MessageLog` — phải có bản ghi mới
3. Bot sẽ tự động phản hồi theo kịch bản đã lập trình

### Kiểm tra ZNS
1. Dùng **Zalo Business Tools** để gửi thử một tin ZNS test (Zalo cung cấp công cụ test miễn phí)

---

## Làm mới Access Token

Access Token hết hạn sau **24 giờ**. Có 2 cách làm mới:

### Cách 1: Thủ công (qua giao diện Admin)
1. Vào **Cài đặt** → Tab **"Kết nối Zalo OA API"**
2. Nhấn nút **"🔁 Làm mới Access Token"**
3. Hệ thống tự động dùng Refresh Token để lấy token mới và lưu vào database

### Cách 2: Tự động (Cron Job - Khuyên dùng)
Thêm một **Cron Job** chạy mỗi 20 giờ để tự động refresh token:

```bash
# Chạy mỗi ngày lúc 00:00 (Crontab)
0 0 * * * curl -X POST https://your-admin-domain.com/api/settings/refresh-token
```

Hoặc dùng **Vercel Cron** nếu deploy trên Vercel:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/settings/refresh-token",
      "schedule": "0 0 * * *"
    }
  ]
}
```

> ⚠️ **Quan trọng:** Nếu để Access Token hết hạn mà không làm mới, toàn bộ tính năng gửi tin nhắn và chatbot sẽ ngừng hoạt động cho đến khi token được làm mới.

---

## Câu hỏi thường gặp (FAQ)

### ❓ Webhook không nhận được sự kiện từ Zalo?
- Kiểm tra URL webhook có đang dùng **HTTPS** chưa (không phải HTTP).
- Kiểm tra server có đang chạy và trả về HTTP 200 cho các yêu cầu POST không.
- Vào Zalo Developers → Xem log Webhook để kiểm tra lỗi.
- Kiểm tra tường lửa (Firewall) của server không chặn các IP của Zalo.

### ❓ Lỗi "Access Token không hợp lệ" (error code 216)?
- Token đã hết hạn. Vào **Cài đặt** → **"🔁 Làm mới Access Token"** để cập nhật.

### ❓ Lỗi "Không có quyền gửi tin nhắn" (error code 217)?
- Kiểm tra lại quyền của ứng dụng ở Bước 2. Đảm bảo đã cấp quyền `send_messages_all`.

### ❓ Refresh Token cũng hết hạn?
- Refresh Token có thời hạn **3 tháng**. Khi hết hạn, phải lặp lại **Bước 3** (đăng nhập Zalo Developers và lấy token mới).
- Sau khi lấy token mới, cập nhật lại trong trang **Cài đặt Admin**.

### ❓ ZNS bị từ chối gửi?
- Số điện thoại người nhận phải đang sử dụng Zalo.
- Nội dung template phải khớp chính xác với template đã được Zalo duyệt.
- Tài khoản Zalo Cloud phải có đủ số dư.

### ❓ Chatbot không trả lời tin nhắn?
- Kiểm tra Webhook có đang hoạt động không (xem bảng `MessageLog` trong database).
- Kiểm tra Access Token còn hạn không.
- Xem log server để tìm lỗi cụ thể.

---

## 📞 Liên hệ hỗ trợ kỹ thuật

Nếu gặp khó khăn trong quá trình cài đặt, vui lòng liên hệ:

| Kênh | Thông tin |
|---|---|
| **Email IT** | it-support@cdc-danang.gov.vn |
| **Zalo Developers Support** | https://developers.zalo.me/support |
| **Tài liệu API chính thức** | https://developers.zalo.me/docs/official-account |

---

*Tài liệu này được tạo tự động bởi hệ thống quản lý Zalo OA CDC Đà Nẵng.*  
*Cập nhật lần cuối: 05/2026*
