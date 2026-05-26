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

      <div className="registration-send-wrapper" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
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
  const [importingExcel, setImportingExcel] = useState(false);
  const fileInputRef = useRef(null);
  
  // ── Sửa liên kết nhân viên state ──
  const [editingLink, setEditingLink] = useState(null);
  const [isEditLinkModalOpen, setIsEditLinkModalOpen] = useState(false);
  const [updatingLink, setUpdatingLink] = useState(false);
  const [editStaffNameRaw, setEditStaffNameRaw] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const handleOpenEditLink = (link) => {
    setEditingLink(link);
    setEditStaffNameRaw(link.staffNameRaw || "");
    setEditDept(link.department || "");
    setEditPhone(link.phone || "");
    setIsEditLinkModalOpen(true);
  };

  const handleUpdateLink = async (e) => {
    e.preventDefault();
    if (!editingLink) return;
    if (!editStaffNameRaw.trim()) {
      alert("Vui lòng nhập họ và tên nhân viên");
      return;
    }
    setUpdatingLink(true);
    try {
      const res = await fetch(`/api/followers/staff-links/${editingLink.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffNameRaw: editStaffNameRaw.trim(),
          department: editDept || null,
          phone: editPhone?.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Thao tác thất bại");
      
      showToast("🎉 Cập nhật thông tin nhân viên thành công!");
      setIsEditLinkModalOpen(false);
      setEditingLink(null);
      fetchRegStats(); // Làm mới danh sách đã đăng ký
      fetchFollowers(); // Làm mới danh sách chung để cập nhật tên
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setUpdatingLink(false);
    }
  };
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

  const handleImportExcelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingExcel(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/followers/import-excel", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Nhập Excel thất bại");

      let msg = `🎉 Liên kết thành công: ${json.successCount} nhân viên.\n❌ Không tìm thấy: ${json.notFoundCount} nhân viên.`;
      if (json.errors && json.errors.length > 0) {
        msg += "\n\nChi tiết lỗi (tối đa 10 dòng):\n" + json.errors.join("\n");
      }
      alert(msg);
      fetchRegStats();
      fetchFollowers();
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setImportingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

      {/* ── PAGE HEADER ──────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Người quan tâm Zalo OA</h1>
          <p className="page-desc">Danh sách người dân đã nhấn quan tâm và công cụ đăng ký liên kết nhân viên.</p>
        </div>
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
            ) : "🔄 Đồng bộ"}
          </button>
        )}
      </div>

      {/* ── TAB NAVIGATION (PILL STYLE) ─────────────────────── */}
      <div className="followers-tabs">
        {[
          { id: "followers", label: "👥 Danh sách" },
          { id: "registration", label: "🔗 Đăng ký NV" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`followers-tab-pill${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB: FOLLOWERS
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "followers" && <>

        {/* Filter & Search */}
        <div className="card" style={{ marginBottom: "16px", padding: "14px 20px" }}>
          <div className="filter-search-bar">
            {/* Segmented control lọc loại */}
            <div className="segmented-control">
              {[
                { value: "all",     label: "👥 Tất cả" },
                { value: "citizen", label: "🟢 Khách hàng" },
                { value: "staff",   label: "💼 Cán bộ" },
              ].map(f => (
                <button
                  key={f.value}
                  className={`segmented-btn${userTypeFilter === f.value ? " active" : ""}`}
                  onClick={() => setUserTypeFilter(f.value)}
                >{f.label}</button>
              ))}
            </div>
            {/* Search */}
            <div className="search-row">
              <input
                type="text"
                className="search-input"
                placeholder="Tìm theo tên, SĐT, ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchFollowers()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={fetchFollowers} style={{ whiteSpace: "nowrap" }}>
                🔍 Tìm
              </button>
            </div>
          </div>
        </div>

        {/* Main List Card */}
        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)", width: 28, height: 28, marginRight: "10px" }} />
              Đang tải...
            </div>
          ) : followers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              📭 Không tìm thấy người dùng nào phù hợp.
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="desktop-only" style={{ overflowX: "auto" }}>
                <table className="followers-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}></th>
                      <th>Tên Zalo</th>
                      <th style={{ width: "110px" }}>Loại</th>
                      <th style={{ width: "130px" }}>SĐT</th>
                      <th style={{ width: "110px" }}>Ngày QT</th>
                      <th style={{ width: "140px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followers.map(f => (
                      <tr key={f.id}>
                        {/* Avatar */}
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ position: "relative", display: "inline-flex" }}>
                            {f.avatarUrl ? (
                              <img src={f.avatarUrl} alt={f.displayName}
                                style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
                            ) : (
                              <div style={{
                                width: "36px", height: "36px", borderRadius: "50%",
                                background: "linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)",
                                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                                fontWeight: "bold", fontSize: "0.9rem"
                              }}>
                                {f.displayName ? f.displayName.substring(0, 1) : "U"}
                              </div>
                            )}
                            {((f.userType === "staff" && f.staffLink) || f.fullName) && (
                              <div style={{
                                position: "absolute", bottom: "-1px", right: "-1px",
                                background: "var(--success)", color: "white",
                                border: "2px solid white", borderRadius: "50%",
                                width: "14px", height: "14px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Tên + copy ID */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>
                              {f.userType === "staff" && f.staffLink
                                ? f.staffLink.staffNameRaw
                                : f.fullName || f.displayName || "Người dùng Zalo"}
                            </span>
                            <button className="copy-id-btn" onClick={() => navigator.clipboard.writeText(f.zaloUserId)} title={`Copy ID: ${f.zaloUserId}`}>📋</button>
                          </div>
                          {((f.userType === "staff" && f.staffLink) || f.fullName) && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Zalo: {f.displayName}</div>
                          )}
                          <div style={{ fontSize: "0.7rem", color: "var(--text-light)", marginTop: "1px" }}>
                            {f.appointments.length} hẹn · {f.testResults.length} KQ
                          </div>
                        </td>
                        {/* Loại */}
                        <td>
                          {f.userType === "staff"
                            ? <span className="user-badge user-badge-staff">💼 Cơ quan</span>
                            : <span className="user-badge user-badge-citizen">🟢 Khách hàng</span>}
                        </td>
                        {/* SĐT */}
                        <td style={{ fontSize: "0.875rem" }}>
                          {f.phone
                            ? <span style={{ fontWeight: 500 }}>{f.phone}</span>
                            : <span style={{ color: "var(--text-light)", fontStyle: "italic", fontSize: "0.8rem" }}>Chưa có SĐT</span>}
                        </td>
                        {/* Ngày */}
                        <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {new Date(f.followedAt).toLocaleDateString("vi-VN")}
                        </td>
                        {/* Thao tác */}
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button className="btn btn-outline btn-sm" onClick={() => handleOpenDetail(f)}
                              style={{ padding: "4px 10px", height: "30px", fontSize: "0.78rem" }}>
                              💬 Chi tiết
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => handleSendSingleRegistration(f.zaloUserId, f.displayName)}
                              disabled={sendingSingle === f.zaloUserId}
                              style={{
                                padding: "4px 10px", height: "30px", fontSize: "0.78rem",
                                background: sendingSingle === f.zaloUserId ? "#f1f5f9" : "#eff6ff",
                                color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "6px",
                                cursor: sendingSingle === f.zaloUserId ? "not-allowed" : "pointer",
                              }}
                            >
                              {sendingSingle === f.zaloUserId ? (
                                <div style={{ width: 10, height: 10, border: "1.5px solid #93c5fd", borderTop: "1.5px solid #1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
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

              {/* ── MOBILE CARDS ── */}
              <div className="mobile-card-list mobile-only">
                {followers.map(f => {
                  const initials = f.displayName ? f.displayName.substring(0, 1) : "U";
                  const hasRegistered = (f.userType === "staff" && f.staffLink) || f.fullName;
                  const displayName = f.userType === "staff" && f.staffLink
                    ? f.staffLink.staffNameRaw
                    : f.fullName || f.displayName || "Người dùng Zalo";
                  return (
                    <div key={f.id} className="mobile-card-item">
                      <div className="mobile-card-main">
                        <div className="mobile-card-avatar">
                          {f.avatarUrl
                            ? <img src={f.avatarUrl} alt={f.displayName} style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover" }} />
                            : initials}
                          {hasRegistered && (
                            <div className="mobile-card-avatar-badge">
                              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          )}
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-name">{displayName}</div>
                          <div className="mobile-card-meta">
                            {f.userType === "staff"
                              ? <span className="user-badge user-badge-staff" style={{ fontSize: "0.62rem" }}>💼 Cơ quan</span>
                              : <span className="user-badge user-badge-citizen" style={{ fontSize: "0.62rem" }}>🟢 KH</span>}
                            <span className="mobile-card-phone">
                              {f.phone || <em style={{ color: "var(--text-light)" }}>Chưa có SĐT</em>}
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-date">
                          {new Date(f.followedAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                      <div className="mobile-card-actions">
                        <button className="mobile-card-action-btn" onClick={() => handleOpenDetail(f)}>💬 Chi tiết</button>
                        <button className="mobile-card-action-btn primary"
                          onClick={() => handleSendSingleRegistration(f.zaloUserId, f.displayName)}
                          disabled={sendingSingle === f.zaloUserId}>
                          {sendingSingle === f.zaloUserId
                            ? <div style={{ width: 12, height: 12, border: "1.5px solid #93c5fd", borderTop: "1.5px solid #1d4ed8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            : "📨 Gửi ĐK"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── PAGINATION ── */}
          {!loading && followers.length > 0 && (
            <div className="pagination-bar">
              <div className="pagination-info">
                Hiển thị <strong>{followers.length}</strong> / <strong>{totalItems}</strong> người
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div className="page-size-select">
                  <span>Dòng:</span>
                  <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="pagination-controls">
                  <button className="pagination-btn first-last" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || loading}>⏮</button>
                  <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1 || loading}>‹</button>
                  <span className="pagination-current">{currentPage} / {totalPages}</span>
                  <button className="pagination-btn" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || loading}>›</button>
                  <button className="pagination-btn first-last" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || loading}>⏭</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>}

      {/* ══════════════════════════════════════════════════════════
          MODAL: Chi tiết (Bottom Sheet on Mobile)
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "followers" && isModalOpen && selectedFollower && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleCloseModal()}>
          <div className="modal-box">

            {/* LEFT PANEL */}
            <div className="modal-panel-left">
              <div style={{ padding: "20px 24px", background: "white", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
                {selectedFollower.avatarUrl ? (
                  <img src={selectedFollower.avatarUrl} alt={selectedFollower.displayName}
                    style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", marginBottom: "10px", border: "2px solid var(--primary-light)" }} />
                ) : (
                  <div style={{
                    width: "72px", height: "72px", borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)",
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: "bold", fontSize: "1.8rem", margin: "0 auto 10px"
                  }}>
                    {selectedFollower.displayName ? selectedFollower.displayName.substring(0, 1) : "U"}
                  </div>
                )}
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                  {selectedFollower.userType === "staff" && selectedFollower.staffLink
                    ? selectedFollower.staffLink.staffNameRaw
                    : selectedFollower.fullName || selectedFollower.displayName}
                </h3>
                {((selectedFollower.userType === "staff" && selectedFollower.staffLink) || selectedFollower.fullName) && (
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>Zalo: {selectedFollower.displayName}</div>
                )}
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "6px" }}>
                  <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>{selectedFollower.zaloUserId}</code>
                  <button className="copy-id-btn" onClick={() => navigator.clipboard.writeText(selectedFollower.zaloUserId)}>📋</button>
                </div>
              </div>

              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>⚙️ Phân loại & Thông tin</div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>📞 Số điện thoại</label>
                  <input type="text" className="form-input" placeholder="Chưa cập nhật SĐT..."
                    value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ padding: "6px 10px", fontSize: "0.85rem" }} />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>🏷️ Phân loại</label>
                  <select className="form-input" value={newUserType}
                    onChange={e => { setNewUserType(e.target.value); if (e.target.value !== "staff") setNewDept(""); }}
                    style={{ padding: "6px 10px", fontSize: "0.85rem", background: "white", cursor: "pointer" }}>
                    <option value="citizen">🟢 Khách hàng / Người dân</option>
                    <option value="staff">💼 Cán bộ cơ quan</option>
                  </select>
                </div>

                {newUserType === "staff" && (
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>🏢 Khoa / Phòng ban</label>
                    <select className="form-input" value={newDept} onChange={e => setNewDept(e.target.value)}
                      style={{ padding: "6px 10px", fontSize: "0.85rem", cursor: "pointer" }}>
                      <option value="">-- Chọn đơn vị --</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                {newUserType === "citizen" && (
                  <>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>👤 Họ và tên thật</label>
                      <input type="text" className="form-input" placeholder="Tên khai báo..."
                        value={newFullName} onChange={e => setNewFullName(e.target.value)} style={{ padding: "6px 10px", fontSize: "0.85rem" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>💳 CCCD/Mã BN</label>
                        <input type="text" className="form-input" placeholder="Số CCCD..."
                          value={newCccd} onChange={e => setNewCccd(e.target.value)} style={{ padding: "6px 10px", fontSize: "0.85rem" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>🎂 Ngày sinh</label>
                        <input type="date" className="form-input" value={newDob} onChange={e => setNewDob(e.target.value)}
                          style={{ padding: "6px 10px", fontSize: "0.85rem" }} />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>📝 Ghi chú</label>
                  <textarea className="form-input" placeholder="Nhập ghi chú..."
                    value={newNotes} onChange={e => setNewNotes(e.target.value)}
                    style={{ height: "60px", padding: "6px 10px", fontSize: "0.85rem", resize: "none" }} />
                </div>

                <button className="btn btn-primary btn-sm" onClick={handleUpdateFollowerMeta} disabled={updatingMeta}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  {updatingMeta
                    ? <><div className="spinner" style={{ width: "12px", height: "12px", border: "1.5px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />Đang lưu...</>
                    : "💾 Lưu thay đổi"}
                </button>

                {/* Appointments summary */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>
                    💉 Lịch hẹn ({selectedFollower.appointments?.length || 0})
                  </div>
                  {!selectedFollower.appointments?.length ? (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-light)", fontStyle: "italic" }}>Không có lịch hẹn.</div>
                  ) : selectedFollower.appointments.slice(0, 3).map(apt => (
                    <div key={apt.id} style={{ background: "white", padding: "8px 10px", borderRadius: "var(--radius)", border: "1px solid var(--border)", fontSize: "0.78rem", marginBottom: "6px" }}>
                      <div style={{ fontWeight: 600 }}>{apt.vaccineType}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        📅 {new Date(apt.appointedAt).toLocaleDateString("vi-VN")} ·{" "}
                        <span style={{ color: apt.status === "approved" ? "var(--success)" : "var(--warning)" }}>
                          {apt.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Chat */}
            <div className="modal-panel-right">
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>📋 Lịch sử tương tác</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Tin nhắn người dân gửi đến OA</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={handleCloseModal}>✕ Đóng</button>
              </div>

              <div style={{ margin: "12px 16px 0", padding: "12px 14px", background: "#fff8e1", border: "1px solid #ffe082", borderRadius: "var(--radius)", display: "flex", gap: "10px", alignItems: "flex-start", flexShrink: 0 }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#795548", marginBottom: "3px" }}>OA Cơ quan Nhà nước không hỗ trợ gửi tin 1-1 qua API</div>
                  <div style={{ fontSize: "0.76rem", color: "#8d6e63", lineHeight: 1.5 }}>
                    Vui lòng dùng <strong>Zalo OA Manager</strong> để trả lời.{" "}
                    <a href="https://oa.zalo.me/home" target="_blank" rel="noopener noreferrer" style={{ color: "#0068ff", fontWeight: 600 }}>Mở OA Manager →</a>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, padding: "14px 16px", overflowY: "auto", display: "flex", flexDirection: "column-reverse", gap: "10px", background: "#f8fafc" }}>
                {loadingChat ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-muted)", fontSize: "0.85rem" }}>Đang tải lịch sử...</div>
                ) : chatHistory.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-light)", textAlign: "center", padding: "20px" }}>
                    <span style={{ fontSize: "2rem", marginBottom: "8px" }}>💬</span>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Chưa có tin nhắn nào</div>
                    <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>Tin nhắn từ người dân sẽ hiển thị ở đây khi có Webhook.</div>
                  </div>
                ) : (
                  chatHistory.map(chat => {
                    const isOutbound = chat.direction === "outbound";
                    return (
                      <div key={chat.id} style={{ display: "flex", flexDirection: "column", alignItems: isOutbound ? "flex-end" : "flex-start", maxWidth: "80%", alignSelf: isOutbound ? "flex-end" : "flex-start" }}>
                        <div style={{ padding: "10px 14px", borderRadius: "12px", borderTopRightRadius: isOutbound ? "2px" : "12px", borderTopLeftRadius: isOutbound ? "12px" : "2px", background: isOutbound ? "var(--primary)" : "white", color: isOutbound ? "white" : "var(--text)", fontSize: "0.875rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: isOutbound ? "none" : "1px solid var(--border)", wordBreak: "break-word" }}>{chat.content}</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>{new Date(chat.receivedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                💡 Dùng <strong>ZNS</strong> hoặc <strong>Tin truyền thông</strong> trong OA Manager để gửi hàng loạt.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB: ĐĂNG KÝ NHÂN VIÊN
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "registration" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Stats */}
          <div className="reg-stats-grid">
            {[
              { label: "Tổng Followers", value: regStats?.totalFollowers ?? "…", icon: "👥", bg: "#eff6ff", color: "#1d4ed8" },
              { label: "Đã Đăng Ký", value: regStats?.totalRegistered ?? "…", icon: "✅", bg: "#f0fdf4", color: "#16a34a" },
              { label: "Chưa Đăng Ký", value: regStats?.unregistered ?? "…", icon: "⏳", bg: "#fffbeb", color: "#d97706" },
            ].map(s => (
              <div key={s.label} className="reg-stat-card">
                <div className="reg-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div className="reg-stat-body">
                  <div className="reg-stat-value" style={{ color: s.color }}>{regLoading ? "…" : s.value}</div>
                  <div className="reg-stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Gửi link */}
          <div className="card" style={{ padding: "20px 24px" }}>
            <div className="card-title" style={{ marginBottom: "12px" }}>📤 Gửi Link Đăng Ký</div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.6 }}>
              Hệ thống gửi tin Zalo kèm link đăng ký cá nhân. Nhân viên chỉ cần bấm link và điền tên thật.
            </p>
            <div className="registration-send-wrapper">
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Phạm vi gửi</label>
                <select value={sendScope} onChange={e => setSendScope(e.target.value)} className="form-input"
                  style={{ height: "38px", fontSize: "0.875rem", width: "100%" }}>
                  <option value="unregistered">📋 Chỉ người chưa đăng ký ({regStats?.unregistered ?? "…"})</option>
                  <option value="all">👥 Tất cả followers ({regStats?.totalFollowers ?? "…"})</option>
                </select>
              </div>
              <div className="registration-send-actions">
                <button className="btn btn-primary" onClick={handleSendRegistration} disabled={sending || regLoading}
                  style={{ height: "38px", display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                  {sending
                    ? <><div className="spinner" style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />Đang gửi...</>
                    : "📨 Gửi Link"}
                </button>
                <button className="btn btn-outline" onClick={fetchRegStats} disabled={regLoading} style={{ height: "38px", flex: 1 }}>🔄 Làm mới</button>
              </div>
            </div>
            {sendResult && (
              <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "var(--radius)", background: sendResult.error ? "#fef2f2" : "#f0fdf4", border: `1px solid ${sendResult.error ? "#fecaca" : "#bbf7d0"}`, color: sendResult.error ? "#dc2626" : "#15803d", fontSize: "0.875rem" }}>
                {sendResult.error ? `❌ Lỗi: ${sendResult.error}` : `✅ ${sendResult.message}`}
              </div>
            )}
          </div>

          {/* Gửi thử 1 người */}
          <SingleTestSend onSend={handleSendSingleRegistration} sendingSingle={sendingSingle} showToast={showToast} />

          {/* Bảng đã đăng ký */}
          <div className="card" style={{ padding: 0 }}>
            <div className="registration-header-row" style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div className="card-title">✅ Danh Sách Đã Đăng Ký ({regStats?.totalRegistered ?? 0})</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Nhân viên đã xác nhận tên thật qua link đăng ký</div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  onChange={handleImportExcelFile}
                />
                <button
                  className="btn btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importingExcel}
                  style={{ background: "white", color: "#2563eb", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {importingExcel ? (
                    <div style={{ width: 14, height: 14, border: "2px solid #bfdbfe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  ) : "📤 Nhập Excel"}
                </button>
                {regStats?.links?.length > 0 && (
                  <button className="btn btn-sm" onClick={handleExportExcel}
                    style={{ background: "linear-gradient(135deg, #059669, #10b981)", color: "white", border: "none", display: "flex", alignItems: "center", gap: "6px" }}>
                    📥 Xuất Excel
                  </button>
                )}
              </div>
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
              <>
                <div className="desktop-only" style={{ overflowX: "auto" }}>
                  <table className="followers-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}></th>
                        <th>Tên thật (Đã đăng ký)</th>
                        <th>Tên Zalo</th>
                        <th>Phòng / Khoa</th>
                        <th style={{ width: "110px" }}>Ngày ĐK</th>
                        <th style={{ width: "110px" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regStats.links.map(link => (
                        <tr key={link.id}>
                          <td style={{ padding: "10px 14px" }}>
                            {link.avatarUrl
                              ? <img src={link.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)" }} />
                              : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{link.staffNameRaw?.charAt(0) || "?"}</div>}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: "var(--text)" }}>{link.staffNameRaw}</div>
                            {link.phone && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>📞 {link.phone}</div>}
                          </td>
                          <td style={{ fontSize: "0.875rem", color: "var(--text)" }}>{link.displayName || "—"}</td>
                          <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{link.department || <em style={{ color: "var(--text-light)" }}>Chưa chọn</em>}</td>
                          <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{new Date(link.registeredAt).toLocaleDateString("vi-VN")}</td>
                          <td>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button className="btn btn-sm btn-outline" onClick={() => handleOpenEditLink(link)} style={{ height: "28px", padding: "3px 8px", fontSize: "0.78rem" }}>✏️ Sửa</button>
                              <button className="btn btn-sm" onClick={() => handleDeleteLink(link.id)} disabled={deletingId === link.id}
                                style={{ height: "28px", padding: "3px 8px", fontSize: "0.78rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                                {deletingId === link.id ? "…" : "🗑️"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mobile-card-list mobile-only">
                  {regStats.links.map(link => (
                    <div key={link.id} className="mobile-card-item">
                      <div className="mobile-card-main">
                        <div className="mobile-card-avatar">
                          {link.avatarUrl
                            ? <img src={link.avatarUrl} alt="" style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover" }} />
                            : (link.staffNameRaw?.charAt(0) || "?")}
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-name">{link.staffNameRaw}</div>
                          <div className="mobile-card-meta">
                            <span className="mobile-card-phone">{link.department || <em style={{ color: "var(--text-light)", fontSize: "0.75rem" }}>Chưa chọn khoa/phòng</em>}</span>
                          </div>
                        </div>
                        <div className="mobile-card-date">{new Date(link.registeredAt).toLocaleDateString("vi-VN")}</div>
                      </div>
                      <div className="mobile-card-actions">
                        <button className="mobile-card-action-btn" onClick={() => handleOpenEditLink(link)}>✏️ Sửa</button>
                        <button className="mobile-card-action-btn primary" onClick={() => handleDeleteLink(link.id)} disabled={deletingId === link.id} style={{ color: "#dc2626" }}>
                          {deletingId === link.id ? "…" : "🗑️ Xóa"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Sửa liên kết nhân viên ── */}
      {isEditLinkModalOpen && editingLink && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", width: "90%", maxWidth: "450px", padding: "28px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", animation: "slideInUp 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>✏️ Sửa Thông Tin Cán Bộ</h3>
              <button type="button" onClick={() => { setIsEditLinkModalOpen(false); setEditingLink(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ background: "var(--primary-light)", border: "1px solid var(--border-focus)", borderRadius: "10px", padding: "12px 14px", marginBottom: "18px", display: "flex", alignItems: "center", gap: "10px" }}>
              {editingLink.avatarUrl
                ? <img src={editingLink.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem" }}>{editingLink.staffNameRaw?.charAt(0) || "?"}</div>}
              <div>
                <div style={{ fontWeight: 600, color: "var(--primary)", fontSize: "0.85rem" }}>Zalo: {editingLink.displayName || "Người dùng Zalo"}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>ID: <code>{editingLink.zaloUserId}</code></div>
              </div>
            </div>
            <form onSubmit={handleUpdateLink} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>👤 Họ và Tên <span style={{ color: "red" }}>*</span></label>
                <input type="text" className="form-input" placeholder="Họ và tên..." value={editStaffNameRaw}
                  onChange={e => setEditStaffNameRaw(e.target.value)} style={{ padding: "8px 12px" }} required />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>📞 Số điện thoại</label>
                <input type="text" className="form-input" placeholder="SĐT..." value={editPhone}
                  onChange={e => setEditPhone(e.target.value)} style={{ padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>🏢 Khoa / Phòng ban</label>
                <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)}
                  style={{ padding: "8px 12px", cursor: "pointer" }}>
                  <option value="">-- Chọn đơn vị công tác --</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1, height: "40px" }}
                  onClick={() => { setIsEditLinkModalOpen(false); setEditingLink(null); }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={updatingLink}
                  style={{ flex: 1, height: "40px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  {updatingLink
                    ? <><div className="spinner" style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />Đang lưu...</>
                    : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
