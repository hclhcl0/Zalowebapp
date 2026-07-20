"use client";

import { useState, useEffect } from "react";
import BannerListEditor from "../settings/BannerListEditor";
import FooterInfoEditor from "../settings/FooterInfoEditor";

const MINIAPP_FIELDS = [
  { key: "mini_app_primary_color", label: "Màu chủ đạo (Hex)", type: "text", placeholder: "VD: #1890ff" },
  { key: "mini_app_primary_light", label: "Màu chủ đạo nhạt (Hex)", type: "text", placeholder: "VD: #40a9ff" },
  { key: "mini_app_primary_dark", label: "Màu chủ đạo đậm (Hex)", type: "text", placeholder: "VD: #096dd9" },
  { key: "mini_app_banner_effect", label: "Hiệu ứng chuyển slide", type: "select", options: ["slide", "fade", "coverflow"], placeholder: "Mặc định: slide" },
  { key: "mini_app_banner_ratio", label: "Tỷ lệ khung hình (Slide Ratio)", type: "select", options: ["16/9", "21/9", "2/1", "1/1"], placeholder: "Mặc định: 16/9" },
  { key: "mini_app_banner_delay", label: "Tự động lướt (giây)", type: "number", placeholder: "Nhập số giây. VD: 3 (nhập 0 để tắt)" },
  { key: "mini_app_header_bg", label: "Hình nền thanh tiêu đề (URL)", type: "text", placeholder: "VD: https://domain.com/bg.png" },
  { key: "mini_app_header_color", label: "Màu chữ thanh tiêu đề (Hex)", type: "text", placeholder: "Mặc định: #00a651" },
  { key: "mini_app_banners", label: "Banners Slide Đầu Trang", type: "banner_list" },
  { key: "mini_app_mid_banners", label: "Banners Xen Kẽ Chuyên Mục", type: "banner_list" },
  { key: "mini_app_footer_bg", label: "Màu nền Footer (Hex)", type: "text", placeholder: "Mặc định: #ffffff" },
  { key: "mini_app_footer_info", label: "Thông tin liên hệ chân trang (Footer)", type: "footer_info_list" },
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2 flex items-center gap-2">
            <span>🎨</span> Cấu hình Zalo Mini App
          </h1>
          <p className="text-[var(--text-muted)]">
            Tùy chỉnh giao diện, màu sắc và nội dung tĩnh cho Zalo Mini App hiển thị với người dân.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card p-6">
        <div className="flex flex-col gap-6">
          {MINIAPP_FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-2 border-b border-[var(--border)] pb-6 last:border-0 last:pb-0">
              <label className="font-semibold text-[var(--text)]">{field.label}</label>
              <div className="w-full">
                {field.type === "select" ? (
                  <select
                    className="input-select w-full"
                    value={values[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
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
                ) : (
                  <input
                    type={field.type}
                    className="input-field w-full"
                    placeholder={field.placeholder}
                    value={values[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-end sticky bottom-4">
          <button type="submit" disabled={saving} className="btn-primary shadow-lg" style={{ minWidth: '150px' }}>
            {saving ? <div className="spinner" style={{ width: '20px', height: '20px', margin: '0 auto' }}></div> : "Lưu cấu hình"}
          </button>
        </div>
      </form>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-xl text-white font-medium z-50 animate-slide-up ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.msg}
        </div>
      )}
    </main>
  );
}
