"use client";
import { useState, useEffect } from "react";
import { Save, Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, RefreshCw, GripVertical } from "lucide-react";

const CATEGORY_COLORS = {
  "Tiêm chủng":     { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6" },
  "Xét nghiệm":     { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e" },
  "Khám sức khỏe":  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
  "Phòng bệnh":     { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" },
  "Thông tin chung":{ bg: "#f8fafc", border: "#e2e8f0", text: "#475569", dot: "#94a3b8" },
};
const DEFAULT_COLOR = { bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e", dot: "#14b8a6" };

function getColor(cat) { return CATEGORY_COLORS[cat] || DEFAULT_COLOR; }

const PRESET_CATEGORIES = [
  "Tiêm chủng", "Xét nghiệm", "Khám sức khỏe", "Phòng bệnh",
  "Thông tin chung", "Bảng giá", "Dịch tễ", "An toàn thực phẩm", "Khác"
];

export default function MiniAppKnowledgePage() {
  const [topics, setTopics]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [msg, setMsg]           = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState("Tất cả");

  const load = () => {
    setLoading(true);
    fetch("/api/miniapp/knowledge")
      .then(r => r.json())
      .then(d => {
        setTopics(d.topics || []);
        setIsDefault(d.isDefault);
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
        body: JSON.stringify({ topics }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: `Đã lưu ${topics.length} chủ đề! AI Mini App cập nhật trong vài phút.` });
        setIsDefault(false);
      } else {
        setMsg({ type: "error", text: "Lưu thất bại!" });
      }
    } catch {
      setMsg({ type: "error", text: "Lỗi kết nối!" });
    } finally { setSaving(false); }
  };

  const addTopic = () => {
    const newTopic = {
      id: Date.now(), category: "Thông tin chung",
      title: "Chủ đề mới", content: "", active: true
    };
    setTopics(t => [...t, newTopic]);
    setExpanded(e => ({ ...e, [newTopic.id]: true }));
    setTimeout(() => {
      document.getElementById(`topic-title-${newTopic.id}`)?.focus();
    }, 100);
  };

  const removeTopic = (id) => {
    if (!confirm("Xoá chủ đề này?")) return;
    setTopics(t => t.filter(x => x.id !== id));
    setExpanded(e => { const n = {...e}; delete n[id]; return n; });
  };

  const updateTopic = (id, field, val) =>
    setTopics(t => t.map(x => x.id === id ? { ...x, [field]: val } : x));

  const toggleExpand = (id) =>
    setExpanded(e => ({ ...e, [id]: !e[id] }));

  const toggleActive = (id) =>
    setTopics(t => t.map(x => x.id === id ? { ...x, active: !x.active } : x));

  // Filter
  const allCats = ["Tất cả", ...new Set(topics.map(t => t.category).filter(Boolean))];
  const filtered = topics.filter(t => {
    const matchCat = filterCat === "Tất cả" || t.category === filterCat;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
      || t.content.toLowerCase().includes(search.toLowerCase())
      || t.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const activeCount = topics.filter(t => t.active).length;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🧠 Bộ não AI — Zalo Mini App</h1>
          <p className="page-desc">
            Quản lý kiến thức theo từng chủ đề cho Trợ lý AI người dân.
            Tách biệt hoàn toàn với Kho tri thức Zalo OA (nội bộ cán bộ).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-outline" onClick={load} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={15} /> Tải lại
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || loading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Save size={15} /> {saving ? "Đang lưu..." : "Lưu tất cả"}
          </button>
        </div>
      </div>

      {/* Stats + Search bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {/* Stats pills */}
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ padding: "4px 12px", borderRadius: 20, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: "0.82rem", color: "#15803d", fontWeight: 600 }}>
            ✅ {activeCount} chủ đề đang bật
          </span>
          <span style={{ padding: "4px 12px", borderRadius: 20, background: "#fef2f2", border: "1px solid #fecaca", fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>
            ⏸ {topics.length - activeCount} đang tắt
          </span>
        </div>

        {/* Search */}
        <input
          className="form-input"
          placeholder="🔍 Tìm kiếm chủ đề..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
        />

        {/* Add button */}
        <button className="btn btn-outline" onClick={addTopic}
          style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <Plus size={15} /> Thêm chủ đề
        </button>
      </div>

      {/* Category filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {allCats.map(cat => {
          const c = getColor(cat);
          const isActive = filterCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              style={{
                padding: "4px 14px", borderRadius: 20, fontSize: "0.82rem", cursor: "pointer",
                fontWeight: isActive ? 700 : 400,
                border: isActive ? `2px solid ${c.dot}` : "1px solid var(--border)",
                background: isActive ? c.bg : "transparent",
                color: isActive ? c.text : "var(--text-muted)",
                transition: "all 0.15s"
              }}
            >
              {cat !== "Tất cả" && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: c.dot, marginRight: 5 }} />}
              {cat}
              {cat !== "Tất cả" && (
                <span style={{ marginLeft: 5, opacity: 0.6 }}>
                  ({topics.filter(t => t.category === cat).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Default notice */}
      {isDefault && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: "0.83rem", color: "#92400e" }}>
          ⚠️ Đang dùng nội dung mặc định. Chỉnh sửa và bấm <strong>"Lưu tất cả"</strong> để lưu vào database.
        </div>
      )}

      {/* Topics list */}
      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
          <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", opacity: 0.4 }} />
          <p style={{ marginTop: 10 }}>Đang tải...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: 8 }}>🔍</p>
          <p>Không tìm thấy chủ đề nào</p>
          <button className="btn btn-outline" onClick={addTopic} style={{ marginTop: 12 }}>
            <Plus size={14} /> Thêm chủ đề mới
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((topic) => {
            const c = getColor(topic.category);
            const isOpen = !!expanded[topic.id];
            return (
              <div
                key={topic.id}
                style={{
                  border: `1px solid ${isOpen ? c.border : "var(--border)"}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  opacity: topic.active ? 1 : 0.55,
                  transition: "all 0.2s",
                  boxShadow: isOpen ? "0 2px 8px rgba(0,0,0,0.06)" : "none"
                }}
              >
                {/* Topic header */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px",
                    background: isOpen ? c.bg : "var(--surface)",
                    cursor: "pointer",
                    borderBottom: isOpen ? `1px solid ${c.border}` : "none"
                  }}
                  onClick={() => toggleExpand(topic.id)}
                >
                  <GripVertical size={16} color="var(--text-light)" style={{ flexShrink: 0 }} />

                  {/* Category dot */}
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.dot, flexShrink: 0, display: "inline-block" }} />

                  {/* Category badge */}
                  <span style={{
                    padding: "2px 8px", borderRadius: 8, fontSize: "0.72rem",
                    fontWeight: 700, background: c.bg, color: c.text,
                    border: `1px solid ${c.border}`, flexShrink: 0
                  }}>
                    {topic.category}
                  </span>

                  {/* Title */}
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", flex: 1, color: topic.active ? "var(--text)" : "var(--text-muted)" }}>
                    {topic.title}
                  </span>

                  {/* Content preview */}
                  {!isOpen && topic.content && (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {topic.content.substring(0, 60)}...
                    </span>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button
                      title={topic.active ? "Đang bật — click để tắt" : "Đang tắt — click để bật"}
                      onClick={() => toggleActive(topic.id)}
                      style={{
                        padding: "4px 10px", borderRadius: 8, fontSize: "0.75rem", fontWeight: 600,
                        border: `1px solid ${topic.active ? "#bbf7d0" : "#e2e8f0"}`,
                        background: topic.active ? "#f0fdf4" : "#f8fafc",
                        color: topic.active ? "#16a34a" : "#94a3b8",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                      }}
                    >
                      {topic.active ? <><Eye size={12} /> Bật</> : <><EyeOff size={12} /> Tắt</>}
                    </button>
                    <button
                      onClick={() => removeTopic(topic.id)}
                      style={{ color: "var(--danger)", border: "none", background: "none", cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>

                {/* Topic editor */}
                {isOpen && (
                  <div style={{ padding: 16, background: "var(--surface)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                      {/* Category */}
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                          Danh mục
                        </label>
                        <select
                          className="form-input"
                          value={topic.category}
                          onChange={e => updateTopic(topic.id, "category", e.target.value)}
                        >
                          {PRESET_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Title */}
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                          Tiêu đề chủ đề <span style={{ color: "red" }}>*</span>
                        </label>
                        <input
                          id={`topic-title-${topic.id}`}
                          className="form-input"
                          value={topic.title}
                          onChange={e => updateTopic(topic.id, "title", e.target.value)}
                          placeholder="VD: Dịch vụ tiêm chủng vắc xin"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
                          Nội dung <span style={{ color: "red" }}>*</span>
                        </label>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {topic.content.length} ký tự
                        </span>
                      </div>
                      <textarea
                        value={topic.content}
                        onChange={e => updateTopic(topic.id, "content", e.target.value)}
                        placeholder={`Nhập thông tin chi tiết về chủ đề "${topic.title}"...\n\nVí dụ:\n- Dịch vụ cung cấp\n- Quy trình thực hiện\n- Giá / phí\n- Lưu ý quan trọng`}
                        style={{
                          width: "100%", minHeight: 140, fontFamily: "inherit",
                          fontSize: "0.85rem", lineHeight: 1.7, padding: 12,
                          border: "1px solid var(--border)", borderRadius: 10,
                          background: "var(--background)", color: "var(--text)",
                          resize: "vertical", outline: "none", boxSizing: "border-box"
                        }}
                      />
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>
                        💡 Viết rõ ràng, đúng thực tế. AI sẽ dựa vào đây để trả lời người dân.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Save message */}
      {msg && (
        <div style={{
          marginTop: 14, padding: "10px 16px", borderRadius: 10,
          background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: msg.type === "success" ? "#16a34a" : "#dc2626",
          fontSize: "0.85rem",
          border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`
        }}>
          {msg.type === "success" ? "✅ " : "❌ "}{msg.text}
        </div>
      )}

      {/* Bottom save bar */}
      {topics.length > 0 && (
        <div style={{
          marginTop: 16, padding: "14px 20px", borderRadius: 12,
          background: "var(--surface)", border: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {topics.length} chủ đề • {activeCount} đang bật • Sau khi lưu AI cập nhật trong 10 phút
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-outline" onClick={addTopic}
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Thêm chủ đề
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Save size={15} /> {saving ? "Đang lưu..." : "Lưu tất cả"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
