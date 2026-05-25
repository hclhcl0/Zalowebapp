"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export default function FollowersPage() {
  const { data: session } = useSession();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal states
  const [selectedFollower, setSelectedFollower] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingChat, setLoadingChat] = useState(false);
  
  // Edit metadata states
  const [newPhone, setNewPhone] = useState("");
  const [newUserType, setNewUserType] = useState("citizen");
  const [newDept, setNewDept] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [updatingMeta, setUpdatingMeta] = useState(false);
  
  // Sync state
  const [syncing, setSyncing] = useState(false);

  const handleSyncFollowers = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/followers/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Đồng bộ thất bại");
      
      alert(`🎉 Đồng bộ hoàn tất!\n- Tổng số người quan tâm từ Zalo: ${json.summary.totalFromZalo}\n- Thêm mới vào DB: ${json.summary.newAdded}\n- Cập nhật thông tin: ${json.summary.updated}`);
      fetchFollowers(); // reload list
    } catch (err) {
      alert("Lỗi đồng bộ: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const fetchFollowers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/followers?query=${encodeURIComponent(searchQuery)}&userType=${userTypeFilter}&page=${currentPage}&limit=${pageSize}`);
      const json = await res.json();
      if (json.data) {
        setFollowers(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalItems(json.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error("Error fetching followers:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, userTypeFilter, currentPage, pageSize]);

  // Reset về trang 1 khi thay đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, userTypeFilter]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  // Load chat history & follower details
  const handleOpenDetail = async (follower) => {
    setSelectedFollower(follower);
    setNewPhone(follower.phone || "");
    setNewUserType(follower.userType || "citizen");
    setNewDept(follower.department || "");
    setNewNotes(follower.notes || "");
    setChatMessage("");
    setIsModalOpen(true);
    setLoadingChat(true);
    
    try {
      // Fetch fresh details (including profile and logs)
      const resDetails = await fetch(`/api/followers/${follower.id}`);
      const jsonDetails = await resDetails.json();
      if (jsonDetails.data) {
        setSelectedFollower(jsonDetails.data);
        setNewPhone(jsonDetails.data.phone || "");
        setNewUserType(jsonDetails.data.userType || "citizen");
        setNewDept(jsonDetails.data.department || "");
        setNewNotes(jsonDetails.data.notes || "");
      }

      // Fetch chat history from MessageLog table
      const resLogs = await fetch(`/api/followers/${follower.id}/logs`);
      const jsonLogs = await resLogs.json();
      if (jsonLogs.data) {
        setChatHistory(jsonLogs.data);
      } else {
        setChatHistory([]);
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
      setChatHistory([]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFollower(null);
    setChatHistory([]);
  };

  // Update follower metadata (Phone, userType, department, notes)
  const handleUpdateFollowerMeta = async () => {
    if (!selectedFollower) return;
    setUpdatingMeta(true);
    try {
      const res = await fetch(`/api/followers/${selectedFollower.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPhone,
          userType: newUserType,
          department: newDept,
          notes: newNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Thao tác thất bại");
      
      // Update state
      setSelectedFollower(prev => ({
        ...prev,
        phone: json.data.phone,
        userType: json.data.userType,
        department: json.data.department,
        notes: json.data.notes,
      }));
      alert("🎉 Cập nhật thông tin phân loại thành công!");
      fetchFollowers(); // reload list
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setUpdatingMeta(false);
    }
  };

  // (Chức năng gửi tin nhắn 1-1 không khả dụng với OA Cơ quan Nhà nước)

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Người quan tâm Zalo OA</h1>
          <p className="page-desc">Danh sách người dân đã nhấn quan tâm trang Zalo OA của CDC Đà Nẵng.</p>
        </div>
        <div>
          <button 
            className="btn btn-outline" 
            onClick={handleSyncFollowers} 
            disabled={syncing || loading}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {syncing ? (
              <>
                <div className="spinner" style={{ width: "14px", height: "14px", border: "1.5px solid var(--text-muted)", borderTopColor: "var(--primary)" }} />
                Đang đồng bộ...
              </>
            ) : "🔄 Đồng bộ từ Zalo OA"}
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Tabs lọc theo userType */}
          <div style={{ display: "flex", gap: "4px", background: "var(--bg)", padding: "4px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setUserTypeFilter("all")}
              className={`btn btn-sm ${userTypeFilter === "all" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 12px", border: "none", borderRadius: "calc(var(--radius) - 2px)" }}
            >
              👥 Tất cả
            </button>
            <button
              onClick={() => setUserTypeFilter("citizen")}
              className={`btn btn-sm ${userTypeFilter === "citizen" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 12px", border: "none", borderRadius: "calc(var(--radius) - 2px)" }}
            >
              🟢 Khách hàng
            </button>
            <button
              onClick={() => setUserTypeFilter("staff")}
              className={`btn btn-sm ${userTypeFilter === "staff" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 12px", border: "none", borderRadius: "calc(var(--radius) - 2px)" }}
            >
              💼 Cán bộ cơ quan
            </button>
          </div>

          {/* Ô Tìm kiếm */}
          <div style={{ display: "flex", gap: "10px", flex: 1, maxWidth: "450px" }}>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm theo tên, SĐT, ID hoặc phòng ban..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={fetchFollowers}>
              🔍 Tìm kiếm
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="card">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)", width: 28, height: 28, marginRight: "10px" }} />
            Đang tải danh sách người quan tâm...
          </div>
        ) : followers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
            📭 Không tìm thấy người dùng nào phù hợp.
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 8px", width: "60px" }}>Avatar</th>
                  <th style={{ padding: "12px 8px" }}>Tên người dùng</th>
                  <th style={{ padding: "12px 8px", width: "200px" }}>Zalo User ID</th>
                  <th style={{ padding: "12px 8px", width: "150px" }}>Số điện thoại</th>
                  <th style={{ padding: "12px 8px", width: "150px" }}>Ngày quan tâm</th>
                  <th style={{ padding: "12px 8px", width: "180px" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {followers.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                    <td style={{ padding: "12px 8px" }}>
                      {f.avatarUrl ? (
                        <img
                          src={f.avatarUrl}
                          alt={f.displayName}
                          style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
                        />
                      ) : (
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                          {f.displayName ? f.displayName.substring(0, 1) : "U"}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>{f.displayName}</span>
                        {f.userType === "staff" ? (
                          <span 
                            style={{ 
                              fontSize: "0.7rem", 
                              padding: "2px 6px", 
                              background: "var(--primary-light)", 
                              color: "var(--primary)",
                              border: "1px solid var(--border-focus)",
                              borderRadius: "4px",
                              fontWeight: 500
                            }}
                          >
                            💼 Cơ quan {f.department ? `· ${f.department}` : ""}
                          </span>
                        ) : (
                          <span 
                            style={{ 
                              fontSize: "0.7rem", 
                              padding: "2px 6px", 
                              background: "#f0fdf4", 
                              color: "var(--success)",
                              border: "1px solid #bbf7d0",
                              borderRadius: "4px",
                              fontWeight: 500
                            }}
                          >
                            🟢 Khách hàng
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        {f.appointments.length} lịch hẹn | {f.testResults.length} kết quả
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <code style={{ fontSize: "0.75rem", background: "var(--bg)", padding: "2px 6px", borderRadius: "4px" }}>
                          {f.zaloUserId}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(f.zaloUserId)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)" }}
                          title="Copy ID"
                        >
                          📋
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "0.9rem" }}>
                      {f.phone ? (
                        <span style={{ fontWeight: 500 }}>{f.phone}</span>
                      ) : (
                        <span style={{ color: "var(--text-light)", fontStyle: "italic" }}>Chưa có SĐT</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {new Date(f.followedAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => handleOpenDetail(f)}>
                        💬 Chi tiết & Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && followers.length > 0 && (
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            background: "#fafafa",
            borderBottomLeftRadius: "var(--radius)",
            borderBottomRightRadius: "var(--radius)",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            {/* Left Side: Summary info */}
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Hiển thị <strong>{followers.length}</strong> trên <strong>{totalItems}</strong> người quan tâm
            </div>

            {/* Right Side: Page buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Page Size Select */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginRight: "12px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "white",
                    cursor: "pointer"
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Navigation Buttons */}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loading}
                style={{ padding: "4px 10px", fontSize: "0.8rem", height: "32px", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                ⏮️ Đầu
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                style={{ padding: "4px 10px", fontSize: "0.8rem", height: "32px", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                ◀️ Trước
              </button>

              <span style={{ fontSize: "0.85rem", color: "var(--text)", fontWeight: 600, padding: "0 8px" }}>
                Trang {currentPage} / {totalPages}
              </span>

              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                style={{ padding: "4px 10px", fontSize: "0.8rem", height: "32px", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                Sau ▶️
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                style={{ padding: "4px 10px", fontSize: "0.8rem", height: "32px", border: "1px solid var(--border)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                Cuối ⏭️
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Chat Modal */}
      {isModalOpen && selectedFollower && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white", borderRadius: "var(--radius-lg)",
            width: "90%", maxWidth: "900px", height: "85vh",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            display: "grid", gridTemplateColumns: "1.2fr 1.8fr",
            overflow: "hidden"
          }}>
            
            {/* Left Panel: Follower Details */}
            <div style={{ borderRight: "1px solid var(--border)", background: "var(--bg)", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
              {/* Profile Card */}
              <div style={{ padding: "24px", background: "white", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                {selectedFollower.avatarUrl ? (
                  <img
                    src={selectedFollower.avatarUrl}
                    alt={selectedFollower.displayName}
                    style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", marginBottom: "12px", border: "2px solid var(--primary-light)" }}
                  />
                ) : (
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "2rem", margin: "0 auto 12px" }}>
                    {selectedFollower.displayName ? selectedFollower.displayName.substring(0, 1) : "U"}
                  </div>
                )}
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>{selectedFollower.displayName}</h3>
                
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", marginBottom: "16px" }}>
                  Zalo ID: <code>{selectedFollower.zaloUserId}</code>
                </div>

                {/* Form cấu hình phân loại & thông tin */}
                <div style={{ textAlign: "left", background: "var(--bg)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", paddingBottom: "6px", marginBottom: "4px" }}>
                    ⚙️ Phân loại & Thông tin
                  </div>
                  
                  {/* Số điện thoại */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>📞 Số điện thoại</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Chưa cập nhật SĐT..."
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
                    />
                  </div>

                  {/* Nhóm phân loại */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>🏷️ Phân loại đối tượng</label>
                    <select
                      className="form-input"
                      value={newUserType}
                      onChange={(e) => {
                        setNewUserType(e.target.value);
                        if (e.target.value !== "staff") {
                          setNewDept("");
                        }
                      }}
                      style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", background: "white", cursor: "pointer" }}
                    >
                      <option value="citizen">🟢 Khách hàng / Người dân</option>
                      <option value="staff">💼 Cán bộ cơ quan</option>
                    </select>
                  </div>

                  {/* Phòng ban nếu thuộc cơ quan */}
                  {newUserType === "staff" && (
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>🏢 Khoa / Phòng ban</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ví dụ: Khoa xét nghiệm, Kế hoạch..."
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
                      />
                    </div>
                  )}

                  {/* Ghi chú */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>📝 Ghi chú nhanh</label>
                    <textarea
                      className="form-input"
                      placeholder="Nhập thông tin ghi chú..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      style={{ width: "100%", height: "60px", padding: "6px 10px", fontSize: "0.85rem", resize: "none" }}
                    />
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleUpdateFollowerMeta}
                    disabled={updatingMeta}
                    style={{ width: "100%", marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    {updatingMeta ? (
                      <>
                        <div className="spinner" style={{ width: "12px", height: "12px", border: "1.5px solid var(--text-muted)", borderTopColor: "white" }} />
                        Đang lưu...
                      </>
                    ) : "💾 Lưu thay đổi"}
                  </button>
                </div>
              </div>

              {/* Follower History & Services */}
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Appointments */}
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                    💉 Lịch hẹn tiêm chủng
                  </h4>
                  {(!selectedFollower.appointments || selectedFollower.appointments.length === 0) ? (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-light)", fontStyle: "italic" }}>Không có lịch hẹn nào.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedFollower.appointments.map(apt => (
                        <div key={apt.id} style={{ background: "white", padding: "10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontSize: "0.8rem" }}>
                          <div style={{ fontWeight: 600 }}>{apt.vaccineType}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "2px" }}>
                            📅 {new Date(apt.appointedAt).toLocaleDateString("vi-VN")} | 
                            <span style={{ marginLeft: "4px", color: apt.status === "approved" ? "var(--success)" : "var(--warning)" }}>
                              {apt.status === "approved" ? " Đã duyệt" : " Chờ duyệt"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Test Results */}
                <div>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                    🔬 Kết quả xét nghiệm
                  </h4>
                  {(!selectedFollower.testResults || selectedFollower.testResults.length === 0) ? (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-light)", fontStyle: "italic" }}>Không có kết quả nào.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedFollower.testResults.map(tr => (
                        <div key={tr.id} style={{ background: "white", padding: "10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontSize: "0.8rem" }}>
                          <div style={{ fontWeight: 600 }}>Mã: {tr.resultCode}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            📝 {tr.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Lưu ý OA Cơ quan Nhà nước */}
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Panel Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>📋 Lịch sử tương tác</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Các tin nhắn người dân gửi đến OA sẽ hiển thị ở đây
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={handleCloseModal}>
                  Đóng
                </button>
              </div>

              {/* Notice Banner: OA type limitation */}
              <div style={{
                margin: "16px 20px 0",
                padding: "14px 16px",
                background: "#fff8e1",
                border: "1px solid #ffe082",
                borderRadius: "var(--radius)",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start"
              }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#795548", marginBottom: "4px" }}>
                    OA Cơ quan Nhà nước không hỗ trợ gửi tin nhắn 1-1 qua API
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#8d6e63", lineHeight: 1.5 }}>
                    Theo chính sách của Zalo, tính năng gửi <strong>Tin tư vấn (CS)</strong> chỉ dành cho OA loại <strong>Doanh nghiệp</strong>.
                    Để trả lời tin nhắn của người dân, vui lòng sử dụng <strong>Zalo OA Manager</strong>.
                  </div>
                  <a
                    href="https://oa.zalo.me/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "10px",
                      padding: "6px 14px",
                      background: "#0068ff",
                      color: "white",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textDecoration: "none"
                    }}
                  >
                    <img src="https://stc-zalofamily.akamaized.net/pc-web/resources/images/logo_zalo.svg" alt="Zalo" style={{ width: "14px", height: "14px", filter: "brightness(0) invert(1)" }} />
                    Mở Zalo OA Manager
                  </a>
                </div>
              </div>

              {/* Chat History (inbound only) */}
              <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto", display: "flex", flexDirection: "column-reverse", gap: "12px", background: "#f8fafc" }}>
                {loadingChat ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    Đang tải lịch sử...
                  </div>
                ) : chatHistory.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-light)", textAlign: "center", padding: "20px" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "8px" }}>💬</span>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Chưa có tin nhắn nào</div>
                    <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>Tin nhắn từ người dân gửi đến OA sẽ hiển thị ở đây khi có Webhook.</div>
                  </div>
                ) : (
                  chatHistory.map((chat) => {
                    const isOutbound = chat.direction === "outbound";
                    return (
                      <div
                        key={chat.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isOutbound ? "flex-end" : "flex-start",
                          maxWidth: "80%",
                          alignSelf: isOutbound ? "flex-end" : "flex-start"
                        }}
                      >
                        <div style={{
                          padding: "10px 14px",
                          borderRadius: "12px",
                          borderTopRightRadius: isOutbound ? "2px" : "12px",
                          borderTopLeftRadius: isOutbound ? "12px" : "2px",
                          background: isOutbound ? "var(--primary)" : "white",
                          color: isOutbound ? "white" : "var(--text)",
                          fontSize: "0.875rem",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          border: isOutbound ? "none" : "1px solid var(--border)",
                          wordBreak: "break-word"
                        }}>
                          {chat.content}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                          {new Date(chat.receivedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer note */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>💡</span>
                Để gửi thông báo hàng loạt, hãy sử dụng tính năng <strong>ZNS</strong> hoặc <strong>Tin truyền thông</strong> trong Zalo OA Manager.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
