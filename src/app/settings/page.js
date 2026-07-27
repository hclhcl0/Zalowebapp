"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, Eye, EyeOff, AlertCircle } from "lucide-react";
import WebcqCategoriesPanel from "./WebcqCategoriesPanel";
import BannerListEditor from "./BannerListEditor";
import FooterInfoEditor from "./FooterInfoEditor";
import { HotlinesPanel, SchedulesPanel } from "./HotlinesSchedulesPanel";

// Các nhóm cài đặt
const SETTING_GROUPS = [
  {
    id: "oauth",
    icon: "🔑",
    title: "Kết nối OAuth",
    desc: "Xác thực Zalo OA bằng chuẩn OAuth 2.0 + PKCE — tự động lấy token an toàn.",
    fields: [],
  },
  {
    id: "zalo_api",
    icon: "🔌",
    title: "Kết nối Zalo OA API",
    desc: "Thông tin xác thực lấy từ Zalo for Developers. Bắt buộc để hệ thống hoạt động.",
    fields: [
      { key: "zalo_app_id",        label: "App ID",          type: "text",     placeholder: "VD: 123456789",              secret: false },
      { key: "zalo_app_secret",    label: "App Secret",      type: "password", placeholder: "••••••••••••••••",           secret: true  },
      { key: "zalo_oa_id",         label: "OA ID",           type: "text",     placeholder: "VD: 1234567890123456789",    secret: false },
      { key: "zalo_access_token",  label: "Access Token",    type: "password", placeholder: "••••••••••••••••",           secret: true  },
      { key: "zalo_refresh_token", label: "Refresh Token",   type: "password", placeholder: "••••••••••••••••",           secret: true  },
    ],
  },
  {
    id: "gmail_pool",
    icon: "✉️",
    title: "Gmail Account Pool",
    desc: "Danh sách tài khoản Gmail dùng luân phiên để gửi email thông báo nội bộ & cập nhật thông tin khác tự động.",
    fields: [],
  },
  {
    id: "webhook",
    icon: "🌐",
    title: "Cấu hình Webhook",
    desc: "URL Webhook nhận sự kiện từ Zalo (tin nhắn, follow, unfollow...). Dán URL này vào trang Zalo Developers.",
    fields: [
      { key: "webhook_verify_token", label: "Verify Token (tự đặt)", type: "text", placeholder: "VD: cdc_danang_secret_2026", secret: false },
    ],
    readonly: [
      { label: "URL Webhook (đã deploy)", value: "{SITE_URL}/api/zalo/webhook", note: "Thay {SITE_URL} bằng domain thực tế của bạn." },
    ],
  },
  {
    id: "zns",
    icon: "📨",
    title: "Cài đặt ZNS (Zalo Notification Service)",
    desc: "Template ID dùng để gửi tin nhắn thông báo lịch hẹn và xác nhận cho người dân.",
    fields: [
      { key: "zns_template_appointment", label: "Template: Xác nhận lịch hẹn",     type: "text", placeholder: "VD: 123456" },
      { key: "zns_template_reminder",    label: "Template: Nhắc lịch trước 1 ngày", type: "text", placeholder: "VD: 123457" },
      { key: "zns_template_result",      label: "Template: Thông báo có kết quả",   type: "text", placeholder: "VD: 123458" },
    ],
  },
  {
    id: "contact",
    icon: "📞",
    title: "Thông tin Liên hệ & Cơ sở",
    desc: "Hiển thị trên Mini App và phản hồi Chatbot khi người dân hỏi.",
    fields: [
      { key: "hotline_main",   label: "Hotline chính",          type: "tel",  placeholder: "VD: 1900988975" },
      { key: "hotline_zns",    label: "Hotline hỗ trợ Zalo",    type: "tel",  placeholder: "VD: 0905.123.456"   },
      { key: "address",        label: "Địa chỉ trụ sở CDC",     type: "text", placeholder: "VD: 118 Lê Đình Lý, Phường Thanh Khê Đông, Quận Thanh Khê, Thành phố Đà Nẵng" },
      { key: "map_embed_url",  label: "Link Google Maps (Embed)", type: "text", placeholder: "https://www.google.com/maps/embed?..." },
      { key: "working_hours",  label: "Giờ làm việc",           type: "text", placeholder: "VD: 07:30 - 16:30" },
    ],
  },
  {
    id: "oa_info",
    icon: "🏥",
    title: "Thông tin OA hiển thị",
    desc: "Tên và mô tả của Zalo OA hiển thị trên Mini App.",
    fields: [
      { key: "oa_display_name", label: "Tên hiển thị OA",   type: "text",     placeholder: "VD: CDC Đà Nẵng" },
      { key: "oa_welcome_msg",  label: "Tin chào (Chỉ ghi lời chào, 2 link dưới sẽ tự động được chèn vào đuôi)", type: "textarea", placeholder: "VD: Xin chào! Cảm ơn bạn đã quan tâm..." },
      { key: "oa_register_link_staff", label: "Đường link Đăng ký Nhân viên (Hệ thống sẽ tự động ghép UID)", type: "text", placeholder: "VD: https://zcdc.ksbtdanang.vn/register" },
      { key: "oa_register_link_patient", label: "Đường link Đăng ký Người dân (Hệ thống sẽ tự động ghép UID)", type: "text", placeholder: "VD: https://zcdc.ksbtdanang.vn/patient-register" },
      { key: "chatbot_default_reply", label: "Tin nhắn mặc định (không khớp từ khoá)", type: "textarea", placeholder: "VD: Xin chào! Bạn có thể hỏi về đặt lịch..." },
    ],
  },
  {
    id: "payload_cms",
    icon: "📡",
    title: "Kết nối Website CMS",
    desc: "Cấu hình kết nối đến website CMS (Payload) để lấy danh sách bài viết khi soạn tin Broadcast và nhận webhook tự động gửi Zalo khi xuất bản bài.",
    fields: [
      { key: "payload_cms_url",              label: "URL Website CMS",                         type: "text",     placeholder: "VD: https://cdc.danang.gov.vn" },
      { key: "payload_article_url_pattern",  label: "Mẫu URL bài viết (dùng {slug})",          type: "text",     placeholder: "VD: https://cdc.danang.gov.vn/bai-viet/{slug}" },
      { key: "payload_webhook_secret",       label: "Webhook Secret (khớp với bên CMS)",       type: "password", secret: true, placeholder: "VD: my-secret-key-2026" },
    ],
  },
  {
    id: "ai_config",
    icon: "🤖",
    title: "Cấu hình AI (Gemini / Groq)",
    desc: "Lựa chọn nhà cung cấp AI và quản lý danh sách API Key. Hệ thống sẽ tự động luân phiên các key để tránh lỗi rate limit.",
    fields: [
      { key: "ai_menu_categories", label: "Tùy chỉnh Danh mục (Menu Công Dân)", type: "textarea", placeholder: "Ví dụ:\n1. Tiêm chủng\n2. Sốt xuất huyết\n(Nếu để trống sẽ tự lấy từ kho tài liệu)" },
      { key: "ai_menu_categories_staff", label: "Tùy chỉnh Danh mục (Menu Nhân Viên Nội Bộ)", type: "textarea", placeholder: "Ví dụ:\n1. Tra cứu Lương / Thưởng\n2. Quy định công tác\n(Nếu để trống sẽ dùng chung danh mục công dân)" },
      { key: "ai_daily_limit", label: "Giới hạn câu hỏi/ngày (1 Zalo)", type: "number", placeholder: "Để trống hoặc 0 là không giới hạn" },
      { key: "ai_custom_prompt", label: "Tùy chỉnh Prompt cho AI (Nâng cao)", type: "textarea", placeholder: "Ví dụ: Luôn xưng hô là 'Bác sĩ CDC' và gọi người dùng là 'Bạn'..." },
      { key: "ai_footer_msg", label: "Câu kết thúc dưới mỗi tin trả lời của AI", type: "text", placeholder: "VD: (Địa chỉ: 118 Lê Đình Lý - Hotline: 1900988975) - Để trống để tắt" },
    ],
  },
  {
    id: "drive_docs",
    icon: "📂",
    title: "Kho Tài liệu Mẫu (Google Drive)",
    desc: "Kết nối thư mục Google Drive để AI gửi link mẫu biểu cho nhân viên. Hỗ trợ 2 chế độ: (1) Folder công khai + Google API Key — đơn giản hơn. (2) Folder riêng tư + Kết nối OAuth2 bên dưới — bảo mật hơn.",
    fields: [
      { key: "drive_folder_id", label: "ID Thư mục Google Drive", type: "text", placeholder: "VD: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs (lấy từ URL folder)" },
      { key: "google_api_key",  label: "Google API Key — dùng khi folder Công khai (Anyone with link)", type: "password", secret: true, placeholder: "••••••••••••••••" },
    ],
  },
];

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [values, setValues]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecrets, setShowSecrets] = useState({});
  const [activeTab, setActiveTab] = useState("oauth");
  const [oauthData, setOauthData] = useState(null); // { authUrl, redirectUri, codeChallenge, state }
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthMsg, setOauthMsg] = useState(null); // thông báo sau callback

  // Gmail Pool states
  const [accounts, setAccounts] = useState([]);
  const [batchSize, setBatchSize] = useState(10);
  const [delayMs, setDelayMs] = useState(2000);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);
  const [addMode, setAddMode] = useState("apppass"); // "apppass" | "oauth2"
  const [gmailOAuthLoading, setGmailOAuthLoading] = useState(false);
  const [gmailOAuthMsg, setGmailOAuthMsg] = useState(null);

  // Gemini API Keys Pool states
  const [geminiKeys, setGeminiKeys] = useState([]);
  const [geminiKeysLoading, setGeminiKeysLoading] = useState(false);
  const [newGeminiLabel, setNewGeminiLabel] = useState("");
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [showNewGeminiKey, setShowNewGeminiKey] = useState(false);
  const [geminiKeyMsg, setGeminiKeyMsg] = useState(null);
  const [addingGeminiKey, setAddingGeminiKey] = useState(false);

  const fetchGeminiKeys = async () => {
    setGeminiKeysLoading(true);
    try {
      const res = await fetch("/api/settings/gemini-keys");
      const json = await res.json();
      if (json.success) setGeminiKeys(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setGeminiKeysLoading(false);
    }
  };

  const handleAddGeminiKey = async () => {
    if (!newGeminiLabel.trim() || !newGeminiKey.trim()) {
      setGeminiKeyMsg({ type: "error", text: "Vui lòng nhập cả tên gợi nhớ và API Key." });
      return;
    }
    setAddingGeminiKey(true);
    setGeminiKeyMsg(null);
    try {
      const res = await fetch("/api/settings/gemini-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newGeminiLabel, apiKey: newGeminiKey }),
      });
      const json = await res.json();
      if (json.success) {
        setGeminiKeyMsg({ type: "success", text: "Đã thêm API Key thành công!" });
        setNewGeminiLabel("");
        setNewGeminiKey("");
        fetchGeminiKeys();
      } else {
        setGeminiKeyMsg({ type: "error", text: json.error || "Thêm key thất bại" });
      }
    } catch (e) {
      setGeminiKeyMsg({ type: "error", text: "Lỗi kết nối server." });
    } finally {
      setAddingGeminiKey(false);
    }
  };

  const handleToggleGeminiKey = async (id, isActive) => {
    try {
      await fetch("/api/settings/gemini-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      fetchGeminiKeys();
    } catch (e) { console.error(e); }
  };

  const handleDeleteGeminiKey = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa API Key này không?")) return;
    const res = await fetch(`/api/settings/gemini-keys?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      fetchGeminiKeys();
    } else {
      alert("Lỗi: " + json.error);
    }
  };

  // Groq API Keys Pool states
  const [groqKeys, setGroqKeys] = useState([]);
  const [groqKeysLoading, setGroqKeysLoading] = useState(false);
  const [newGroqLabel, setNewGroqLabel] = useState("");
  const [newGroqKey, setNewGroqKey] = useState("");
  const [showNewGroqKey, setShowNewGroqKey] = useState(false);
  const [groqKeyMsg, setGroqKeyMsg] = useState(null);
  const [addingGroqKey, setAddingGroqKey] = useState(false);

  // Google Drive OAuth states
  const [driveOAuthLoading, setDriveOAuthLoading] = useState(false);
  const [driveOAuthMsg, setDriveOAuthMsg] = useState(null);
  const [driveConnected, setDriveConnected] = useState(false);

  const fetchGroqKeys = async () => {
    setGroqKeysLoading(true);
    try {
      const res = await fetch("/api/settings/groq-keys");
      const json = await res.json();
      if (json.success) setGroqKeys(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setGroqKeysLoading(false);
    }
  };

  const handleAddGroqKey = async () => {
    if (!newGroqLabel.trim() || !newGroqKey.trim()) {
      setGroqKeyMsg({ type: "error", text: "Vui lòng nhập cả tên gợi nhớ và API Key." });
      return;
    }
    setAddingGroqKey(true);
    setGroqKeyMsg(null);
    try {
      const res = await fetch("/api/settings/groq-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newGroqLabel, apiKey: newGroqKey }),
      });
      const json = await res.json();
      if (json.success) {
        setGroqKeyMsg({ type: "success", text: "Đã thêm API Key thành công!" });
        setNewGroqLabel("");
        setNewGroqKey("");
        fetchGroqKeys();
      } else {
        setGroqKeyMsg({ type: "error", text: json.error || "Thêm key thất bại" });
      }
    } catch (e) {
      setGroqKeyMsg({ type: "error", text: "Lỗi kết nối server." });
    } finally {
      setAddingGroqKey(false);
    }
  };

  const handleToggleGroqKey = async (id, isActive) => {
    try {
      await fetch("/api/settings/groq-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      fetchGroqKeys();
    } catch (e) { console.error(e); }
  };

  const handleDeleteGroqKey = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa API Key này không?")) return;
    const res = await fetch(`/api/settings/groq-keys?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      fetchGroqKeys();
    } else {
      alert("Lỗi: " + json.error);
    }
  };

  // Load Gmail configuration from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAcc = localStorage.getItem("cdc_gmail_pool");
      if (savedAcc) {
        try {
          setAccounts(JSON.parse(savedAcc));
        } catch (e) {
          console.error(e);
        }
      }
      const savedBatch = localStorage.getItem("cdc_email_batch_size");
      if (savedBatch) setBatchSize(Number(savedBatch));
      const savedDelay = localStorage.getItem("cdc_email_delay_ms");
      if (savedDelay) setDelayMs(Number(savedDelay));
      setIsLocalLoaded(true);
    }
  }, []);

  // Load AI Keys khi chuyển sang tab ai_config
  useEffect(() => {
    if (activeTab === "ai_config") {
      fetchGeminiKeys();
      fetchGroqKeys();
    }
  }, [activeTab]);

  // Save Gmail pool to localStorage on change
  useEffect(() => {
    if (isLocalLoaded && typeof window !== "undefined") {
      localStorage.setItem("cdc_gmail_pool", JSON.stringify(accounts));
    }
  }, [accounts, isLocalLoaded]);

  // Save Gmail batchSize to localStorage on change
  useEffect(() => {
    if (isLocalLoaded && typeof window !== "undefined") {
      localStorage.setItem("cdc_email_batch_size", String(batchSize));
    }
  }, [batchSize, isLocalLoaded]);

  // Save Gmail delayMs to localStorage on change
  useEffect(() => {
    if (isLocalLoaded && typeof window !== "undefined") {
      localStorage.setItem("cdc_email_delay_ms", String(delayMs));
    }
  }, [delayMs, isLocalLoaded]);

  const addAccount = () => {
    if (!newEmail.trim() || !newPass.trim()) return;
    setAccounts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        user: newEmail.trim(),
        appPassword: newPass.replace(/\s/g, ""),
        showPass: false,
      },
    ]);
    setNewEmail("");
    setNewPass("");
  };

  const removeAccount = (id) => setAccounts((prev) => prev.filter((a) => a.id !== id));
  const togglePass = (id) =>
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, showPass: !a.showPass } : a))
    );

  // Bắt đầu luồng Gmail OAuth2
  const handleGmailOAuth = async () => {
    setGmailOAuthLoading(true);
    setGmailOAuthMsg(null);
    try {
      const emailHint = newEmail.trim();
      const res = await fetch(`/api/auth/gmail-oauth${emailHint ? `?email=${encodeURIComponent(emailHint)}` : ""}`);
      const data = await res.json();
      if (data.error) {
        setGmailOAuthMsg({ type: "error", text: data.error });
      } else {
        // Mở tab Google để xác nhận
        window.open(data.authUrl, "_self");
      }
    } catch (e) {
      setGmailOAuthMsg({ type: "error", text: "Không kết nối được server." });
    } finally {
      setGmailOAuthLoading(false);
    }
  };

  // Tải cài đặt từ database
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      const flat = {};
      Object.entries(json.data ?? {}).forEach(([k, v]) => {
        flat[k] = v.value;
      });
      setValues(flat);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Đọc kết quả Zalo OAuth callback từ query params
  useEffect(() => {
    const success = searchParams.get("oauth_success");
    const err     = searchParams.get("oauth_error");
    if (success) {
      setOauthMsg({ type: "success", text: "✅ Xác thực thành công! Access Token đã được lưu vào hệ thống." });
      setActiveTab("oauth");
      loadSettings();
      router.replace("/settings");
    }
    if (err) {
      setOauthMsg({ type: "error", text: `❌ Lỗi OAuth: ${decodeURIComponent(err)}` });
      setActiveTab("oauth");
      router.replace("/settings");
    }
  }, [searchParams, loadSettings, router]);

  // Đọc kết quả Gmail OAuth2 callback từ query params
  useEffect(() => {
    const gmailSuccess = searchParams.get("gmail_oauth_success");
    const gmailError   = searchParams.get("gmail_oauth_error");
    const gmailToken   = searchParams.get("gmail_token");

    if (gmailSuccess && gmailToken) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(gmailToken));
        const { email, refreshToken, accessToken } = tokenData;
        if (email && refreshToken) {
          setAccounts((prev) => {
            // Nếu đã có account này → cập nhật token
            const exists = prev.find((a) => a.user === email);
            if (exists) {
              return prev.map((a) =>
                a.user === email
                  ? { ...a, refreshToken, accessToken: accessToken || a.accessToken }
                  : a
              );
            }
            // Chưa có → thêm mới
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                user: email,
                refreshToken,
                accessToken: accessToken || "",
                authType: "oauth2",
              },
            ];
          });
          setGmailOAuthMsg({ type: "success", text: `✅ Đã kết nối Gmail OAuth2: ${email}` });
          setActiveTab("gmail_pool");
        }
      } catch (e) {
        console.error(e);
      }
      router.replace("/settings?tab=gmail_pool");
    }

    if (gmailError) {
      setGmailOAuthMsg({ type: "error", text: `❌ ${decodeURIComponent(gmailError)}` });
      setActiveTab("gmail_pool");
      router.replace("/settings?tab=gmail_pool");
    }
  }, [searchParams, router]);

  // Đọc kết quả Drive OAuth callback từ query params
  useEffect(() => {
    const driveSuccess = searchParams.get("drive_oauth_success");
    const driveError = searchParams.get("drive_oauth_error");

    if (driveSuccess) {
      setDriveOAuthMsg({ type: "success", text: "✅ Đã kết nối thư mục Google Drive qua OAuth2 thành công!" });
      setActiveTab("drive_docs");
      loadSettings();
      router.replace("/settings?tab=drive_docs");
    }

    if (driveError) {
      setDriveOAuthMsg({ type: "error", text: `❌ Lỗi: ${decodeURIComponent(driveError)}` });
      setActiveTab("drive_docs");
      router.replace("/settings?tab=drive_docs");
    }
  }, [searchParams, loadSettings, router]);

  // Đọc tab hoạt động từ query params (ví dụ: ?tab=gmail_pool)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && SETTING_GROUPS.some(g => g.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Tạo URL OAuth để redirect Admin sang Zalo
  async function handleGenerateOAuthUrl() {
    setOauthLoading(true);
    setOauthMsg(null);
    setOauthData(null);
    try {
      const res = await fetch("/api/zalo/oauth");
      const data = await res.json();
      if (data.error) {
        setOauthMsg({ type: "error", text: `❌ ${data.error}` });
      } else {
        setOauthData(data);
      }
    } catch {
      setOauthMsg({ type: "error", text: "❌ Không thể kết nối server." });
    } finally {
      setOauthLoading(false);
    }
  }

  // Lưu tất cả cài đặt
  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const payload = Object.entries(values).map(([key, value]) => ({
      key,
      value,
      label: key,
    }));
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // Làm mới Access Token tự động
  async function handleRefreshToken() {
    setRefreshing(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/refresh-token", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      if (data.success) loadSettings(); // Tải lại token mới
    } catch {
      setTestResult({ success: false, message: "Không thể kết nối đến server." });
    } finally {
      setRefreshing(false);
    }
  }

  // Kiểm tra kết nối Zalo
  async function handleTestZalo() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-zalo");
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Không thể kết nối đến server." });
    } finally {
      setTesting(false);
    }
  }

  function handleChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <div className="spinner" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)", width: 32, height: 32, margin: "0 auto 12px" }} />
          Đang tải cài đặt...
        </div>
      </div>
    );
  }

  const activeGroup = SETTING_GROUPS.find((g) => g.id === activeTab);

  const formatTokens = (val) => {
    if (!val) return "0";
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(1) + "K";
    return val.toString();
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        .settings-horizontal-menu {
          display: none;
        }
        @media (max-width: 768px) {
          .settings-vertical-menu {
            display: none !important;
          }
          .settings-horizontal-menu {
            display: flex !important;
            overflow-x: auto;
            gap: 6px;
            padding: 6px 8px;
            margin-bottom: 16px;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            box-sizing: border-box;
            background: white;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border);
          }
          .settings-horizontal-menu::-webkit-scrollbar {
            display: none;
          }
          .settings-horizontal-tab-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            border-radius: 8px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--text-muted);
            white-space: nowrap;
            transition: all 0.15s;
          }
          .settings-horizontal-tab-pill.active {
            background: var(--primary-light);
            color: var(--primary);
            font-weight: 600;
          }
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Cài đặt hệ thống</h1>
          <p className="page-desc">Quản lý kết nối Zalo OA, thông tin liên hệ và cấu hình Gmail gửi thư tự động.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {saved && (
            <span style={{ color: "var(--success)", fontWeight: 600, fontSize: "0.875rem" }}>
              ✅ Đã lưu thành công!
            </span>
          )}
          <button className="btn btn-outline" onClick={loadSettings}>🔄 Tải lại</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} /> Đang lưu...</> : "💾 Lưu cài đặt"}
          </button>
        </div>
      </div>

      <div className="settings-grid">
        {/* PC Tab menu dọc */}
        <div className="card settings-vertical-menu" style={{ padding: "8px" }}>
          {SETTING_GROUPS.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.id)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "10px 12px",
                background: activeTab === group.id ? "var(--primary-light)" : "transparent",
                color: activeTab === group.id ? "var(--primary)" : "var(--text-muted)",
                border: "none", borderRadius: "var(--radius)",
                cursor: "pointer", textAlign: "left",
                fontWeight: activeTab === group.id ? 600 : 500,
                fontSize: "0.85rem",
                borderLeft: activeTab === group.id ? "3px solid var(--primary)" : "3px solid transparent",
                fontFamily: "Inter, sans-serif",
                transition: "all 0.15s",
              }}
            >
              <span>{group.icon}</span>
              {group.title.split(" ").slice(0, 3).join(" ")}
            </button>
          ))}
        </div>

        {/* Mobile Horizontal scroll tab menu */}
        <div className="settings-horizontal-menu">
          {SETTING_GROUPS.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveTab(group.id)}
              className={`settings-horizontal-tab-pill ${activeTab === group.id ? "active" : ""}`}
            >
              <span>{group.icon}</span>
              {group.title.split(" ").slice(0, 3).join(" ")}
            </button>
          ))}
        </div>

        {/* Nội dung tab */}
        {activeGroup && (
          <div>
            {/* Group header */}
            <div className="card" style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ fontSize: "2rem", width: 48, height: 48, background: "var(--primary-light)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {activeGroup.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "4px" }}>{activeGroup.title}</h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{activeGroup.desc}</p>
                </div>
              </div>

              {/* UI cho tab OAuth */}
              {activeGroup.id === "oauth" && (
                <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                  {oauthMsg && (
                    <div style={{
                      padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: "16px",
                      background: oauthMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${oauthMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                      color: oauthMsg.type === "success" ? "#15803d" : "#dc2626",
                      fontWeight: 600, fontSize: "0.875rem",
                    }}>
                      {oauthMsg.text}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                    {[
                      { step: "1", title: "Nhập App ID & App Secret", desc: 'Chuyển sang tab "🔌 Kết nối Zalo OA API", điền App ID + App Secret rồi nhấn Lưu.' },
                      { step: "2", title: "Điền Callback URL vào Zalo Developers", desc: 'Vào developers.zalo.me → Ứng dụng → Thiết lập đường dẫn → Dán Callback URL bên dưới vào ô "Official Account Callback URL".' },
                      { step: "3", title: "Nhấn Bắt đầu xác thực", desc: "Hệ thống tạo Code Challenge tự động và mở cửa sổ Zalo để xác nhận cấp quyền." },
                      { step: "4", title: "Xác nhận trên Zalo", desc: "Đăng nhập bằng tài khoản Quản trị viên OA → Nhấn Xác nhận. Hệ thống tự lưu Access Token." },
                    ].map((item) => (
                      <div key={item.step} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        <div style={{ minWidth: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>{item.step}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "2px" }}>{item.title}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="form-group">
                    <label className="form-label">📎 Callback URL — dán vào Zalo Developers</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input type="text" className="form-input" value={`${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/zalo/callback`} readOnly style={{ background: "var(--bg)", fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-muted)" }} />
                      <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/zalo/callback`)}>📋 Copy</button>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={handleGenerateOAuthUrl} disabled={oauthLoading} style={{ marginTop: "4px" }}>
                    {oauthLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} /> Đang tạo...</> : "🔑 Bắt đầu xác thực với Zalo"}
                  </button>
                  {oauthData && (
                    <div style={{ marginTop: "20px", padding: "16px", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                      <div style={{ fontWeight: 600, marginBottom: "12px", fontSize: "0.875rem" }}>✅ Đường dẫn xác thực đã sẵn sàng:</div>
                      <div className="form-group">
                        <label className="form-label">🔗 Authorization URL</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <input type="text" className="form-input" value={oauthData.authUrl} readOnly style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-muted)" }} />
                          <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(oauthData.authUrl)}>📋</button>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                           <label className="form-label" style={{ fontSize: "0.75rem" }}>Code Challenge (tự động)</label>
                           <input type="text" className="form-input" value={oauthData.codeChallenge} readOnly style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-muted)" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                           <label className="form-label" style={{ fontSize: "0.75rem" }}>State (chống CSRF)</label>
                           <input type="text" className="form-input" value={oauthData.state} readOnly style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-muted)" }} />
                        </div>
                      </div>
                      <a href={oauthData.authUrl} target="_blank" rel="noopener noreferrer" className="btn btn-success" style={{ textDecoration: "none", display: "inline-flex" }}>
                        🚀 Mở trang Zalo xác nhận cấp quyền ↗
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* UI cho tab Gmail Account Pool */}
              {activeGroup.id === "gmail_pool" && (
                <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>

                  {/* Thông báo OAuth2 */}
                  {gmailOAuthMsg && (
                    <div style={{
                      padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: "16px",
                      background: gmailOAuthMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${gmailOAuthMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                      color: gmailOAuthMsg.type === "success" ? "#15803d" : "#dc2626",
                      fontWeight: 600, fontSize: "0.875rem",
                      display: "flex", alignItems: "center", gap: "10px"
                    }}>
                      {gmailOAuthMsg.text}
                      <button onClick={() => setGmailOAuthMsg(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}>✕</button>
                    </div>
                  )}

                  <div className="dashboard-grid">
                    {/* Cột trái: Danh sách & form thêm */}
                    <div>
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📧 Danh sách tài khoản trong Pool</span>
                        {accounts.length > 0 && <span className="badge badge-info">{accounts.length}</span>}
                      </h3>

                      {/* Tab chọn kiểu thêm mới */}
                      <div style={{ display: "flex", gap: "6px", background: "var(--bg)", padding: "4px", borderRadius: "var(--radius)", border: "1px solid var(--border)", marginBottom: "14px", width: "fit-content" }}>
                        {[
                          { id: "apppass", label: "🔑 App Password" },
                          { id: "oauth2",  label: "🔗 Gmail OAuth2 (khuyến nghị)" },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setAddMode(m.id)}
                            style={{
                              padding: "6px 14px", fontSize: "0.78rem", fontWeight: addMode === m.id ? 700 : 500,
                              background: addMode === m.id ? "white" : "transparent",
                              border: "none", borderRadius: "6px", cursor: "pointer",
                              color: addMode === m.id ? "var(--primary)" : "var(--text-muted)",
                              boxShadow: addMode === m.id ? "var(--shadow-sm)" : "none",
                              transition: "all 0.15s"
                            }}
                          >{m.label}</button>
                        ))}
                      </div>

                      {/* Form App Password */}
                      {addMode === "apppass" && (
                        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ fontSize: "0.78rem", color: "#78350f", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 12px", lineHeight: 1.6 }}>
                            ⚠️ App Password có thể gặp lỗi <strong>454 Too many login attempts</strong>. Khuyến nghị dùng <strong>OAuth2</strong>.
                          </div>
                          <input type="email" placeholder="Email gửi (vd: cdc@gmail.com)" value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)} className="form-input" style={{ height: "36px" }} />
                          <input type="password" placeholder="Mật khẩu ứng dụng (16 ký tự không dấu cách)" value={newPass}
                            onChange={(e) => setNewPass(e.target.value)} className="form-input" style={{ height: "36px" }} />
                          <button onClick={addAccount} disabled={!newEmail.trim() || !newPass.trim()}
                            className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                            <Plus className="w-4 h-4" /> Thêm vào Pool
                          </button>
                        </div>
                      )}

                      {/* Form OAuth2 */}
                      {addMode === "oauth2" && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius)", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ fontSize: "0.8rem", color: "#14532d", lineHeight: 1.6 }}>
                            ✅ <strong>OAuth2</strong> — Không cần App Password, không bị lỗi 454. Google cấp quyền trực tiếp.
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "white", borderRadius: "6px", padding: "10px 12px", border: "1px solid var(--border)", lineHeight: 1.7 }}>
                            <strong>Yêu cầu trước:</strong> Điền <strong>Client ID</strong> và <strong>Client Secret</strong> vào ô bên phải rồi bấm Lưu cài đặt.<br/>
                            Sau đó nhập email Gmail muốn kết nối và bấm nút bên dưới.
                          </div>
                          <input type="email" placeholder="Gmail muốn kết nối (vd: hclhcl0@gmail.com)" value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)} className="form-input" style={{ height: "36px" }} />
                          <button
                            onClick={handleGmailOAuth}
                            disabled={gmailOAuthLoading || !newEmail.trim()}
                            className="btn btn-success"
                            style={{ width: "100%", justifyContent: "center", gap: "8px" }}
                          >
                            {gmailOAuthLoading
                              ? <><span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} /> Đang mở Google...</>
                              : "🔗 Kết nối Gmail qua OAuth2"}
                          </button>
                        </div>
                      )}

                      {/* Accounts list */}
                      {accounts.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.8rem", border: "2px dashed var(--border)", borderRadius: "var(--radius)" }}>
                          Chưa có tài khoản Gmail nào được cấu hình.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto", paddingRight: "4px" }}>
                          {accounts.map((acc, idx) => {
                            const isOAuth2 = Boolean(acc.refreshToken);
                            return (
                              <div key={acc.id} style={{
                                display: "flex", alignItems: "center", gap: "8px",
                                background: isOAuth2 ? "#f0fdf4" : "white",
                                border: `1px solid ${isOAuth2 ? "#bbf7d0" : "var(--border)"}`,
                                borderRadius: "var(--radius)", padding: "8px 12px"
                              }}>
                                <div style={{ width: 20, height: 20, borderRadius: "50%", background: isOAuth2 ? "#22c55e" : "var(--border)", color: "white", fontSize: "0.7rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {idx + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, fontSize: "0.8rem" }}>
                                  <p style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{acc.user}</p>
                                  <p style={{ margin: 0, fontSize: "0.72rem" }}>
                                    {isOAuth2
                                      ? <span style={{ color: "#15803d", fontWeight: 600 }}>🔗 OAuth2 — Đã kết nối</span>
                                      : <span style={{ color: "var(--text-muted)", fontFamily: "monospace" }}>{acc.showPass ? acc.appPassword : "•••• •••• •••• ••••"}</span>
                                    }
                                  </p>
                                </div>
                                {!isOAuth2 && (
                                  <button className="btn btn-ghost btn-sm" style={{ padding: "4px", minWidth: "auto" }} onClick={() => togglePass(acc.id)}>
                                    {acc.showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                <button className="btn btn-ghost btn-sm" style={{ padding: "4px", minWidth: "auto", color: "var(--danger)" }} onClick={() => removeAccount(acc.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Cột phải: OAuth2 credentials + Tốc độ gửi */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {/* Google OAuth2 Credentials */}
                      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                          🔑 Google OAuth2 Credentials
                        </h4>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.6 }}>
                          Tạo tại <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Google Cloud Console</a> → OAuth 2.0 Client ID → Web application.
                        </div>
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: "0.78rem" }}>Client ID</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="xxxx.apps.googleusercontent.com"
                            value={values.gmail_oauth_client_id || ""}
                            onChange={(e) => handleChange("gmail_oauth_client_id", e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: "0.78rem" }}>Client Secret</label>
                          <input
                            type="password"
                            className="form-input"
                            placeholder="GOCSPX-••••••••••••"
                            value={values.gmail_oauth_client_secret || ""}
                            onChange={(e) => handleChange("gmail_oauth_client_secret", e.target.value)}
                          />
                        </div>
                        <div style={{ marginTop: "10px", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6, padding: "8px", background: "white", borderRadius: "6px", border: "1px dashed var(--border)" }}>
                          <strong>Redirect URI</strong> cần thêm vào Google Cloud:<br/>
                          <code style={{ fontSize: "0.7rem", wordBreak: "break-all", color: "var(--primary)" }}>
                            {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/auth/gmail-callback
                          </code>
                        </div>
                      </div>

                      {/* Tuỳ chọn Gửi Email */}
                      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px" }}>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "12px" }}>⚙️ Tùy chọn Gửi Email</h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.78rem" }}>Tên người gửi (Sender Name)</label>
                            <input 
                              type="text" 
                              value={values.email_sender_name ?? "CDC Đà Nẵng"} 
                              onChange={(e) => handleChange("email_sender_name", e.target.value)} 
                              className="form-input" 
                              placeholder="VD: CDC Đà Nẵng"
                            />
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Tên hiển thị khi người dân/nhân viên nhận được email.</span>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.78rem" }}>Số email mỗi đợt</label>
                            <input type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} className="form-input" />
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>Gửi tuần tự từng đợt để ổn định.</span>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: "0.78rem" }}>Giãn cách giữa đợt (ms)</label>
                            <input type="number" value={delayMs} onChange={(e) => setDelayMs(Number(e.target.value))} className="form-input" />
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>VD: 2000 = 2 giây.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Nút kiểm tra kết nối & refresh token (chỉ hiện tab Zalo API) */}
              {activeGroup.id === "zalo_api" && (
                <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    <button className="btn btn-outline" onClick={handleTestZalo} disabled={testing}>
                      {testing ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Đang kiểm tra...</> : "🔍 Kiểm tra kết nối Zalo"}
                    </button>
                    <button className="btn btn-outline" onClick={handleRefreshToken} disabled={refreshing}>
                      {refreshing ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Đang làm mới...</> : "🔁 Làm mới Access Token"}
                    </button>
                  </div>
                  {testResult && (
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: "12px",
                      padding: "14px 16px", borderRadius: "var(--radius)",
                      background: testResult.success ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${testResult.success ? "#bbf7d0" : "#fecaca"}`,
                    }}>
                      <span style={{ fontSize: "1.2rem" }}>{testResult.success ? "✅" : "❌"}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: testResult.success ? "#15803d" : "#dc2626", marginBottom: "4px" }}>
                          {testResult.message}
                        </div>
                        {testResult.oa && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                            <span>🏥 <strong>Tên OA:</strong> {testResult.oa.name}</span>
                            <span>🆔 <strong>OA ID:</strong> {testResult.oa.id}</span>
                            <span>👥 <strong>Người theo dõi:</strong> {testResult.oa.followers?.toLocaleString("vi-VN")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UI cho tab Gemini AI Keys */}
              {activeGroup.id === "ai_config" && (
  <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "0.875rem" }}>⚙️ Chọn Nhà Cung Cấp AI Chính</div>
      <div style={{ display: "flex", gap: "16px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input type="radio" name="aiProvider" value="gemini" checked={values.ai_provider === "gemini" || !values.ai_provider} onChange={() => { handleChange("ai_provider", "gemini"); }} />
          <span>Google Gemini</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input type="radio" name="aiProvider" value="groq" checked={values.ai_provider === "groq"} onChange={() => { handleChange("ai_provider", "groq"); }} />
          <span>Groq (Llama-3)</span>
        </label>
      </div>
    </div>

    {(!values.ai_provider || values.ai_provider === "gemini") && (
      <div>

                <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>

                  {/* Thông báo */}
                  {geminiKeyMsg && (
                    <div style={{
                      padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontWeight: 600, fontSize: "0.875rem",
                      background: geminiKeyMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${geminiKeyMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                      color: geminiKeyMsg.type === "success" ? "#15803d" : "#dc2626",
                    }}>
                      {geminiKeyMsg.type === "success" ? "✅" : "❌"} {geminiKeyMsg.text}
                    </div>
                  )}

                  {/* Danh sách key hiện tại */}
                  <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "0.875rem" }}>🔑 Danh sách API Keys ({geminiKeys.length} key)</div>
                  {geminiKeysLoading ? (
                    <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>Đang tải...</div>
                  ) : geminiKeys.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--text-muted)", marginBottom: "20px" }}>
                      Chưa có API Key nào. Hệ thống sẽ dùng key mặc định từ .env
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                      {geminiKeys.map((key, idx) => (
                        <div key={key.id} style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          padding: "12px 16px", background: key.isActive ? "#f0fdf4" : "#f8fafc",
                          border: `1px solid ${key.isActive ? "#bbf7d0" : "var(--border)"}`,
                          borderRadius: "10px",
                        }}>
                          <div style={{
                            width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            background: key.isActive ? "#22c55e" : "#cbd5e1", color: "white", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0
                          }}>{idx + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>{key.label}</div>
                            <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>{key.maskedKey}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                              🔄 {key.usageCount || 0} lượt • 🪙 {formatTokens(key.usageTokens)} tokens
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                            <span style={{
                              padding: "3px 8px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700,
                              background: key.isActive ? "#dcfce7" : "#f1f5f9",
                              color: key.isActive ? "#16a34a" : "#64748b",
                            }}>
                              {key.isActive ? "● Đang dùng" : "○ Tắt"}
                            </span>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleToggleGeminiKey(key.id, key.isActive)}
                              style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                            >
                              {key.isActive ? "Tắt" : "Bật"}
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => handleDeleteGeminiKey(key.id)}
                              style={{ color: "var(--danger)", background: "none", border: "1px solid var(--border)", fontSize: "0.78rem", padding: "4px 10px" }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Form thêm key mới */}
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "14px" }}>➕ Thêm API Key mới</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.78rem" }}>Tên gợi nhớ</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="VD: Key CDC chính, Key dự phòng 1..."
                          value={newGeminiLabel}
                          onChange={(e) => setNewGeminiLabel(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.78rem" }}>API Key (bắt đầu bằng AIza...)</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type={showNewGeminiKey ? "text" : "password"}
                            className="form-input"
                            placeholder="AIzaSy..."
                            value={newGeminiKey}
                            onChange={(e) => setNewGeminiKey(e.target.value)}
                            style={{ paddingRight: "44px", fontFamily: "monospace" }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewGeminiKey(!showNewGeminiKey)}
                            style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                          >
                            {showNewGeminiKey ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddGeminiKey}
                        disabled={addingGeminiKey}
                        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        {addingGeminiKey && <span className="spinner" style={{ width: 12, height: 12 }} />}
                        {addingGeminiKey ? "Đang thêm..." : "➕ Thêm API Key"}
                      </button>
                    </div>
                  </div>

                  {/* Hướng dẫn */}
                  <div style={{ marginTop: "16px", padding: "12px 16px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "0.8rem", color: "#1e40af", lineHeight: 1.7 }}>
                    <strong>💡 Cách hoạt động:</strong> Hệ thống sẽ tự động luân phiên (Round-Robin) qua từng API Key. Nếu một key bị rate limit (429), hệ thống tự chuyển sang key tiếp theo mà không gián đoạn dịch vụ. Key trong file <code>.env</code> vẫn là key dự phòng cuối cùng.
                    <br /><br />
                    <strong>🔗 Lấy API Key miễn phí:</strong> Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8" }}>aistudio.google.com/app/apikey</a> rồi tạo key mới (mỗi tài khoản Google cho 1 key miễn phí).
                  </div>
                </div>
              </div>
              )}

              {values.ai_provider === "groq" && (
                <div>
                  {groqKeyMsg && (
                    <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontWeight: 600, fontSize: "0.875rem", background: groqKeyMsg.type === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${groqKeyMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`, color: groqKeyMsg.type === "success" ? "#15803d" : "#dc2626" }}>
                      {groqKeyMsg.type === "success" ? "✅" : "❌"} {groqKeyMsg.text}
                    </div>
                  )}
                  <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "0.875rem" }}>🔑 Danh sách Groq API Keys ({groqKeys.length} key)</div>
                  {groqKeysLoading ? (
                    <div style={{ color: "var(--text-muted)", padding: "16px 0" }}>Đang tải...</div>
                  ) : groqKeys.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "8px", color: "var(--text-muted)", marginBottom: "20px" }}>
                      Chưa có API Key nào. Vui lòng thêm Groq API Key bên dưới.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                      {groqKeys.map((key, idx) => (
                        <div key={key.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: key.isActive ? "#f0fdf4" : "#f8fafc", border: `1px solid ${key.isActive ? "#bbf7d0" : "var(--border)"}`, borderRadius: "10px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: key.isActive ? "#22c55e" : "#cbd5e1", color: "white", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>{idx + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>{key.label}</div>
                            <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>{key.maskedKey}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                              🔄 {key.usageCount || 0} lượt • 🪙 {formatTokens(key.usageTokens)} tokens
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                            <span style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700, background: key.isActive ? "#dcfce7" : "#f1f5f9", color: key.isActive ? "#16a34a" : "#64748b" }}>{key.isActive ? "● Đang dùng" : "○ Tắt"}</span>
                            <button className="btn btn-outline btn-sm" onClick={() => handleToggleGroqKey(key.id, key.isActive)} style={{ fontSize: "0.78rem", padding: "4px 10px" }}>{key.isActive ? "Tắt" : "Bật"}</button>
                            <button className="btn btn-sm" onClick={() => handleDeleteGroqKey(key.id)} style={{ color: "var(--danger)", background: "none", border: "1px solid var(--border)", fontSize: "0.78rem", padding: "4px 10px" }}>🗑️</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "14px" }}>➕ Thêm Groq API Key mới</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.78rem" }}>Tên gợi nhớ</label>
                        <input type="text" className="form-input" placeholder="VD: Groq Key 1..." value={newGroqLabel} onChange={(e) => setNewGroqLabel(e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.78rem" }}>API Key (gsk_...)</label>
                        <div style={{ position: "relative" }}>
                          <input type={showNewGroqKey ? "text" : "password"} className="form-input" placeholder="gsk_..." value={newGroqKey} onChange={(e) => setNewGroqKey(e.target.value)} style={{ paddingRight: "44px", fontFamily: "monospace" }} />
                          <button type="button" onClick={() => setShowNewGroqKey(!showNewGroqKey)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>{showNewGroqKey ? "🙈" : "👁️"}</button>
                        </div>
                      </div>
                      <button type="button" className="btn btn-primary" onClick={handleAddGroqKey} disabled={addingGroqKey} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "6px" }}>
                        {addingGroqKey && <span className="spinner" style={{ width: 12, height: 12 }} />} {addingGroqKey ? "Đang thêm..." : "➕ Thêm API Key"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
            </div>

              {/* UI cho tab Kho tài liệu Drive */}
              {activeGroup.id === "drive_docs" && (
                <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                  <div style={{ fontWeight: 700, marginBottom: "12px", fontSize: "0.875rem" }}>🔗 Kết nối Google Drive bằng OAuth2</div>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.6 }}>
                    Nhấn nút bên dưới để ủy quyền cho hệ thống đọc thư mục Drive của bạn. Hệ thống dùng lại <strong>Google OAuth Client ID/Secret</strong> đã nhập ở phần cài đặt Gmail. Chỉ cần kết nối 1 lần — token sẽ được lưu tự động.
                  </p>
                  
                  {values.drive_refresh_token && (
                    <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontWeight: 600, fontSize: "0.875rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" }}>
                      ✅ Hệ thống đã được cấp quyền truy cập Google Drive thành công!
                    </div>
                  )}

                  {driveOAuthMsg && (
                    <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontWeight: 600, fontSize: "0.875rem",
                      background: driveOAuthMsg.type === "success" ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${driveOAuthMsg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
                      color: driveOAuthMsg.type === "success" ? "#15803d" : "#dc2626" }}>
                      {driveOAuthMsg.type === "success" ? "✅" : "❌"} {driveOAuthMsg.text}
                    </div>
                  )}
                  <button
                    type="button"
                    className={values.drive_refresh_token ? "btn btn-outline" : "btn btn-primary"}
                    disabled={driveOAuthLoading}
                    style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    onClick={async () => {
                      setDriveOAuthLoading(true);
                      setDriveOAuthMsg(null);
                      try {
                        const res = await fetch("/api/auth/drive-oauth");
                        const data = await res.json();
                        if (!res.ok || !data.authUrl) {
                          setDriveOAuthMsg({ type: "error", text: data.error || "Không lấy được link xác thực." });
                        } else {
                          window.location.href = data.authUrl;
                        }
                      } catch {
                        setDriveOAuthMsg({ type: "error", text: "Không kết nối được server." });
                      } finally {
                        setDriveOAuthLoading(false);
                      }
                    }}
                  >
                    {driveOAuthLoading && <span className="spinner" style={{ width: 14, height: 14 }} />}
                    {values.drive_refresh_token ? "🔄 Kết nối lại / Đổi tài khoản Drive" : "📂 Kết nối Google Drive"}
                  </button>
                  <div style={{ marginTop: "16px", padding: "12px 16px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "0.8rem", color: "#1e40af", lineHeight: 1.7 }}>
                    <strong>💡 Lưu ý:</strong> Thư mục Drive KHÔNG cần chia sẻ công khai. OAuth2 cho phép đọc file riêng tư trong Drive của bạn. Nhân viên nhận link xem — họ cần đăng nhập Google nội bộ để tải.
                  </div>
                </div>
              )}


            {(activeGroup.fields?.length > 0 || activeGroup.readonly?.length > 0 || (activeGroup.id === "contact" && values["map_embed_url"])) && (
              <div className="card">
                {/* Readonly info (Webhook URL) */}
                {activeGroup.readonly?.map((item) => (
                  <div key={item.label} className="form-group">
                    <label className="form-label">{item.label}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="text"
                        className="form-input"
                        value={item.value}
                        readOnly
                        style={{ background: "var(--bg)", color: "var(--text-muted)", cursor: "default", fontFamily: "monospace", fontSize: "0.8rem" }}
                      />
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigator.clipboard.writeText(item.value)}
                        title="Sao chép"
                      >
                        📋
                      </button>
                    </div>
                    {item.note && (
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>ℹ️ {item.note}</p>
                    )}
                  </div>
                ))}

                {/* Editable fields */}
                {activeGroup.fields?.map((field) => {
                  const isVisible = showSecrets[field.key];
                  const inputType = field.secret
                    ? (isVisible ? "text" : "password")
                    : field.type === "textarea" ? undefined : field.type;

                  return (
                    <div key={field.key} className="form-group">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label className="form-label" htmlFor={field.key}>{field.label}</label>
                        {field.secret && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowSecrets((p) => ({ ...p, [field.key]: !p[field.key] }))}
                            style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                          >
                            {isVisible ? "🙈 Ẩn" : "👁️ Hiện"}
                          </button>
                        )}
                      </div>

                      {field.type === "textarea" ? (
                        <textarea
                          id={field.key}
                          className="form-textarea"
                          placeholder={field.placeholder}
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          rows={3}
                        />
                      ) : field.type === "select" ? (
                        <select
                          id={field.key}
                          className="form-input"
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                        >
                          <option value="">{field.placeholder || "Chọn một tuỳ chọn..."}</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === "banner_list" ? (
                        <BannerListEditor 
                          value={values[field.key]} 
                          onChange={(val) => handleChange(field.key, val)} 
                        />
                      ) : (
                        <input
                          id={field.key}
                          type={inputType}
                          className="form-input"
                          placeholder={field.placeholder}
                          value={values[field.key] ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          autoComplete={field.secret ? "off" : undefined}
                          style={field.type === "password" || field.secret ? { fontFamily: isVisible ? "Inter, sans-serif" : "monospace" } : {}}
                        />
                      )}

                      {field.key === "zalo_access_token" && (
                        <p style={{ fontSize: "0.75rem", color: "var(--warning)", marginTop: "4px" }}>
                          ⚠️ Access Token có thời hạn. Xem hướng dẫn tại{" "}
                          <a href="https://developers.zalo.me/docs/official-account" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
                            Zalo Developers Docs ↗
                          </a>
                        </p>
                      )}
                      {field.key === "map_embed_url" && (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          ℹ️ Lấy link từ Google Maps → Chia sẻ → Nhúng bản đồ → Sao chép URL trong thẻ src.
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Preview bản đồ nếu có */}
                {activeGroup.id === "contact" && values["map_embed_url"] && (
                  <div style={{ marginTop: "16px" }}>
                    <div className="form-label" style={{ marginBottom: "8px" }}>🗺️ Xem trước bản đồ</div>
                    <iframe
                      src={values["map_embed_url"]}
                      width="100%"
                      height="280"
                      style={{ border: "none", borderRadius: "var(--radius)", display: "block" }}
                      allowFullScreen
                      loading="lazy"
                      title="Google Maps Preview"
                    />
                  </div>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Đang tải cài đặt...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
