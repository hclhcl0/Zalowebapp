"use client";

import { useState, useEffect } from "react";

export default function WebcqCategoriesPanel() {
  const [allCategories, setAllCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/webcq-categories")
      .then((r) => r.json())
      .then((data) => {
        setAllCategories(data.allCategories || []);
        setSelected(data.selected || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/webcq-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selected }),
      });
      if (res.ok) {
        alert("Lưu danh mục thành công!");
      } else {
        alert("Có lỗi khi lưu.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === cat.id);
      if (exists) {
        return prev.filter((p) => p.id !== cat.id);
      }
      return [...prev, cat];
    });
  };

  const moveItem = (index, direction) => {
    setSelected((prev) => {
      const arr = [...prev];
      if (direction === "up" && index > 0) {
        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      } else if (direction === "down" && index < arr.length - 1) {
        [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      }
      return arr;
    });
  };

  if (loading) return <div style={{ padding: "20px" }}>Đang tải danh mục...</div>;

  const selectedIds = selected.map((c) => c.id);
  const unselectedCats = allCategories.filter((c) => !selectedIds.includes(c.id));

  return (
    <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text)" }}>📑 Chuyên mục Tin tức (từ CDC Đà Nẵng)</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Chọn và sắp xếp các chuyên mục để hiển thị lên Mini App.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "24px" }}>
        {/* Danh sách đã chọn */}
        <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#fff" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "#f8fafc", fontWeight: 600 }}>
            Đã chọn hiển thị ({selected.length})
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", minHeight: "200px" }}>
            {selected.length === 0 && <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Chưa chọn chuyên mục nào.</span>}
            {selected.map((cat, idx) => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ cursor: "pointer", color: "var(--danger)" }} onClick={() => toggleCategory(cat)} title="Xóa khỏi danh sách">
                    ✖
                  </span>
                  <span style={{ fontSize: "1.2rem" }}>{cat.icon || "📄"}</span>
                  <strong>{cat.name}</strong>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button type="button" onClick={() => moveItem(idx, "up")} disabled={idx === 0} style={{ padding: "4px 8px", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1 }}>⬆️</button>
                  <button type="button" onClick={() => moveItem(idx, "down")} disabled={idx === selected.length - 1} style={{ padding: "4px 8px", cursor: idx === selected.length - 1 ? "not-allowed" : "pointer", opacity: idx === selected.length - 1 ? 0.3 : 1 }}>⬇️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danh sách còn lại */}
        <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#fff" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "#f8fafc", fontWeight: 600 }}>
            Chuyên mục có sẵn
          </div>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
            {unselectedCats.map((cat) => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", transition: "background 0.2s" }} onClick={() => toggleCategory(cat)}>
                <span style={{ color: "var(--primary)" }}>➕</span>
                <span style={{ fontSize: "1.2rem" }}>{cat.icon || "📄"}</span>
                <span>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
