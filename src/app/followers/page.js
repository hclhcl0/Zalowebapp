"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";

const DEPARTMENTS = [
  "Phòng chống bệnh truyền nhiễm",
  "Kiểm dịch Y tế quốc tế",
  "Ký sinh trùng - Côn trùng",
  "Phòng chống bệnh không lây nhiễm",
  "Sức khoẻ môi trường - YTTH",
  "Sức khoẻ sinh sản",
  "Dinh dưỡng",
  "Phòng chống HIV/AIDS - ĐTNC",
  "Truyền thông giáo dục sức khoẻ",
  "Phòng khám đa khoa",
  "Bệnh nghề nghiệp",
  "Xét nghiệm – CĐHA - TDCN",
  "Dược – VTYT",
  "Tổ chức - Hành chính",
  "Tài chính - Kế toán",
  "Kế hoạch - Nghiệp vụ"
];

// ============================================================
// COMPONENT: Gửi thử link đăng ký cho 1 người cụ thể
// ============================================================
function SingleTestSend({ onSend, sendingSingle }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Tìm kiếm follower với debounce 300ms
  useEffect(() => {
    if (!search.trim()) { setResults([]); setIsOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/followers?query=${encodeURIComponent(search)}&limit=10`);
        const json = await res.json();
        setResults(json.data || []);
        setIsOpen(true);
      } catch (e) { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const handleSelect = (f) => {
    setSelected(f);
    setSearch(f.displayName + (f.phone ? ` (${f.phone})` : ""));
    setIsOpen(false);
    setResults([]);
  };

  const handleSend = () => {
    if (!selected) return;
    onSend(selected.zaloUserId, selected.displayName);
  };

  const isSending = sendingSingle === selected?.zaloUserId;

  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0,
        }}>🧪</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>Gửi Thử 1 Người Cụ Thể</div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Tìm và gửi link đăng ký đến một thành viên để kiểm tra</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        {/* Search box */}
        <div ref={containerRef} style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Tìm theo tên, SĐT hoặc Zalo ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              onFocus={() => results.length > 0 && setIsOpen(true)}
              style={{ height: "38px", fontSize: "0.875rem", paddingRight: "32px" }}
            />
            {searching && (
              <div style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                width: 14, height: 14, border: "2px solid #e2e8f0",
                borderTop: "2px solid #1d4ed8", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
            )}
          </div>

          {/* Dropdown kết quả */}
          {isOpen && results.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "white", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)",
              zIndex: 500, maxHeight: "220px", overflowY: "auto",
            }}>
              {results.map(f => (
                <button
                  key={f.zaloUserId}
                  type="button"
                  onClick={() => handleSelect(f)}
                  style={{
                    width: "100%", padding: "9px 12px", textAlign: "left",
                    background: "transparent", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "10px",
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {f.avatarUrl ? (
                    <img src={f.avatarUrl} alt="" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%",
                      background: "var(--primary-light)", color: "var(--primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
                    }}>{f.displayName?.charAt(0) || "?"}</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.displayName}
                      {f.userType === "staff" && <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "var(--primary)", background: "var(--primary-light)", padding: "1px 5px", borderRadius: 4 }}>Cán bộ</span>}
                    </div>
                    <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                      {f.phone || "Chưa có SĐT"} · <code style={{ fontSize: "0.7rem" }}>{f.zaloUserId}</code>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {isOpen && results.length === 0 && !searching && search.trim() && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
              background: "white", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)",
              zIndex: 500, padding: "12px", textAlign: "center",
              fontSize: "0.8rem", color: "var(--text-muted)",
            }}>Không tìm thấy người dùng</div>
          )}
        </div>

        {/* Nút gửi */}
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!selected || isSending}
          style={{
            height: "38px", display: "flex", alignItems: "center",
            gap: "8px", whiteSpace: "nowrap", opacity: !selected ? 0.5 : 1,
          }}
        >
          {isSending ? (
            <><div className="spinner" style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />Đang gửi...</>
          ) : <>📨 Gửi Link Thử</>}
        </button>
      </div>

      {/* Hiển thị người đang được chọn */}
      {selected && (
        <div style={{
          marginTop: "12px", padding: "10px 14px",
          background: "var(--primary-light)", borderRadius: "var(--radius)",
          display: "flex", alignItems: "center", gap: "10px",
          border: "1px solid var(--border-focus)", fontSize: "0.85rem",
        }}>
          {selected.avatarUrl ? (
            <img src={selected.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem" }}>
              {selected.displayName?.charAt(0)}
            </div>
          )}
          <div>
            <span style={{ fontWeight: 600, color: "var(--primary)" }}>{selected.displayName}</span>
            <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: "0.78rem" }}>
              {selected.phone || selected.zaloUserId}
            </span>
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setSearch(""); }}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}
          >✕</button>
        </div>
      )}
    </div>
  );
}

export default function FollowersPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("followers"); // "followers" | "registration"
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
  const [newFullName, setNewFullName] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newCccd, setNewCccd] = useState("");
  const [updatingMeta, setUpdatingMeta] = useState(false);
  
  // Sync state
  const [syncing, setSyncing] = useState(false);

  // ── Registration panel state ──────────────────────────────────────────────
  const [regStats, setRegStats] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendScope, setSendScope] = useState("unregistered");
  const [sendResult, setSendResult] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // Toast thông báo nhẹ (hiện thị 3 giây rồi tự ẩn)
  const [toast, setToast] = useState(null); // { msg, type: "success"|"error" }
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Gửi link đăng ký cho một người cụ thể
  const [sendingSingle, setSendingSingle] = useState(null); // zaloUserId đang gửi
  const handleSendSingleRegistration = async (zaloUserId, displayName) => {
    setSendingSingle(zaloUserId);
    try {
      const res = await fetch("/api/followers/send-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "list", userIds: [zaloUserId] }),
      });
      const json = await res.json();
      if (json.error) showToast(`❌ ${json.error}`, "error");
      else if (json.sent === 0) showToast(`⚠️ Không gửi được đến ${displayName}`, "error");
      else showToast(`✅ Đã gửi link đến ${displayName}!`);
    } catch (e) {
      showToast(`❌ Lỗi: ${e.message}`, "error");
    } finally {
      setSendingSingle(null);
    }
  };

  const fetchRegStats = useCallback(async () => {
    setRegLoading(true);
    try {
      const res = await fetch("/api/followers/send-registration");
      const json = await res.json();
      if (!json.error) setRegStats(json);
    } catch (e) { console.error(e); }
    finally { setRegLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === "registration") fetchRegStats(); }, [activeTab, fetchRegStats]);

  const handleSendRegistration = async () => {
    if (!confirm(`Gửi link đăng ký đến "${sendScope === "all" ? "tất cả" : "người chưa đăng ký"}"?`)) return;
    setSending(true); setSendResult(null);
    try {
      const res = await fetch("/api/followers/send-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: sendScope }),
      });
      const json = await res.json();
      setSendResult(json);
      fetchRegStats();
    } catch (e) { setSendResult({ error: e.message }); }
    finally { setSending(false); }
  };

  const handleDeleteLink = async (id) => {
    if (!confirm("Xóa liên kết này? Nhân viên sẽ không còn được nhận biết tự động.")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/followers/staff-links/${id}`, { method: "DELETE" });
      fetchRegStats();
    } catch (e) { alert("Lỗi: " + e.message); }
    finally { setDeletingId(null); }
  };

  const handleExportExcel = () => {
    if (!regStats?.links || regStats.links.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    try {
      // Chuẩn bị dữ liệu xuất
      const exportData = regStats.links.map((link, index) => ({
        "STT": index + 1,
        "Họ và Tên": link.staffNameRaw,
        "Phòng / Khoa / Bộ phận": link.department || "Chưa chọn",
        "Số điện thoại": link.phone || "Chưa đăng ký",
        "Tên Zalo hiển thị": link.displayName || "—",
        "Zalo User ID (zaloUserId)": link.zaloUserId,
        "Ngày đăng ký": new Date(link.registeredAt).toLocaleDateString("vi-VN") + " " + new Date(link.registeredAt).toLocaleTimeString("vi-VN"),
      }));

      // Tạo workbook & worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sach Dang Ky");

      // Cấu hình chiều rộng các cột
      const maxColWidths = [
        { wch: 6 },   // STT
        { wch: 25 },  // Họ và Tên
        { wch: 30 },  // Phòng / Khoa
        { wch: 15 },  // SĐT
        { wch: 25 },  // Tên Zalo
        { wch: 28 },  // Zalo ID
        { wch: 20 },  // Ngày ĐK
      ];
      worksheet["!cols"] = maxColWidths;

      // Xuất file
      const fileName = `Danh_Sach_Nhan_Vien_Dang_Ky_Zalo_CDC_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast("📥 Xuất file Excel thành công!");
    } catch (err) {
      console.error("Lỗi xuất file Excel:", err);
      alert("Đã xảy ra lỗi khi xuất file Excel: " + err.message);
    }
  };

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
        setNewFullName(jsonDetails.data.fullName || "");
        setNewDob(jsonDetails.data.dob || "");
        setNewCccd(jsonDetails.data.cccd || "");
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
          fullName: newFullName,
          dob: newDob,
          cccd: newCccd,
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
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
          background: toast.type === "error" ? "#1e293b" : "#0f172a",
          color: "white", padding: "14px 20px", borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", gap: "10px",
          fontSize: "0.875rem", fontWeight: 500, maxWidth: "360px",
          borderLeft: `4px solid ${toast.type === "error" ? "#ef4444" : "#10b981"}`,
          animation: "slideInUp 0.3s ease",
        }}>
          <style>{`
            @keyframes slideInUp {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {toast.msg}
        </div>
      )}
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Quản lý Người quan tâm Zalo OA</h1>
          <p className="page-desc">Danh sách người dân đã nhấn quan tâm, và công cụ đăng ký liên kết nhân viên.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {activeTab === "followers" && (
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
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { id: "followers", label: "👥 Danh Sách Followers", desc: "Xem & phân loại" },
          { id: "registration", label: "🔗 Đăng Ký Nhân Viên", desc: "Liên kết Zalo ID" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              gap: "2px", padding: "12px 18px", borderRadius: "var(--radius-lg)",
              border: `2px solid ${activeTab === tab.id ? "var(--primary)" : "var(--border)"}`,
              background: activeTab === tab.id ? "var(--primary-light)" : "var(--card-bg)",
              cursor: "pointer", flex: "0 0 auto", transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: activeTab === tab.id ? "var(--primary)" : "var(--text)" }}>{tab.label}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Filter & Search — chỉ hiện ở tab followers */}
      {activeTab === "followers" && <>
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
                  <th style={{ padding: "12px 8px", width: "230px" }}>Thao tác</th>
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
                        {f.userType === "staff" && f.staffLink ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>
                              {f.staffLink.staffNameRaw}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Zalo: {f.displayName}
                            </span>
                          </div>
                        ) : f.userType === "citizen" && f.fullName ? (
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>
                              {f.fullName}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Zalo: {f.displayName}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)" }}>
                            {f.displayName}
                          </span>
                        )}
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
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button className="btn btn-outline btn-sm" onClick={() => handleOpenDetail(f)}
                          style={{ fontSize: "0.78rem", padding: "4px 8px", height: "28px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          💬 Chi tiết
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleSendSingleRegistration(f.zaloUserId, f.displayName)}
                          disabled={sendingSingle === f.zaloUserId}
                          title={`Gửi link đăng ký cho ${f.displayName}`}
                          style={{
                            fontSize: "0.78rem", padding: "4px 8px", height: "28px",
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            background: sendingSingle === f.zaloUserId ? "#f1f5f9" : "#eff6ff",
                            color: "#1d4ed8", border: "1px solid #bfdbfe",
                            cursor: sendingSingle === f.zaloUserId ? "not-allowed" : "pointer",
                            borderRadius: "6px", whiteSpace: "nowrap",
                          }}
                        >
                          {sendingSingle === f.zaloUserId ? (
                            <><div style={{ width: 10, height: 10, border: "1.5px solid #93c5fd", borderTop: "1.5px solid #1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />đang gửi</>
                          ) : "📨 Gửi ĐK"}
                        </button>
                      </div>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
      </>}

      {/* Detail & Chat Modal — chỉ hiện ở tab followers */}
      {activeTab === "followers" && isModalOpen && selectedFollower && (
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
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
                  {selectedFollower.userType === "staff" && selectedFollower.staffLink 
                    ? selectedFollower.staffLink.staffNameRaw 
                    : selectedFollower.fullName 
                      ? selectedFollower.fullName 
                      : selectedFollower.displayName}
                </h3>
                {((selectedFollower.userType === "staff" && selectedFollower.staffLink) || selectedFollower.fullName) && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Zalo: {selectedFollower.displayName}
                  </div>
                )}
                
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
                      <select
                        className="form-input"
                        value={newDept}
                        onChange={(e) => setNewDept(e.target.value)}
                        style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        <option value="">-- Chọn đơn vị công tác --</option>
                        {DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Thông tin Bệnh nhân (nếu là citizen) */}
                  {newUserType === "citizen" && (
                    <>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>👤 Họ và tên thật</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Tên khai báo..."
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>💳 CCCD/Mã BN</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Số CCCD..."
                            value={newCccd}
                            onChange={(e) => setNewCccd(e.target.value)}
                            style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>🎂 Ngày sinh</label>
                          <input
                            type="date"
                            className="form-input"
                            value={newDob}
                            onChange={(e) => setNewDob(e.target.value)}
                            style={{ width: "100%", padding: "6px 10px", fontSize: "0.85rem" }}
                          />
                        </div>
                      </div>
                    </>
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

      {/* ── TAB: ĐĂNG KÝ NHÂN VIÊN ──────────────────────────────── */}
      {activeTab === "registration" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Thống kê */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            {[
              { label: "Tổng Followers", value: regStats?.totalFollowers ?? "…", icon: "👥", color: "#1d4ed8" },
              { label: "Đã Đăng Ký", value: regStats?.totalRegistered ?? "…", icon: "✅", color: "#10b981" },
              { label: "Chưa Đăng Ký", value: regStats?.unregistered ?? "…", icon: "⏳", color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "4px" }}>{s.icon}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{regLoading ? "…" : s.value}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Công cụ gửi link */}
          <div className="card" style={{ padding: "24px" }}>
            <div className="card-title" style={{ marginBottom: "16px" }}>📤 Gửi Link Đăng Ký Qua Zalo</div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.6 }}>
              Hệ thống sẽ gửi tin nhắn Zalo kèm link đăng ký cá nhân đến từng nhân viên.
              Họ chỉ cần bấm link và điền tên thật — hệ thống sẽ tự động liên kết.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Phạm vi gửi</label>
                <select
                  value={sendScope}
                  onChange={e => setSendScope(e.target.value)}
                  className="form-input"
                  style={{ height: "38px", fontSize: "0.875rem", minWidth: "200px" }}
                >
                  <option value="unregistered">📋 Chỉ người chưa đăng ký ({regStats?.unregistered ?? "…"} người)</option>
                  <option value="all">👥 Tất cả followers ({regStats?.totalFollowers ?? "…"} người)</option>
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSendRegistration}
                disabled={sending || regLoading}
                style={{ height: "38px", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
              >
                {sending ? (
                  <><div className="spinner" style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />Đang gửi...</>
                ) : "📨 Gửi Link Đăng Ký"}
              </button>
              <button
                className="btn btn-outline"
                onClick={fetchRegStats}
                disabled={regLoading}
                style={{ height: "38px" }}
              >
                🔄 Làm mới
              </button>
            </div>

            {/* Kết quả gửi */}
            {sendResult && (
              <div style={{
                marginTop: "16px", padding: "12px 16px", borderRadius: "var(--radius)",
                background: sendResult.error ? "#fef2f2" : "#f0fdf4",
                border: `1px solid ${sendResult.error ? "#fecaca" : "#bbf7d0"}`,
                color: sendResult.error ? "#dc2626" : "#15803d",
                fontSize: "0.875rem",
              }}>
                {sendResult.error ? `❌ Lỗi: ${sendResult.error}` : `✅ ${sendResult.message}`}
                {sendResult.errors?.length > 0 && (
                  <ul style={{ marginTop: "6px", paddingLeft: "16px", fontSize: "0.8rem" }}>
                    {sendResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Gửi thử 1 người cụ thể */}
          <SingleTestSend onSend={handleSendSingleRegistration} sendingSingle={sendingSingle} showToast={showToast} />

          {/* Bảng đã đăng ký */}
          <div className="card">
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div className="card-title">✅ Danh Sách Đã Đăng Ký ({regStats?.totalRegistered ?? 0})</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Nhân viên đã tự xác nhận tên thật qua link đăng ký</div>
              </div>
              {regStats?.links?.length > 0 && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleExportExcel}
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #059669, #10b981)", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: "bold", fontSize: "0.85rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.2)" }}
                >
                  📥 Xuất Excel
                </button>
              )}
            </div>

            {regLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                <div className="spinner" style={{ width: 28, height: 28, border: "3px solid var(--border)", borderTopColor: "var(--primary)", margin: "0 auto 12px" }} />
                Đang tải...
              </div>
            ) : !regStats?.links?.length ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</div>
                <div style={{ fontWeight: 600 }}>Chưa có nhân viên nào đăng ký</div>
                <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Hãy gửi link đăng ký ở trên để bắt đầu.</div>
              </div>
            ) : (
              <div className="table-responsive">
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>Ảnh</th>
                      <th style={{ padding: "12px 16px" }}>Tên Thật (Đã Đăng Ký)</th>
                      <th style={{ padding: "12px 16px" }}>Tên Zalo</th>
                      <th style={{ padding: "12px 16px" }}>Phòng / Khoa</th>
                      <th style={{ padding: "12px 16px" }}>Ngày ĐK</th>
                      <th style={{ padding: "12px 16px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regStats.links.map(link => (
                      <tr key={link.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "10px 16px" }}>
                          {link.avatarUrl ? (
                            <img src={link.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)" }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                              {link.staffNameRaw?.charAt(0) || "?"}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--text)" }}>{link.staffNameRaw}</div>
                          {link.phone && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>📞 {link.phone}</div>}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ fontSize: "0.875rem", color: "var(--text)" }}>{link.displayName || "—"}</div>
                          <code style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "var(--bg)", padding: "1px 4px", borderRadius: 3 }}>{link.zaloUserId}</code>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                          {link.department || <em style={{ color: "var(--text-light)" }}>Chưa chọn</em>}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {new Date(link.registeredAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleDeleteLink(link.id)}
                            disabled={deletingId === link.id}
                            style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontSize: "0.78rem" }}
                          >
                            {deletingId === link.id ? "…" : "🗑️ Xóa"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
