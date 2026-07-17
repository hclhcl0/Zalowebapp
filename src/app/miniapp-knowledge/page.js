"use client";
import { useState, useEffect } from "react";
import { Save, RefreshCw, Info } from "lucide-react";

export default function MiniAppKnowledgePage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [msg, setMsg] = useState(null);
  const [charCount, setCharCount] = useState(0);

  const load = () => {
    setLoading(true);
    fetch("/api/miniapp/knowledge")
      .then(r => r.json())
      .then(d => {
        setContent(d.content || "");
        setIsDefault(d.isDefault);
        setCharCount((d.content || "").length);
      })
      .catch(() => setMsg({ type: "error", text: "Không tải được dữ liệu" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/miniapp/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Đã lưu! AI Mini App sẽ dùng nội dung mới ngay lập tức." });
        setIsDefault(false);
      } else {
        setMsg({ type: "error", text: "Lưu thất bại!" });
      }
    } catch {
      setMsg({ type: "error", text: "Lỗi kết nối!" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧠 Bộ não AI — Zalo Mini App</h1>
          <p className="page-desc">
            Tài liệu riêng cho Trợ lý AI trên Zalo Mini App (dành cho người dân).
            Tách biệt hoàn toàn với Kho tri thức AI của Zalo OA (nội bộ cán bộ).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={load} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={15} /> Tải lại
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Save size={15} /> {saving ? "Đang lưu..." : "Lưu & áp dụng ngay"}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="card" style={{ marginBottom: 16, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Info size={18} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: "0.85rem", color: "#1e40af" }}>
            <strong>Hướng dẫn viết nội dung:</strong>
            <ul style={{ marginTop: 6, paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Dùng <code style={{ background: "#dbeafe", padding: "1px 4px", borderRadius: 3 }}>[TÊN CHỦ ĐỀ]</code> để phân nhóm nội dung</li>
              <li>Viết rõ ràng, đúng thông tin — AI sẽ dựa vào đây để trả lời người dân</li>
              <li>Bao gồm: dịch vụ, giá, quy trình, địa chỉ, lưu ý quan trọng</li>
              <li>Không cần viết giờ làm việc / tổng đài — đã có mục riêng quản lý</li>
              <li>Sau khi lưu, AI cập nhật ngay — không cần deploy lại Mini App</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card">
        {isDefault && (
          <div style={{
            marginBottom: 12, padding: "8px 14px", borderRadius: 8,
            background: "#fffbeb", border: "1px solid #fde68a",
            fontSize: "0.82rem", color: "#92400e", display: "flex", gap: 6
          }}>
            <span>⚠️</span>
            <span>Đang dùng nội dung mặc định. Chỉnh sửa và bấm "Lưu" để cá nhân hoá bộ não AI.</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
            Đang tải...
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
              <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>Nội dung tài liệu</label>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {charCount.toLocaleString("vi-VN")} ký tự
              </span>
            </div>
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); setCharCount(e.target.value.length); }}
              style={{
                width: "100%", minHeight: 500, fontFamily: "monospace",
                fontSize: "0.85rem", lineHeight: 1.7, padding: 14,
                border: "1px solid var(--border)", borderRadius: 10,
                background: "var(--surface)", color: "var(--text)",
                resize: "vertical", outline: "none", boxSizing: "border-box"
              }}
              placeholder="Nhập nội dung tài liệu cho AI Mini App..."
            />
          </>
        )}

        {msg && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 8,
            background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: msg.type === "success" ? "#16a34a" : "#dc2626",
            fontSize: "0.85rem",
            border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Save size={15} /> {saving ? "Đang lưu..." : "Lưu & áp dụng ngay"}
          </button>
          <button className="btn btn-outline" onClick={load} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={15} /> Huỷ thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
