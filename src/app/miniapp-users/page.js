"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Search, X, Clock, Calendar, TestTube, Smartphone, RefreshCw, ChevronRight, MessageSquare } from "lucide-react";

const ACTION_LABEL = {
  open:          { icon: "🚀", label: "Mở Mini App" },
  view_article:  { icon: "📰", label: "Đọc bài viết" },
  booking:       { icon: "📅", label: "Đặt lịch" },
  lookup_result: { icon: "🧪", label: "Tra cứu KQ" },
  view_service:  { icon: "💊", label: "Xem dịch vụ" },
  ai_chat:       { icon: "🤖", label: "Chat AI" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "Chưa truy cập";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

function formatDt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

// ─── Detail Slide-Over ───────────────────────────────────────────────────────
function UserDetail({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState("");
  const [userType, setUserType] = useState("");
  const [department, setDepartment] = useState("");
  const [accessLevel, setAccessLevel] = useState("basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/miniapp/users/${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setUser(d.data);
          setNotes(d.data.notes || "");
          setUserType(d.data.userType || "citizen");
          setDepartment(d.data.department || "");
          setAccessLevel(d.data.accessLevel || "basic");
        }
      });
  }, [userId]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/miniapp/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, userType, department, accessLevel }),
    });
    setSaving(false);
  };

  if (!user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>
      <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--primary)" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>👤</div>
        )}
        <div>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>{user.displayName || "Ẩn danh"}</h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{user.zaloUserId}</p>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Tham gia: {new Date(user.followedAt).toLocaleDateString("vi-VN")}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { icon: "🚀", label: "Lần mở", value: user.totalVisits ?? 0 },
          { icon: "📅", label: "Lịch hẹn", value: user._count?.appointments ?? 0 },
          { icon: "🧪", label: "Tra cứu KQ", value: user._count?.testResults ?? 0 },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--primary)" }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Phân loại */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.88rem" }}>Phân loại người dùng</label>
        <select className="form-input" value={userType} onChange={e => setUserType(e.target.value)} style={{ fontSize: "0.88rem" }}>
          <option value="citizen">🏙️ Dân / Bệnh nhân</option>
          <option value="staff">🏥 Cán bộ CDC</option>
        </select>
      </div>

      {userType === "staff" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.88rem" }}>Phòng ban</label>
            <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)} style={{ fontSize: "0.88rem" }}>
              <option value="">-- Chọn phòng ban --</option>
              <option value="khoa_kiem_soat_benh_truyen_nhiem">Khoa KS Bệnh truyền nhiễm</option>
              <option value="khoa_kham_benh">Khoa Khám bệnh</option>
              <option value="khoa_xet_nghiem">Khoa Xét nghiệm</option>
              <option value="ban_giam_doc">Ban Giám đốc</option>
              <option value="khac">Khác</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.88rem" }}>Cấp độ</label>
            <select className="form-input" value={accessLevel} onChange={e => setAccessLevel(e.target.value)} style={{ fontSize: "0.88rem" }}>
              <option value="basic">Nhân viên</option>
              <option value="manager">Trưởng/Phó khoa</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>
        </div>
      )}

      {/* Ghi chú */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.88rem" }}>Ghi chú</label>
        <textarea
          className="form-input"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Nhập ghi chú về người dùng..."
          style={{ resize: "none", fontSize: "0.88rem" }}
        />
      </div>
      <button className="btn btn-primary" style={{ width: "100%", marginBottom: 24 }} onClick={save} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu thay đổi"}
      </button>

      {/* Activity log */}
      <div>
        <h4 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 6 }}>
          <Clock size={14} /> Lịch sử hoạt động ({user._count?.sessions ?? 0})
        </h4>
        {user.sessions?.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Chưa có hoạt động nào.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {user.sessions?.map(s => {
              const al = ACTION_LABEL[s.action] || { icon: "•", label: s.action };
              let meta = "";
              try { const m = JSON.parse(s.metadata || "{}"); meta = m.service || m.code || m.articleId || ""; } catch {}
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{al.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 500 }}>{al.label}{meta ? ` — ${meta}` : ""}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{formatDt(s.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MiniAppUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [userType, setUserType] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, userType, page, limit: 20 });
    const res = await fetch(`/api/miniapp/users?${params}`);
    const json = await res.json();
    setUsers(json.data?.users || []);
    setTotal(json.data?.total || 0);
    setLoading(false);
  }, [q, userType, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      {/* Main list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 700, fontSize: "1.4rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={22} style={{ color: "var(--primary)" }} /> Người dùng Mini App
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>{total} người dùng</p>
          </div>
          <button className="btn btn-outline" onClick={fetchUsers} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Tìm tên, Zalo ID, SĐT..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </div>
          <select className="form-input" style={{ width: 160 }} value={userType} onChange={e => { setUserType(e.target.value); setPage(1); }}>
            <option value="">Tất cả</option>
            <option value="citizen">Dân / Bệnh nhân</option>
            <option value="staff">Cán bộ CDC</option>
          </select>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                {["Người dùng", "Lần mở", "Lần cuối", "Lịch hẹn", "Tra cứu", "Loại", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                  Không tìm thấy người dùng nào.
                </td></tr>
              ) : users.map(u => (
                <tr
                  key={u.id}
                  style={{ borderTop: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-subtle)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                  onClick={() => setSelectedId(u.id)}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{u.displayName || "Ẩn danh"}</p>
                        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{u.zaloUserId.slice(0, 10)}…</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: "0.88rem", fontWeight: 600, color: "var(--primary)" }}>{u.totalVisits ?? 0}</td>
                  <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{timeAgo(u.lastSeenAt)}</td>
                  <td style={{ padding: "10px 14px", fontSize: "0.88rem" }}>{u._count?.appointments ?? 0}</td>
                  <td style={{ padding: "10px 14px", fontSize: "0.88rem" }}>{u._count?.testResults ?? 0}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: 12, fontWeight: 500, background: u.userType === "staff" ? "#dbeafe" : "#dcfce7", color: u.userType === "staff" ? "#1d4ed8" : "#15803d" }}>
                      {u.userType === "staff" ? "Cán bộ" : "Dân"}
                    </span>
                    {u.userType === "staff" && u.department && (
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4, fontFamily: "monospace" }}>
                        {u.department}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: "5px 12px" }}>← Trước</button>
            <span style={{ padding: "5px 12px", fontSize: "0.88rem", color: "var(--text-muted)" }}>Trang {page}/{totalPages}</span>
            <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "5px 12px" }}>Sau →</button>
          </div>
        )}
      </div>

      {/* Slide-over detail */}
      {selectedId && (
        <div style={{ width: 380, borderLeft: "1px solid var(--border)", background: "white", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>Chi tiết người dùng</h3>
            <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <UserDetail userId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
