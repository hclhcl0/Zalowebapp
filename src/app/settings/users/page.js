"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
  const [formRole, setFormRole] = useState("staff");
  
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
    setFormRole("staff");
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormFullName(user.fullName);
    setFormUsername(user.username);
    setFormPassword(""); // Don't show password
    setFormRole(user.role);
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
        role: formRole,
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
          <div className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 8px" }}>Họ và tên</th>
                  <th style={{ padding: "12px 8px" }}>Tên đăng nhập</th>
                  <th style={{ padding: "12px 8px", width: "150px" }}>Vai trò</th>
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
                        {u.role === "admin" ? (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: "4px", backgroundColor: "#f3e8ff", color: "#6b21a8", fontSize: "0.75rem", fontWeight: "bold" }}>
                            ⚙️ Quản trị viên
                          </span>
                        ) : (
                          <span style={{ display: "inline-block", padding: "4px 8px", borderRadius: "4px", backgroundColor: "#e0f2fe", color: "#0369a1", fontSize: "0.75rem", fontWeight: "bold" }}>
                            👥 Nhân viên
                          </span>
                        )}
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
                              style={{ color: "var(--error)", borderColor: "var(--error-light)" }}
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
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white", padding: "30px", borderRadius: "var(--radius)",
            width: "100%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
          }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px" }}>
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
                <label className="form-label" htmlFor="user-role">Vai trò</label>
                <select
                  id="user-role"
                  className="form-input"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  <option value="staff">Nhân viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={actionLoading}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
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
