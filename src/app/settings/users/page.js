"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CDC_DEPARTMENTS } from "@/lib/departments";
import { ROLE_LABELS } from "@/lib/roles";

// Badge màu sắc theo role
const ROLE_BADGE_STYLE = {
  admin:            { backgroundColor: "#f3e8ff", color: "#6b21a8" },
  staff:            { backgroundColor: "#e0f2fe", color: "#0369a1" },
  broadcaster:      { backgroundColor: "#fef9c3", color: "#854d0e" },
  internal_sender:  { backgroundColor: "#dcfce7", color: "#166534" },
  knowledge_editor: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

function RoleBadge({ role }) {
  if (!role) return null;
  const roles = role.split(",").map(r => r.trim());
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
      {roles.map(r => {
        const label = ROLE_LABELS[r] || r;
        const style = ROLE_BADGE_STYLE[r] || { backgroundColor: "#f1f5f9", color: "#475569" };
        return (
          <span key={r} style={{ display: "inline-block", padding: "4px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold", ...style }}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null if creating
  
  // Form states
  const [formFullName, setFormFullName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRoles, setFormRoles] = useState(["staff"]);
  const [formDepartment, setFormDepartment] = useState("");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users list
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.data) {
        setUsers(json.data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormFullName("");
    setFormUsername("");
    setFormPassword("");
    setFormRoles(["staff"]);
    setFormDepartment("");
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormFullName(user.fullName);
    setFormUsername(user.username);
    setFormPassword(""); // Don't show password
    setFormRoles(user.role ? user.role.split(",").map(r => r.trim()) : ["staff"]);
    setFormDepartment(user.department || "");
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(true);

    if (!formFullName.trim() || !formUsername.trim() || (editingUser === null && !formPassword)) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      setActionLoading(false);
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const payload = {
        fullName: formFullName,
        username: formUsername,
        role: formRoles.join(","),
        ...(formRoles.includes("staff") && { department: formDepartment }),
        ...(formPassword && { password: formPassword }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Thao tác thất bại");
      }

      setSuccessMsg(editingUser ? "Cập nhật tài khoản thành công!" : "Tạo tài khoản thành công!");
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (user) => {
    if (session?.user?.email === user.username) {
      alert("Bạn không thể tự xóa tài khoản của chính mình!");
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.fullName}" (${user.username}) không?`)) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thao tác thất bại");
      setSuccessMsg(`Đã xóa tài khoản "${user.fullName}" thành công.`);
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: `
        .user-modal-box {
          background: white;
          padding: 30px;
          border-radius: var(--radius-lg);
          width: 90%;
          max-width: 450px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
          animation: scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @media (max-width: 768px) {
          .user-modal-overlay {
            align-items: flex-end !important;
          }
          .user-modal-box {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
            padding: 24px 24px 32px 24px !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.15) !important;
            animation: slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1) !important;
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .user-modal-box::before {
            content: '';
            display: block;
            width: 40px;
            height: 4px;
            background: var(--border);
            border-radius: 2px;
            margin: -10px auto 20px auto;
          }
        }
      `}} />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Phân quyền & Quản lý tài khoản</h1>
          <p className="page-desc">Quản lý các tài khoản quản trị viên và nhân viên vận hành hệ thống CDC Đà Nẵng.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          ➕ Tạo tài khoản mới
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius)", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", marginBottom: "16px", fontWeight: 600 }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: "12px 16px", borderRadius: "var(--radius)", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", marginBottom: "16px", fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

      {/* Main List */}
      <div className="card">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)", width: 28, height: 28, marginRight: "10px" }} />
            Đang tải danh sách tài khoản...
          </div>
        ) : (
          <div className="users-responsive-container">
            {/* PC Desktop Table View */}
            <div className="table-responsive desktop-only">
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 8px" }}>Họ và tên</th>
                    <th style={{ padding: "12px 8px" }}>Tên đăng nhập</th>
                    <th style={{ padding: "12px 8px", width: "150px" }}>Vai trò</th>
                    <th style={{ padding: "12px 8px" }}>Phòng ban</th>
                    <th style={{ padding: "12px 8px", width: "180px" }}>Ngày tạo</th>
                    <th style={{ padding: "12px 8px", width: "180px" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = session?.user?.email === u.username;
                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                        <td style={{ padding: "16px 8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>
                              {u.fullName}
                            </span>
                            {isSelf && (
                              <span style={{ fontSize: "0.75rem", background: "var(--primary-light)", color: "var(--primary)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                Bạn
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px 8px", fontSize: "0.9rem", color: "var(--text)" }}>
                          <code>{u.username}</code>
                        </td>
                        <td style={{ padding: "16px 8px" }}>
                          <RoleBadge role={u.role} />
                        </td>
                        <td style={{ padding: "16px 8px", fontSize: "0.85rem", color: "var(--text)" }}>
                          {u.department || "-"}
                        </td>
                        <td style={{ padding: "16px 8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {new Date(u.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td style={{ padding: "16px 8px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleOpenEdit(u)}>
                              ✏️ Sửa
                            </button>
                            {!isSelf && (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleDelete(u)}
                                style={{ color: "var(--danger)", borderColor: "var(--border)" }}
                              >
                                🗑️ Xóa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="mobile-card-list mobile-only">
              {users.map((u) => {
                const isSelf = session?.user?.email === u.username;
                const initials = u.fullName
                  ?.split(" ")
                  .slice(-2)
                  .map((w) => w[0])
                  .join("") || "A";

                return (
                  <div key={u.id} className="mobile-card-item">
                    <div className="mobile-card-main">
                      <div 
                        className="mobile-card-avatar" 
                        style={{ 
                          background: u.role === "admin" 
                            ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" 
                            : "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                          color: "white",
                          fontSize: "0.95rem",
                          fontWeight: "700",
                          borderRadius: "50%",
                          width: "40px",
                          height: "40px"
                        }}
                      >
                        {initials.toUpperCase()}
                      </div>
                      <div className="mobile-card-body">
                        <div className="mobile-card-name" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem" }}>
                          <span>{u.fullName}</span>
                          {isSelf && (
                            <span style={{ fontSize: "0.68rem", background: "var(--primary-light)", color: "var(--primary)", padding: "1px 4px", borderRadius: "3px", fontWeight: "bold" }}>
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="mobile-card-meta">
                          <code style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{u.username}</code>
                          <RoleBadge role={u.role} />
                          {u.department && (
                            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "4px" }}>• {u.department}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mobile-card-actions">
                      <button className="mobile-card-action-btn" onClick={() => handleOpenEdit(u)}>
                        ✏️ Chỉnh sửa
                      </button>
                      {!isSelf && (
                        <button className="mobile-card-action-btn" onClick={() => handleDelete(u)} style={{ color: "var(--danger)" }}>
                          🗑️ Xóa tài khoản
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div 
          className="modal-overlay user-modal-overlay"
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(4px)"
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="user-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "20px", color: "var(--text)" }}>
              {editingUser ? "✏️ Cập nhật tài khoản" : "👥 Tạo tài khoản mới"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="user-fullname">Họ và tên</label>
                <input
                  id="user-fullname"
                  type="text"
                  className="form-input"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="user-username">Tên đăng nhập (Email/Username)</label>
                <input
                  id="user-username"
                  type="text"
                  className="form-input"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="nhanvien_cdc"
                  disabled={editingUser !== null} // Cannot change username after creation
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="user-password">
                  {editingUser ? "Mật khẩu mới (Để trống nếu giữ nguyên)" : "Mật khẩu"}
                </label>
                <input
                  id="user-password"
                  type="password"
                  className="form-input"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Nhập mật khẩu..."}
                  required={editingUser === null}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>Vai trò (Có thể chọn nhiều)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--bg)", padding: "12px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  {[
                    { id: "admin", label: "👑 Quản trị viên" },
                    { id: "staff", label: "👤 Nhân viên" },
                    { id: "broadcaster", label: "📢 Tin truyền thông" },
                    { id: "internal_sender", label: "📧 Tin nội bộ" },
                    { id: "knowledge_editor", label: "🧠 Kho tri thức AI" },
                  ].map(role => (
                    <label key={role.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                      <input 
                        type="checkbox" 
                        checked={formRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormRoles(prev => [...prev, role.id]);
                          } else {
                            setFormRoles(prev => prev.filter(r => r !== role.id));
                          }
                        }}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formRoles.includes("staff") && (
                <div className="form-group">
                  <label className="form-label" htmlFor="user-department">Phòng ban (Chuyên môn)</label>
                  <select
                    id="user-department"
                    className="form-input"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    required
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">-- Chọn đơn vị công tác --</option>
                    {CDC_DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={actionLoading}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  {actionLoading && <span className="spinner" style={{ width: 12, height: 12 }} />}
                  {actionLoading ? "Đang xử lý..." : "Lưu tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
