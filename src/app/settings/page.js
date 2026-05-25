"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, Eye, EyeOff, AlertCircle } from "lucide-react";

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
    desc: "Danh sách tài khoản Gmail dùng luân phiên để gửi email báo lương & báo thuế tự động.",
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
      { key: "hotline_main",   label: "Hotline chính",          type: "tel",  placeholder: "VD: 0236.3.828.928" },
      { key: "hotline_zns",    label: "Hotline hỗ trợ Zalo",    type: "tel",  placeholder: "VD: 0905.123.456"   },
      { key: "address",        label: "Địa chỉ trụ sở CDC",     type: "text", placeholder: "VD: 103 Nguyễn Chí Thanh, Hải Châu, Đà Nẵng" },
      { key: "map_embed_url",  label: "Link Google Maps (Embed)", type: "text", placeholder: "https://www.google.com/maps/embed?..." },
      { key: "working_hours",  label: "Giờ làm việc",           type: "text", placeholder: "VD: T2 – T6: 7h30 – 17h00" },
    ],
  },
  {
    id: "oa_info",
    icon: "🏥",
    title: "Thông tin OA hiển thị",
    desc: "Tên và mô tả của Zalo OA hiển thị trên Mini App.",
    fields: [
      { key: "oa_display_name", label: "Tên hiển thị OA",   type: "text",     placeholder: "VD: CDC Đà Nẵng" },
      { key: "oa_welcome_msg",  label: "Tin chào người theo dõi mới", type: "textarea", placeholder: "VD: Xin chào! Cảm ơn bạn đã quan tâm..." },
      { key: "chatbot_default_reply", label: "Tin nhắn mặc định (không khớp từ khoá)", type: "textarea", placeholder: "VD: Xin chào! Bạn có thể hỏi về đặt lịch..." },
    ],
  },
  {
    id: "news_categories",
    icon: "📰",
    title: "Danh mục Tin tức & Cảnh báo",
    desc: "Quản lý các chuyên mục tin tức tuyên truyền trên hệ thống CDC Đà Nẵng.",
    fields: [],
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

  const [newCatId, setNewCatId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📢");

  // Gmail Pool states
  const [accounts, setAccounts] = useState([]);
  const [batchSize, setBatchSize] = useState(10);
  const [delayMs, setDelayMs] = useState(2000);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [isLocalLoaded, setIsLocalLoaded] = useState(false);

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

  const categoriesList = (() => {
    try {
      return values.news_categories ? JSON.parse(values.news_categories) : [
        { id: "daily_news", name: "Tin vắn dịch bệnh", icon: "📰", isDefault: true },
        { id: "vac_schedule", name: "Lịch tiêm chủng", icon: "📅", isDefault: true },
        { id: "alert", name: "Thông báo khẩn", icon: "🚨", isDefault: true }
      ];
    } catch (_) {
      return [
        { id: "daily_news", name: "Tin vắn dịch bệnh", icon: "📰", isDefault: true },
        { id: "vac_schedule", name: "Lịch tiêm chủng", icon: "📅", isDefault: true },
        { id: "alert", name: "Thông báo khẩn", icon: "🚨", isDefault: true }
      ];
    }
  })();

  const handleAddCategory = () => {
    if (!newCatId.trim() || !newCatName.trim()) {
      alert("Vui lòng điền đầy đủ Mã và Tên danh mục!");
      return;
    }
    const cleanId = newCatId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanId) {
      alert("Mã danh mục không hợp lệ! Chỉ sử dụng chữ thường, số, dấu gạch dưới.");
      return;
    }
    if (categoriesList.some(c => c.id === cleanId)) {
      alert("Mã danh mục này đã tồn tại!");
      return;
    }
    const updated = [
      ...categoriesList,
      { id: cleanId, name: newCatName.trim(), icon: newCatIcon.trim() || "📢" }
    ];
    setValues(prev => ({ ...prev, news_categories: JSON.stringify(updated) }));
    setNewCatId("");
    setNewCatName("");
    setNewCatIcon("📢");
  };

  const handleDeleteCategory = (catId) => {
    const target = categoriesList.find(c => c.id === catId);
    if (target?.isDefault) {
      alert("Không thể xóa danh mục mặc định của hệ thống!");
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa danh mục "${target?.name}"? Các bài viết thuộc danh mục này sẽ không bị xóa nhưng sẽ không hiển thị trên danh mục tương ứng.`)) {
      return;
    }
    const updated = categoriesList.filter(c => c.id !== catId);
    setValues(prev => ({ ...prev, news_categories: JSON.stringify(updated) }));
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

  // Đọc kết quả OAuth callback từ query params
  useEffect(() => {
    const success = searchParams.get("oauth_success");
    const err     = searchParams.get("oauth_error");
    if (success) {
      setOauthMsg({ type: "success", text: "✅ Xác thực thành công! Access Token đã được lưu vào hệ thống." });
      setActiveTab("oauth");
      loadSettings(); // Tải lại để hiển thị token mới
      router.replace("/settings"); // Xóa query params
    }
    if (err) {
      setOauthMsg({ type: "error", text: `❌ Lỗi OAuth: ${decodeURIComponent(err)}` });
      setActiveTab("oauth");
      router.replace("/settings");
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
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
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
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", md: "1.2fr 0.8fr", gap: "24px" }}>
                    {/* Danh sách & form */}
                    <div>
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>📧 Danh sách tài khoản trong Pool</span>
                        {accounts.length > 0 && <span className="badge badge-info">{accounts.length}</span>}
                      </h3>

                      <div style={{
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        color: "#78350f",
                        borderRadius: "var(--radius)",
                        padding: "12px",
                        fontSize: "0.8rem",
                        lineHeight: "1.5",
                        marginBottom: "16px",
                        display: "flex",
                        gap: "8px"
                      }}>
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                        <span>
                          Sử dụng <strong>Mật khẩu ứng dụng (App Password)</strong>. Hãy tạo trong <em>Google Account &rarr; Bảo mật &rarr; Xác minh 2 bước &rarr; Mật khẩu ứng dụng</em>.
                        </span>
                      </div>

                      {/* Add Form */}
                      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>➕ Thêm Gmail mới</div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <input
                            type="email"
                            placeholder="Email gửi (ví dụ: cdc@gmail.com)"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="form-input"
                            style={{ height: "36px" }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <input
                            type="password"
                            placeholder="Mật khẩu ứng dụng (16 ký tự)"
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            className="form-input"
                            style={{ height: "36px" }}
                          />
                        </div>
                        <button
                          onClick={addAccount}
                          disabled={!newEmail.trim() || !newPass.trim()}
                          className="btn btn-primary btn-sm"
                          style={{ width: "100%", justifyContent: "center" }}
                        >
                          <Plus className="w-4 h-4" /> Thêm vào Pool
                        </button>
                      </div>

                      {/* Accounts list */}
                      {accounts.length === 0 ? (
                        <div style={{
                          textAlign: "center",
                          padding: "24px 0",
                          color: "var(--text-muted)",
                          fontSize: "0.8rem",
                          border: "2px dashed var(--border)",
                          borderRadius: "var(--radius)"
                        }}>
                          Chưa có tài khoản Gmail nào được cấu hình.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }}>
                          {accounts.map((acc, idx) => (
                            <div key={acc.id} style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "white",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius)",
                              padding: "8px 12px"
                            }}>
                              <div style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "var(--border)",
                                color: "var(--text-muted)",
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}>
                                {idx + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0, fontSize: "0.8rem" }}>
                                <p style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{acc.user}</p>
                                <p style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "0.75rem", margin: 0 }}>
                                  {acc.showPass ? acc.appPassword : "•••• •••• •••• ••••"}
                                </p>
                              </div>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: "4px", minWidth: "auto" }}
                                onClick={() => togglePass(acc.id)}
                              >
                                {acc.showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: "4px", minWidth: "auto", color: "var(--danger)" }}
                                onClick={() => removeAccount(acc.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tốc độ gửi */}
                    <div>
                      <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "12px" }}>⚙️ Tốc độ & Giãn cách</h3>
                      <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Số email mỗi đợt (Batch size)</label>
                          <input
                            type="number"
                            value={batchSize}
                            onChange={(e) => setBatchSize(Number(e.target.value))}
                            className="form-input"
                          />
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                            Gửi tuần tự từng đợt để tối ưu tài nguyên của Gmail.
                          </span>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Thời gian giãn cách (ms)</label>
                          <input
                            type="number"
                            value={delayMs}
                            onChange={(e) => setDelayMs(Number(e.target.value))}
                            className="form-input"
                          />
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                            Khoảng thời gian nghỉ giữa các đợt (ví dụ: 2000 = 2 giây).
                          </span>
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

              {/* UI cho tab Quản lý Danh mục Tin tức */}
              {activeGroup.id === "news_categories" && (
                <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
                  <div style={{ fontWeight: 600, marginBottom: "12px", fontSize: "0.9rem" }}>📋 Danh sách danh mục hiện tại:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                    {categoriesList.map((cat) => (
                      <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "1.4rem" }}>{cat.icon}</span>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{cat.name}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "10px", fontFamily: "monospace" }}>({cat.id})</span>
                          </div>
                        </div>
                        {cat.isDefault ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "#e2e8f0", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>Mặc định</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
                          >
                            🗑️ Xóa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#f1f5f9", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "12px", color: "var(--text)" }}>➕ Thêm danh mục tin tức mới</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Tên danh mục</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="VD: Hoạt động CDC"
                          value={newCatName}
                          onChange={(e) => setNewCatName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Mã danh mục (viết liền ko dấu)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="VD: cdc_activities"
                          value={newCatId}
                          onChange={(e) => setNewCatId(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.75rem" }}>Biểu tượng</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="📢"
                          style={{ textAlign: "center" }}
                          value={newCatIcon}
                          onChange={(e) => setNewCatIcon(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddCategory}
                    >
                      ➕ Thêm danh mục
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Form các trường */}
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
