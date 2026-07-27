"use client";

import { useState, useEffect } from "react";
import BannerListEditor from "../settings/BannerListEditor";
import FooterInfoEditor from "../settings/FooterInfoEditor";
import WebcqCategoriesPanel from "../settings/WebcqCategoriesPanel";

const MINIAPP_FIELDS = [
  { key: "mini_app_primary_color", label: "Màu chủ đạo (Hex)", type: "color", placeholder: "VD: #1890ff" },
  { key: "mini_app_primary_light", label: "Màu chủ đạo nhạt (Hex)", type: "color", placeholder: "VD: #40a9ff" },
  { key: "mini_app_primary_dark", label: "Màu chủ đạo đậm (Hex)", type: "color", placeholder: "VD: #096dd9" },
  { key: "mini_app_header_color", label: "Màu chữ thanh tiêu đề (Hex)", type: "color", placeholder: "Mặc định: #00a651" },
  { key: "mini_app_footer_bg", label: "Màu nền Footer (Hex)", type: "color", placeholder: "Mặc định: #ffffff" },
  { key: "mini_app_banner_effect", label: "Hiệu ứng chuyển slide", type: "select", options: ["slide", "fade", "coverflow"], placeholder: "Mặc định: slide" },
  { key: "mini_app_banner_ratio", label: "Tỷ lệ khung hình (Slide Ratio)", type: "select", options: ["16/9", "21/9", "2/1", "1/1"], placeholder: "Mặc định: 16/9" },
  { key: "mini_app_banner_delay", label: "Tự động lướt (giây)", type: "number", placeholder: "Nhập số giây. VD: 3 (nhập 0 để tắt)" },
  { key: "mini_app_header_bg", label: "Hình nền thanh tiêu đề (URL)", type: "image", placeholder: "VD: https://domain.com/bg.png", fullWidth: true },
  { key: "mini_app_banners", label: "Banners Slide Đầu Trang", type: "banner_list", fullWidth: true },
  { key: "mini_app_mid_banners", label: "Banners Xen Kẽ Chuyên Mục", type: "banner_list", fullWidth: true },
  { key: "mini_app_footer_info", label: "Thông tin liên hệ chân trang (Footer)", type: "footer_info_list", fullWidth: true },
];

export default function MiniAppSettingsPage() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.data) {
        const valObj = {};
        for (const [k, v] of Object.entries(json.data)) {
          valObj[k] = v.value;
        }
        setValues(valObj);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = MINIAPP_FIELDS.map((f) => ({
        key: f.key,
        value: values[f.key] || "",
        label: f.label,
      }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      showToast("Lưu cấu hình thành công!");
    } catch (err) {
      showToast("Lỗi: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: '30px', height: '30px' }}></div>
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px', paddingBottom: '80px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎨</span> Cấu hình Zalo Mini App
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Tùy chỉnh giao diện, màu sắc và nội dung tĩnh cho Zalo Mini App hiển thị với người dân.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          {MINIAPP_FIELDS.map((field) => (
            <div 
              key={field.key} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                gridColumn: field.fullWidth ? '1 / -1' : 'auto',
                borderBottom: field.fullWidth ? '1px solid var(--border)' : 'none', 
                paddingBottom: field.fullWidth ? '24px' : '0' 
              }}
            >
              <label className="form-label">{field.label}</label>
              <div style={{ width: '100%' }}>
                {field.type === "select" ? (
                  <select
                    className="form-input"
                    value={values[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">{field.placeholder || "Chọn..."}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === "banner_list" ? (
                  <BannerListEditor 
                    value={values[field.key]} 
                    onChange={(val) => handleChange(field.key, val)} 
                  />
                ) : field.type === "footer_info_list" ? (
                  <FooterInfoEditor 
                    value={values[field.key]} 
                    onChange={(val) => handleChange(field.key, val)} 
                  />
                ) : field.type === "color" ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="color"
                      value={values[field.key] || "#ffffff"}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      style={{ width: '40px', height: '40px', padding: '0', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder={field.placeholder}
                      value={values[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                ) : field.type === "image" ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={field.placeholder}
                      value={values[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <label className="btn btn-outline" style={{ cursor: "pointer", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                      Tải lên
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append("file", file);
                          try {
                            const res = await fetch("/api/upload", { method: "POST", body: formData });
                            const data = await res.json();
                            if (data.success) {
                              handleChange(field.key, data.url);
                            } else {
                              alert("Lỗi tải ảnh: " + data.error);
                            }
                          } catch (err) {
                            alert("Lỗi kết nối.");
                          }
                        }} 
                      />
                    </label>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    className="form-input"
                    placeholder={field.placeholder}
                    value={values[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', position: 'sticky', bottom: '16px', zIndex: 10 }}>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ minWidth: '150px', boxShadow: 'var(--shadow-lg)' }}>
            {saving ? <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto', borderColor: '#fff', borderTopColor: 'transparent' }}></div> : "Lưu cấu hình"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: '32px' }}>
        <WebcqCategoriesPanel />
      </div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '16px', right: '16px', padding: '12px 24px', borderRadius: 'var(--radius)', 
          boxShadow: 'var(--shadow-lg)', color: '#fff', fontWeight: 500, zIndex: 50,
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)'
        }}>
          {toast.msg}
        </div>
      )}
    </main>
  );
}
