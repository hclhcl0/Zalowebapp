"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp, Phone, Clock } from "lucide-react";

// ─── Hotlines Panel ───────────────────────────────────────────────────────────
export function HotlinesPanel() {
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    fetch("/api/miniapp/hotlines")
      .then(r => r.json())
      .then(d => setHotlines(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (idx, field, val) =>
    setHotlines(h => h.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const add = () => setHotlines(h => [...h, {
    id: Date.now(), name: "", phone: "", displayPhone: "",
    description: "", hours: "", icon: "📞", available: true, extensions: []
  }]);

  const remove = (idx) => {
    if (!confirm("Xoá số tổng đài này?")) return;
    setHotlines(h => h.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/miniapp/hotlines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotlines }),
      });
      if (res.ok) setMsg({ type: "success", text: "Đã lưu danh sách tổng đài!" });
      else setMsg({ type: "error", text: "Lưu thất bại!" });
    } catch { setMsg({ type: "error", text: "Lỗi kết nối!" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 20, color: "var(--text-muted)" }}>Đang tải...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)" }}>📞 Danh sách Tổng đài tư vấn</p>
        <button className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: 4 }} onClick={add}>
          <Plus size={14} /> Thêm số
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {hotlines.map((h, idx) => (
          <div key={h.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--surface)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Icon</label>
                <input className="form-input" value={h.icon} onChange={e => update(idx, "icon", e.target.value)} style={{ fontSize: "1.2rem", width: 60, textAlign: "center" }} />
              </div>
              <div style={{ gridColumn: "span 1" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Tên đường dây <span style={{ color: "red" }}>*</span></label>
                <input className="form-input" value={h.name} onChange={e => update(idx, "name", e.target.value)} placeholder="VD: Tư vấn tiêm chủng" />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Số điện thoại (gọi) <span style={{ color: "red" }}>*</span></label>
                <input className="form-input" value={h.phone} onChange={e => update(idx, "phone", e.target.value)} placeholder="VD: 1900988975" />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Hiển thị số (có dấu chấm/phím)</label>
                <input className="form-input" value={h.displayPhone} onChange={e => update(idx, "displayPhone", e.target.value)} placeholder="VD: 1900.988.975 – Phím 1" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Mô tả ngắn</label>
                <input className="form-input" value={h.description} onChange={e => update(idx, "description", e.target.value)} placeholder="VD: Tư vấn lịch tiêm, loại vắc xin..." />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Giờ hoạt động</label>
                <input className="form-input" value={h.hours} onChange={e => update(idx, "hours", e.target.value)} placeholder="VD: T2–T6: 7:00–16:30" />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={h.available} onChange={e => update(idx, "available", e.target.checked)} />
                  Đang hoạt động
                </label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => remove(idx)} style={{ color: "var(--danger)", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem" }}>
                <Trash2 size={14} /> Xoá
              </button>
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", color: msg.type === "success" ? "#16a34a" : "#dc2626", fontSize: "0.85rem", border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}` }}>
          {msg.text}
        </div>
      )}

      <button className="btn btn-primary" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }} onClick={save} disabled={saving}>
        <Save size={15} /> {saving ? "Đang lưu..." : "Lưu danh sách tổng đài"}
      </button>
    </div>
  );
}

// ─── Schedules Panel ──────────────────────────────────────────────────────────
export function SchedulesPanel() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch("/api/miniapp/schedules")
      .then(r => r.json())
      .then(d => setSchedules(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSchedule = (si, field, val) =>
    setSchedules(s => s.map((item, i) => i === si ? { ...item, [field]: val } : item));

  const updateSession = (si, sesi, field, val) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item,
      sessions: item.sessions.map((ses, j) => j !== sesi ? ses : { ...ses, [field]: val })
    }));

  const updateSlot = (si, sesi, sloti, field, val) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item,
      sessions: item.sessions.map((ses, j) => j !== sesi ? ses : {
        ...ses,
        slots: ses.slots.map((sl, k) => k !== sloti ? sl : { ...sl, [field]: val })
      })
    }));

  const addSlot = (si, sesi) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item,
      sessions: item.sessions.map((ses, j) => j !== sesi ? ses : {
        ...ses, slots: [...ses.slots, { label: "Buổi sáng/Chiều", time: "7:00 – 11:00" }]
      })
    }));

  const removeSlot = (si, sesi, sloti) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item,
      sessions: item.sessions.map((ses, j) => j !== sesi ? ses : {
        ...ses, slots: ses.slots.filter((_, k) => k !== sloti)
      })
    }));

  const addSession = (si) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item,
      sessions: [...item.sessions, { days: "Thứ 2 – Thứ 6", slots: [{ label: "Buổi sáng", time: "7:00 – 11:00" }] }]
    }));

  const removeSession = (si, sesi) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item, sessions: item.sessions.filter((_, j) => j !== sesi)
    }));

  const addQueueInfo = (si) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item, queueInfo: [...(item.queueInfo || []), { label: "Lấy số sáng", time: "Từ 7:00" }]
    }));

  const updateQueueInfo = (si, qi, field, val) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item,
      queueInfo: item.queueInfo.map((q, j) => j !== qi ? q : { ...q, [field]: val })
    }));

  const removeQueueInfo = (si, qi) =>
    setSchedules(s => s.map((item, i) => i !== si ? item : {
      ...item, queueInfo: item.queueInfo.filter((_, j) => j !== qi)
    }));

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/miniapp/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedules }),
      });
      if (res.ok) setMsg({ type: "success", text: "Đã lưu lịch làm việc!" });
      else setMsg({ type: "error", text: "Lưu thất bại!" });
    } catch { setMsg({ type: "error", text: "Lỗi kết nối!" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 20, color: "var(--text-muted)" }}>Đang tải...</div>;

  return (
    <div>
      <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text)", marginBottom: 16 }}>🗓 Lịch làm việc (Tiêm chủng & Xét nghiệm)</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {schedules.map((sch, si) => (
          <div key={sch.id} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            {/* Schedule header */}
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-hover)", cursor: "pointer" }}
              onClick={() => setExpanded(e => ({ ...e, [si]: !e[si] }))}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "1.2rem" }}>{sch.icon}</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{sch.title}</span>
              </div>
              {expanded[si] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {expanded[si] && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Basic fields */}
                <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Icon</label>
                    <input className="form-input" value={sch.icon} onChange={e => updateSchedule(si, "icon", e.target.value)} style={{ fontSize: "1.2rem", textAlign: "center" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Tiêu đề</label>
                    <input className="form-input" value={sch.title} onChange={e => updateSchedule(si, "title", e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Màu (Hex)</label>
                    <input className="form-input" value={sch.color} onChange={e => updateSchedule(si, "color", e.target.value)} placeholder="#007a8c" />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Ghi chú (hiển thị dưới thẻ)</label>
                  <input className="form-input" value={sch.note} onChange={e => updateSchedule(si, "note", e.target.value)} placeholder="VD: Lễ, Tết nghỉ" />
                </div>

                {/* Sessions */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>🗓 Các ca làm việc</label>
                    <button className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "3px 10px" }} onClick={() => addSession(si)}>
                      <Plus size={12} /> Thêm ca
                    </button>
                  </div>
                  {sch.sessions.map((ses, sesi) => (
                    <div key={sesi} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, marginBottom: 8, background: "var(--surface)" }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input className="form-input" value={ses.days} onChange={e => updateSession(si, sesi, "days", e.target.value)} placeholder="VD: Thứ 2 – Thứ 6" style={{ flex: 1 }} />
                        <input className="form-input" value={ses.note || ""} onChange={e => updateSession(si, sesi, "note", e.target.value)} placeholder="Ghi chú ca (tuỳ chọn)" style={{ flex: 1 }} />
                        <button onClick={() => removeSession(si, sesi)} style={{ color: "var(--danger)", border: "none", background: "none", cursor: "pointer" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {ses.slots.map((sl, sloti) => (
                        <div key={sloti} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                          <input className="form-input" value={sl.label} onChange={e => updateSlot(si, sesi, sloti, "label", e.target.value)} placeholder="Buổi sáng/Chiều" style={{ flex: 1 }} />
                          <input className="form-input" value={sl.time} onChange={e => updateSlot(si, sesi, sloti, "time", e.target.value)} placeholder="7:15 – 11:00" style={{ flex: 1 }} />
                          <button onClick={() => removeSlot(si, sesi, sloti)} style={{ color: "var(--danger)", border: "none", background: "none", cursor: "pointer" }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addSlot(si, sesi)} style={{ fontSize: "0.78rem", color: "var(--primary)", border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                        <Plus size={11} /> Thêm buổi
                      </button>
                    </div>
                  ))}
                </div>

                {/* Queue info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>⏱ Giờ lấy số thứ tự</label>
                    <button className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "3px 10px" }} onClick={() => addQueueInfo(si)}>
                      <Plus size={12} /> Thêm
                    </button>
                  </div>
                  {(sch.queueInfo || []).map((q, qi) => (
                    <div key={qi} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                      <input className="form-input" value={q.label} onChange={e => updateQueueInfo(si, qi, "label", e.target.value)} placeholder="Lấy số sáng" style={{ flex: 1 }} />
                      <input className="form-input" value={q.time} onChange={e => updateQueueInfo(si, qi, "time", e.target.value)} placeholder="Từ 7:00" style={{ flex: 1 }} />
                      <button onClick={() => removeQueueInfo(si, qi)} style={{ color: "var(--danger)", border: "none", background: "none", cursor: "pointer" }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {(sch.queueInfo || []).length === 0 && (
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Không có thông tin lấy số thứ tự</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: msg.type === "success" ? "#f0fdf4" : "#fef2f2", color: msg.type === "success" ? "#16a34a" : "#dc2626", fontSize: "0.85rem", border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}` }}>
          {msg.text}
        </div>
      )}

      <button className="btn btn-primary" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }} onClick={save} disabled={saving}>
        <Save size={15} /> {saving ? "Đang lưu..." : "Lưu lịch làm việc"}
      </button>
    </div>
  );
}
