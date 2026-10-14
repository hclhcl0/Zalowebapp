"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Bot,
  AlertCircle,
  Search,
  Filter,
  Send,
  Sparkles,
  Users,
  Settings,
  BarChart3,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Phone,
  Building,
  Check,
  X,
  BookOpen,
  User,
  Calendar,
  CreditCard,
  Tag,
  History,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function InquiriesPage() {
  const { data: session } = useSession();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState("inbox"); // "inbox" | "topics" | "analytics"

  // Inbox filters & data
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending_staff");
  const [topicFilter, setTopicFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, pendingStaff: 0, staffReplied: 0, aiResolved: 0 });

  // Reply Modal & Context State
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [inquiryContext, setInquiryContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [saveToKnowledge, setSaveToKnowledge] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState("");
  const [replyError, setReplyError] = useState("");
  const chatBottomRef = useRef(null);

  // Topics Management State
  const [topics, setTopics] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [savingTopicId, setSavingTopicId] = useState(null);
  const [topicSaveSuccess, setTopicSaveSuccess] = useState("");

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // ============================================================
  // LOAD INQUIRIES
  // ============================================================
  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        topic: topicFilter,
        search: searchQuery,
        page: page.toString(),
        limit: "15",
      });
      const res = await fetch(`/api/inquiries?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInquiries(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách câu hỏi:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, topicFilter, searchQuery, page]);

  useEffect(() => {
    if (activeTab === "inbox") {
      fetchInquiries();
    }
  }, [fetchInquiries, activeTab]);

  // ============================================================
  // LOAD TOPICS & STAFF
  // ============================================================
  const fetchTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      const res = await fetch("/api/inquiries/topics");
      const json = await res.json();
      if (json.success) {
        setTopics(json.topics || []);
        setStaffList(json.staffList || []);
      }
    } catch (err) {
      console.error("Lỗi tải phân công chủ đề:", err);
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "topics") {
      fetchTopics();
    }
  }, [fetchTopics, activeTab]);

  // ============================================================
  // LOAD ANALYTICS
  // ============================================================
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/inquiries/analytics");
      const json = await res.json();
      if (json.success) {
        setAnalyticsData(json.data);
      }
    } catch (err) {
      console.error("Lỗi tải thống kê chủ đề:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics();
    }
  }, [fetchAnalytics, activeTab]);

  // ============================================================
  // OPEN REPLY MODAL & FETCH FULL CONTEXT (IDENTITY & CHAT HISTORY)
  // ============================================================
  const handleOpenReplyModal = async (inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyText(inquiry.staffReply || inquiry.aiDraftReply || "");
    setReplyError("");
    setReplySuccess("");
    setInquiryContext(null);
    setLoadingContext(true);

    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}/context`);
      const json = await res.json();
      if (json.success) {
        setInquiryContext(json.data);
        setTimeout(() => {
          if (chatBottomRef.current) {
            chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 200);
      }
    } catch (err) {
      console.error("Lỗi tải ngữ cảnh câu hỏi:", err);
    } finally {
      setLoadingContext(false);
    }
  };

  // ============================================================
  // SEND REPLY TO CITIZEN VIA ZALO
  // ============================================================
  const handleSendReply = async () => {
    if (!selectedInquiry || !replyText.trim()) return;
    setSendingReply(true);
    setReplyError("");
    setReplySuccess("");

    try {
      const res = await fetch(`/api/inquiries/${selectedInquiry.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyText: replyText.trim(),
          saveToKnowledge,
          knowledgeCategory: selectedInquiry.topicLabel,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gửi phản hồi thất bại");
      }

      setReplySuccess(
        saveToKnowledge
          ? "Đã gửi câu trả lời đến Zalo người dân và lưu vào Khối óc AI thành công!"
          : "Đã gửi câu trả lời đến Zalo người dân thành công!"
      );

      // Refresh inquiries list
      fetchInquiries();

      setTimeout(() => {
        setSelectedInquiry(null);
        setReplyText("");
        setReplySuccess("");
      }, 1500);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  // ============================================================
  // UPDATE TOPIC ASSIGNMENT
  // ============================================================
  const handleSaveTopic = async (topic) => {
    setSavingTopicId(topic.id);
    setTopicSaveSuccess("");
    try {
      const res = await fetch("/api/inquiries/topics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topic),
      });
      const json = await res.json();
      if (json.success) {
        setTopicSaveSuccess(`Đã lưu cấu hình chủ đề "${topic.topicLabel}" thành công!`);
        setTimeout(() => setTopicSaveSuccess(""), 3000);
      }
    } catch (err) {
      alert("Lỗi khi lưu: " + err.message);
    } finally {
      setSavingTopicId(null);
    }
  };

  // Helper for topic badge styling
  const getTopicBadgeStyle = (code) => {
    switch (code) {
      case "DAI":
        return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
      case "TIEM_CHUNG":
        return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
      case "BENH_TRUYEN_NHIEM":
        return { bg: "#fffbeb", color: "#b45309", border: "#fde68a" };
      case "XET_NGHIEM":
        return { bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" };
      case "KHAM_BENH":
        return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
      case "DINH_DUONG":
        return { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" };
      case "BENH_KHONG_LAY":
        return { bg: "#fff7ed", color: "#c2410c", border: "#ffedd5" };
      case "THU_TUC":
        return { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" };
      default:
        return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
    }
  };

  return (
    <div className="container" style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <MessageSquare size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                  Tiếp Nhận & Điều Phối Câu Hỏi Người Dân
                </h1>
                <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Xác định danh tính người hỏi, xem lịch sử hội thoại Zalo và trả lời trực tiếp cho người dân
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => {
                if (activeTab === "inbox") fetchInquiries();
                if (activeTab === "topics") fetchTopics();
                if (activeTab === "analytics") fetchAnalytics();
              }}
              className="btn btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
            >
              <RefreshCw size={15} className={loading || loadingTopics || loadingAnalytics ? "animate-spin" : ""} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* Pending Staff */}
        <div
          className="card"
          style={{
            padding: "16px 20px",
            borderLeft: "4px solid #ef4444",
            background: stats.pendingStaff > 0 ? "#fff5f5" : "#ffffff",
            cursor: "pointer",
          }}
          onClick={() => {
            setActiveTab("inbox");
            setStatusFilter("pending_staff");
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#991b1b", textTransform: "uppercase" }}>
                🔴 Chờ Cán Bộ Giải Đáp
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#b91c1c", marginTop: "4px" }}>
                {stats.pendingStaff}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dc2626",
              }}
            >
              <AlertCircle size={24} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: "6px" }}>
            {stats.pendingStaff > 0 ? "⚡ Cần Bác sĩ/Cán bộ can thiệp ngay" : "Hiện không có câu hỏi tồn đọng"}
          </div>
        </div>

        {/* Staff Replied */}
        <div
          className="card"
          style={{ padding: "16px 20px", borderLeft: "4px solid #10b981", cursor: "pointer" }}
          onClick={() => {
            setActiveTab("inbox");
            setStatusFilter("staff_replied");
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#065f46", textTransform: "uppercase" }}>
                🟢 Cán Bộ Đã Giải Đáp
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#047857", marginTop: "4px" }}>
                {stats.staffReplied}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#059669",
              }}
            >
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
            Đã gửi phản hồi qua Zalo người dân
          </div>
        </div>

        {/* AI Resolved */}
        <div
          className="card"
          style={{ padding: "16px 20px", borderLeft: "4px solid #2563eb", cursor: "pointer" }}
          onClick={() => {
            setActiveTab("inbox");
            setStatusFilter("ai_resolved");
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e40af", textTransform: "uppercase" }}>
                🤖 AI Tự Động Giải Đáp
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>
                {stats.aiResolved}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
              }}
            >
              <Bot size={24} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
            Khớp Cẩm nang & CDC Media
          </div>
        </div>

        {/* Total Inquiries */}
        <div
          className="card"
          style={{ padding: "16px 20px", borderLeft: "4px solid #64748b", cursor: "pointer" }}
          onClick={() => {
            setActiveTab("inbox");
            setStatusFilter("all");
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", textTransform: "uppercase" }}>
                📋 Tổng Lượt Tiếp Nhận
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#334155", marginTop: "4px" }}>
                {stats.total}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b",
              }}
            >
              <Clock size={24} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
            Tất cả các chủ đề trên Zalo OA
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid var(--border)",
          marginBottom: "20px",
          gap: "8px",
        }}
      >
        <button
          onClick={() => setActiveTab("inbox")}
          style={{
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "inbox" ? "var(--primary)" : "var(--text-muted)",
            borderBottom: activeTab === "inbox" ? "3px solid var(--primary)" : "3px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <MessageSquare size={17} />
          Hộp Thư Tiếp Nhận
          {stats.pendingStaff > 0 && (
            <span
              style={{
                background: "#ef4444",
                color: "#fff",
                borderRadius: "12px",
                padding: "1px 7px",
                fontSize: "0.72rem",
                fontWeight: 800,
              }}
            >
              {stats.pendingStaff}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("topics")}
          style={{
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "topics" ? "var(--primary)" : "var(--text-muted)",
            borderBottom: activeTab === "topics" ? "3px solid var(--primary)" : "3px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Users size={17} />
          Phân Công Cán Bộ Theo Chủ Đề
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          style={{
            padding: "10px 18px",
            fontWeight: 700,
            fontSize: "0.92rem",
            color: activeTab === "analytics" ? "var(--primary)" : "var(--text-muted)",
            borderBottom: activeTab === "analytics" ? "3px solid var(--primary)" : "3px solid transparent",
            background: "none",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <BarChart3 size={17} />
          Phân Tích Chủ Đề (Top FAQs)
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: HỘP THƯ TIẾP NHẬN CÂU HỎI */}
      {/* ============================================================ */}
      {activeTab === "inbox" && (
        <div>
          {/* Filters Bar */}
          <div
            className="card"
            style={{
              padding: "14px 18px",
              marginBottom: "18px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Status Pills */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { key: "pending_staff", label: "🔴 Chờ xử lý", count: stats.pendingStaff },
                { key: "staff_replied", label: "🟢 Cán bộ đã giải đáp", count: stats.staffReplied },
                { key: "ai_resolved", label: "🤖 AI giải đáp", count: stats.aiResolved },
                { key: "all", label: "Tất cả", count: stats.total },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => {
                    setStatusFilter(pill.key);
                    setPage(1);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: statusFilter === pill.key ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                    background: statusFilter === pill.key ? "var(--primary-light)" : "var(--bg)",
                    color: statusFilter === pill.key ? "var(--primary)" : "var(--text)",
                    fontWeight: statusFilter === pill.key ? 700 : 500,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>

            {/* Topic Filter & Search */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={topicFilter}
                onChange={(e) => {
                  setTopicFilter(e.target.value);
                  setPage(1);
                }}
                className="form-input"
                style={{ fontSize: "0.85rem", padding: "6px 10px", height: "36px" }}
              >
                <option value="all">📂 Tất cả chủ đề</option>
                <option value="DAI">🐕 Bệnh dại & Chó cắn</option>
                <option value="TIEM_CHUNG">💉 Tiêm chủng & Vắc xin</option>
                <option value="BENH_TRUYEN_NHIEM">🦟 Bệnh truyền nhiễm</option>
                <option value="XET_NGHIEM">🧪 Xét nghiệm</option>
                <option value="KHAM_BENH">🏥 Khám bệnh & KSK</option>
                <option value="DINH_DUONG">🥗 Dinh dưỡng & ATTP</option>
                <option value="BENH_KHONG_LAY">🫀 Bệnh không lây</option>
                <option value="THU_TUC">📄 Thủ tục hành chính</option>
                <option value="KHAC">🌐 Khác</option>
              </select>

              <div style={{ position: "relative", minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="🔍 Tìm câu hỏi, người dân, SĐT..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="form-input"
                  style={{ fontSize: "0.85rem", padding: "6px 10px 6px 30px", height: "36px" }}
                />
                <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-light)" }} />
              </div>
            </div>
          </div>

          {/* Inquiries List */}
          {loading ? (
            <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
              Đang tải danh sách câu hỏi...
            </div>
          ) : inquiries.length === 0 ? (
            <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🎉</div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
                Không có câu hỏi nào trong danh mục này!
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Tất cả các câu hỏi của người dân đã được giải đáp thỏa đáng.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {inquiries.map((inquiry) => {
                const badge = getTopicBadgeStyle(inquiry.topic);
                const follower = inquiry.follower;
                const displayName = follower?.fullName || follower?.displayName || inquiry.citizenName || "Người dân Zalo";
                const phone = follower?.phone;

                return (
                  <div
                    key={inquiry.id}
                    className="card"
                    style={{
                      padding: "18px 20px",
                      borderLeft:
                        inquiry.status === "pending_staff"
                          ? "4px solid #ef4444"
                          : inquiry.status === "staff_replied"
                          ? "4px solid #10b981"
                          : "4px solid #2563eb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        {/* Header: Citizen info & Avatar & Topic Badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
                          {/* Citizen Avatar / Initials */}
                          {follower?.avatarUrl ? (
                            <img
                              src={follower.avatarUrl}
                              alt={displayName}
                              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                              }}
                            >
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Identity Info */}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 800, fontSize: "0.96rem", color: "var(--text)" }}>
                                {displayName}
                              </span>
                              {follower?.fullName && follower?.displayName && follower.fullName !== follower.displayName && (
                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                  (Zalo: {follower.displayName})
                                </span>
                              )}
                              {phone && (
                                <a
                                  href={`tel:${phone}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "0.78rem",
                                    color: "var(--primary)",
                                    background: "var(--primary-light)",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontWeight: 600,
                                  }}
                                  title="Bấm để gọi điện"
                                >
                                  <Phone size={12} />
                                  {phone}
                                </a>
                              )}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-light)" }}>
                              Zalo ID: {inquiry.zaloUserId}
                            </div>
                          </div>

                          {/* Topic Badge */}
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              borderRadius: "6px",
                              padding: "2px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              marginLeft: "auto",
                            }}
                          >
                            {inquiry.topicLabel || inquiry.topic}
                          </span>

                          <span style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                            ⏰ {new Date(inquiry.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}{" "}
                            - {new Date(inquiry.createdAt).toLocaleDateString("vi-VN")}
                          </span>

                          {inquiry.status === "pending_staff" && (
                            <span
                              style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "0.72rem",
                                fontWeight: 800,
                              }}
                            >
                              CHỜ BÁC SĨ PHẢN HỒI
                            </span>
                          )}

                          {inquiry.status === "staff_replied" && (
                            <span
                              style={{
                                background: "#d1fae5",
                                color: "#065f46",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                              }}
                            >
                              CÁN BỘ ĐÃ TRẢ LỜI
                            </span>
                          )}

                          {inquiry.status === "ai_resolved" && (
                            <span
                              style={{
                                background: "#dbeafe",
                                color: "#1e40af",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                              }}
                            >
                              AI TỰ ĐỘNG GIẢI ĐÁP
                            </span>
                          )}
                        </div>

                        {/* Question Content */}
                        <div
                          style={{
                            fontSize: "0.95rem",
                            lineHeight: 1.5,
                            color: "var(--text)",
                            fontWeight: 600,
                            marginBottom: "10px",
                            background: "var(--bg)",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          ❓ "{inquiry.question}"
                        </div>

                        {/* Staff Reply if already replied */}
                        {inquiry.staffReply && (
                          <div
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              marginBottom: "10px",
                              fontSize: "0.88rem",
                              color: "#166534",
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <CheckCircle2 size={16} />
                              Giải đáp từ {inquiry.repliedBy || "Bác sĩ CDC"} (
                              {inquiry.repliedAt ? new Date(inquiry.repliedAt).toLocaleString("vi-VN") : ""}):
                            </div>
                            <div style={{ whiteSpace: "pre-line" }}>{inquiry.staffReply}</div>
                          </div>
                        )}

                        {/* Routing Details footer */}
                        <div style={{ display: "flex", gap: "16px", fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          <span>
                            🏢 Phụ trách: <strong>{inquiry.assignedDept || "Chưa phân khoa"}</strong>
                          </span>
                          {inquiry.assignedStaffName && (
                            <span>
                              👨‍⚕️ Cán bộ: <strong>{inquiry.assignedStaffName}</strong>
                              {inquiry.notifiedAt && (
                                <span style={{ color: "#10b981", marginLeft: "4px" }} title="Đã bắn tin Zalo cho cán bộ">
                                  (Đã báo Zalo ✅)
                                </span>
                              )}
                            </span>
                          )}
                          {follower?.interestGroup && (
                            <span>
                              🎯 Nhóm: <strong>{follower.interestGroup}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        {inquiry.status === "pending_staff" ? (
                          <button
                            onClick={() => handleOpenReplyModal(inquiry)}
                            className="btn btn-primary"
                            style={{
                              padding: "8px 16px",
                              fontSize: "0.85rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Send size={15} />
                            Xem & Trả lời
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReplyModal(inquiry)}
                            className="btn btn-outline"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.8rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Xem lịch sử / Sửa
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="btn btn-outline"
                    style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  >
                    Trang trước
                  </button>
                  <span style={{ display: "flex", alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-outline"
                    style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: CẤU HÌNH PHÂN CÔNG CÁN BỘ THEO CHỦ ĐỀ */}
      {/* ============================================================ */}
      {activeTab === "topics" && (
        <div>
          <div className="card" style={{ padding: "20px 24px", marginBottom: "18px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text)" }}>
              🎯 Ma Trận Điều Phối Câu Hỏi Đến Cán Bộ Chuyên Trách
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Khi người dân hỏi các câu hỏi chuyên sâu hoặc AI không giải đáp được, hệ thống tự động bắn tin Zalo thông báo
              đến tài khoản Zalo cá nhân của Cán bộ được phân công dưới đây:
            </p>

            {topicSaveSuccess && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  color: "#166534",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                }}
              >
                ✅ {topicSaveSuccess}
              </div>
            )}
          </div>

          {loadingTopics ? (
            <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
              Đang tải danh mục phân công...
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "16px" }}>
              {topics.map((topic) => {
                const badge = getTopicBadgeStyle(topic.topicCode);
                return (
                  <div key={topic.id} className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "0.8rem",
                            fontWeight: 800,
                          }}
                        >
                          {topic.topicCode}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--text)" }}>
                          {topic.topicLabel}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Tổng: <strong>{topic.stats?.total || 0}</strong> ({topic.stats?.pending || 0} chờ xử lý)
                      </div>
                    </div>

                    {/* Department */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                        Khoa / Phòng phụ trách:
                      </label>
                      <input
                        type="text"
                        value={topic.department}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, department: val } : t)));
                        }}
                        className="form-input"
                        style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      />
                    </div>

                    {/* Staff Selector */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                        Cán bộ nhận tin Zalo cảnh báo:
                      </label>
                      <select
                        value={topic.staffZaloUserId || ""}
                        onChange={(e) => {
                          const selectedUid = e.target.value;
                          const found = staffList.find((s) => s.zaloUserId === selectedUid);
                          setTopics((prev) =>
                            prev.map((t) =>
                              t.id === topic.id
                                ? {
                                    ...t,
                                    staffZaloUserId: selectedUid || null,
                                    staffName: found?.staffNameRaw || null,
                                  }
                                : t
                            )
                          );
                        }}
                        className="form-input"
                        style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      >
                        <option value="">-- Chưa gán (Hệ thống tự tìm cán bộ trong khoa) --</option>
                        {staffList.map((st) => (
                          <option key={st.id} value={st.zaloUserId}>
                            {st.staffNameRaw} ({st.department || "Chưa rõ phòng"} - {st.phone || "Không SĐT"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notification toggle */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        id={`notify-${topic.id}`}
                        checked={topic.notifyZalo}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, notifyZalo: checked } : t)));
                        }}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                      <label htmlFor={`notify-${topic.id}`} style={{ fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                        Bắn tin nhắn Zalo cho cán bộ ngay khi có câu hỏi chưa giải đáp
                      </label>
                    </div>

                    {/* Keywords */}
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                        Từ khóa nhận diện tự động (cách nhau bởi dấu phẩy):
                      </label>
                      <textarea
                        rows={2}
                        value={topic.keywords || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTopics((prev) => prev.map((t) => (t.id === topic.id ? { ...t, keywords: val } : t)));
                        }}
                        className="form-input"
                        style={{ fontSize: "0.8rem", padding: "6px 10px", resize: "vertical" }}
                      />
                    </div>

                    {/* Save Button */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleSaveTopic(topic)}
                        disabled={savingTopicId === topic.id}
                        className="btn btn-primary"
                        style={{ padding: "6px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        {savingTopicId === topic.id ? "Đang lưu..." : "Lưu phân công"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: PHÂN TÍCH CHỦ ĐỀ & TOP FAQs */}
      {/* ============================================================ */}
      {activeTab === "analytics" && (
        <div>
          {loadingAnalytics ? (
            <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
              Đang tính toán thống kê...
            </div>
          ) : analyticsData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Resolution Efficiency Card */}
              <div className="card" style={{ padding: "20px 24px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 14px", color: "var(--text)" }}>
                  ⚡ Hiệu Suất Tự Động Hóa & Phản Hồi Câu Hỏi
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>AI Tự Động Giải Quyết</div>
                    <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#2563eb", marginTop: "4px" }}>
                      {analyticsData.resolutionRate?.aiResolvedPct || 0}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Không cần can thiệp con người</div>
                  </div>

                  <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Cán Bộ Hỗ Trợ Trực Tiếp</div>
                    <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
                      {analyticsData.resolutionRate?.staffRepliedPct || 0}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Giải đáp chuyên môn sâu qua Zalo</div>
                  </div>

                  <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Đang Chờ Cán Bộ Phản Hồi</div>
                    <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>
                      {analyticsData.resolutionRate?.pendingStaffPct || 0}%
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Phiếu đang trong hàng đợi</div>
                  </div>
                </div>
              </div>

              {/* Top FAQs Topics Breakdown */}
              <div className="card" style={{ padding: "20px 24px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 16px", color: "var(--text)" }}>
                  📊 Các Chủ Đề Người Dân Quan Tâm & Hỏi Nhiều Nhất (Top FAQs)
                </h3>

                {analyticsData.topicDistribution?.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Chưa có dữ liệu câu hỏi để thống kê.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {analyticsData.topicDistribution.map((item, idx) => (
                      <div key={item.topicCode || idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "4px" }}>
                          <span style={{ fontWeight: 600 }}>
                            {idx + 1}. {item.topicLabel}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>
                            {item.count} câu hỏi ({item.percentage}%)
                          </span>
                        </div>
                        <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.max(5, item.percentage)}%`,
                              height: "100%",
                              background:
                                idx === 0
                                  ? "#2563eb"
                                  : idx === 1
                                  ? "#10b981"
                                  : idx === 2
                                  ? "#f59e0b"
                                  : "#64748b",
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 14-day trend */}
              <div className="card" style={{ padding: "20px 24px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 14px", color: "var(--text)" }}>
                  📅 Xu Hướng Tiếp Nhận Câu Hỏi (14 Ngày Gần Nhất)
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                        <th style={{ padding: "8px" }}>Ngày</th>
                        <th style={{ padding: "8px" }}>Tổng tiếp nhận</th>
                        <th style={{ padding: "8px" }}>Chờ xử lý</th>
                        <th style={{ padding: "8px" }}>Đã giải quyết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.dailyTrend?.map((d) => (
                        <tr key={d.date} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px", fontWeight: 600 }}>{d.date}</td>
                          <td style={{ padding: "8px" }}>{d.total}</td>
                          <td style={{ padding: "8px", color: d.pending > 0 ? "#ef4444" : "var(--text-muted)", fontWeight: d.pending > 0 ? 700 : 400 }}>
                            {d.pending}
                          </td>
                          <td style={{ padding: "8px", color: "#10b981" }}>{d.resolved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL / DRAWER: XÁC ĐỊNH NGƯỜI HỎI & XEM LỊCH SỬ TRÒ CHUYỆN ĐỂ TRẢ LỜI */}
      {/* ============================================================ */}
      {selectedInquiry && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "1080px",
              height: "92vh",
              maxHeight: "820px",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "slideUp 0.25s ease-out",
              borderRadius: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--card-bg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text)" }}>
                    🩺 Trả Lời Người Dân & Tra Cứu Lịch Sử Hội Thoại
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Phiếu #{selectedInquiry.id} • Chủ đề: <strong>{selectedInquiry.topicLabel}</strong> • Đơn vị: {selectedInquiry.assignedDept}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedInquiry(null)}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "6px",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", flexWrap: "wrap" }}>
              {/* LEFT COLUMN: IDENTIFICATION & CHAT HISTORY (45%) */}
              <div
                style={{
                  flex: "1 1 420px",
                  borderRight: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  background: "#f8fafc",
                  overflowY: "auto",
                }}
              >
                {/* 1. CITIZEN IDENTITY CARD (Hồ sơ người hỏi) */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "#ffffff" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={14} />
                    Định Danh Người Hỏi (Zalo Follower)
                  </div>

                  {loadingContext ? (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                      <RefreshCw size={14} className="animate-spin" /> Đang lấy thông tin định danh...
                    </div>
                  ) : inquiryContext?.follower ? (
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      {inquiryContext.follower.avatarUrl ? (
                        <img
                          src={inquiryContext.follower.avatarUrl}
                          alt="Avatar"
                          style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", border: "2px solid #bfdbfe", flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {(inquiryContext.follower.fullName || inquiryContext.follower.displayName || "N").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div style={{ flex: 1, fontSize: "0.82rem" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text)" }}>
                          {inquiryContext.follower.fullName || inquiryContext.follower.displayName || "Người dân Zalo"}
                        </div>

                        {inquiryContext.follower.fullName && inquiryContext.follower.displayName && inquiryContext.follower.fullName !== inquiryContext.follower.displayName && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                            Tên Zalo: <strong>{inquiryContext.follower.displayName}</strong>
                          </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
                          {inquiryContext.follower.phone ? (
                            <a
                              href={`tel:${inquiryContext.follower.phone}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <Phone size={12} />
                              {inquiryContext.follower.phone}
                            </a>
                          ) : (
                            <span style={{ color: "var(--text-light)", fontSize: "0.75rem" }}>Chưa đăng ký SĐT</span>
                          )}

                          {inquiryContext.follower.dob && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--text-muted)" }}>
                              <Calendar size={12} /> {inquiryContext.follower.dob}
                            </span>
                          )}

                          {inquiryContext.follower.cccd && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--text-muted)" }}>
                              <CreditCard size={12} /> CCCD: {inquiryContext.follower.cccd}
                            </span>
                          )}
                        </div>

                        {inquiryContext.follower.interestGroup && (
                          <div style={{ marginTop: "4px", fontSize: "0.75rem", color: "#047857" }}>
                            🎯 Nhóm quan tâm: <strong>{inquiryContext.follower.interestGroup}</strong>
                          </div>
                        )}

                        <div style={{ marginTop: "2px", fontSize: "0.72rem", color: "var(--text-light)" }}>
                          Zalo User ID: <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 4 }}>{selectedInquiry.zaloUserId}</code>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 2. CHAT HISTORY (Lịch sử trò chuyện thực tế trên Zalo) */}
                <div style={{ padding: "12px 20px 8px", background: "#f1f5f9", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                    <History size={14} />
                    Lịch Sử Hỏi Đáp Gần Nhất (Hội thoại Zalo)
                  </div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {inquiryContext?.chatHistory?.length || 0} tin nhắn
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {loadingContext ? (
                    <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                      Đang đồng bộ đoạn chat của người dân...
                    </div>
                  ) : inquiryContext?.chatHistory?.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      Chưa ghi nhận tin nhắn trò chuyện nào trước đó.
                    </div>
                  ) : (
                    inquiryContext?.chatHistory?.map((msg) => {
                      const isInbound = msg.direction === "inbound";
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isInbound ? "flex-start" : "flex-end",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-light)",
                              marginBottom: "2px",
                              display: "flex",
                              gap: "4px",
                            }}
                          >
                            <span>{isInbound ? "👤 Người dân" : "🏥 CDC / AI"}</span>
                            <span>•</span>
                            <span>{new Date(msg.receivedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>

                          <div
                            style={{
                              maxWidth: "85%",
                              padding: "9px 13px",
                              borderRadius: isInbound ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                              background: isInbound ? "#ffffff" : "#2563eb",
                              color: isInbound ? "var(--text)" : "#ffffff",
                              fontSize: "0.85rem",
                              lineHeight: 1.45,
                              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                              border: isInbound ? "1px solid #e2e8f0" : "none",
                              whiteSpace: "pre-line",
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>
              </div>

              {/* RIGHT COLUMN: ACTION & REPLY FORM (55%) */}
              <div
                style={{
                  flex: "1 1 480px",
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px 24px",
                  overflowY: "auto",
                  background: "#ffffff",
                }}
              >
                {/* Notifications */}
                {replySuccess && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      color: "#166534",
                      fontSize: "0.88rem",
                      marginBottom: "14px",
                    }}
                  >
                    ✅ {replySuccess}
                  </div>
                )}
                {replyError && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      color: "#991b1b",
                      fontSize: "0.88rem",
                      marginBottom: "14px",
                    }}
                  >
                    ⚠️ {replyError}
                  </div>
                )}

                {/* Focus Question Box */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1.5px solid #e2e8f0",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>
                    ❓ Câu hỏi trọng tâm đang cần xử lý:
                  </div>
                  <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--text)", marginTop: "4px", lineHeight: 1.5 }}>
                    "{selectedInquiry.question}"
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span>Chủ đề: <strong>{selectedInquiry.topicLabel}</strong></span>
                    <span>Khoa: <strong>{selectedInquiry.assignedDept}</strong></span>
                  </div>
                </div>

                {/* Quick Snippets */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>
                    Gợi ý phản hồi nhanh (Bấm để chèn):
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {[
                      {
                        label: "Mời đến CDC khám",
                        text: "Chào bạn, với tình trạng bạn vừa mô tả, Bác sĩ CDC Đà Nẵng đề nghị bạn đến trực tiếp cơ sở tại 118 Lê Đình Lý để được thăm khám và xử trí kịp thời.",
                      },
                      {
                        label: "Xử trí vết chó cắn",
                        text: "Chào bạn, đối với vết thương do chó/mèo cắn, bạn hãy rửa kỹ vết thương dưới vòi nước chảy bằng xà phòng ít nhất 15 phút, sát trùng bằng cồn 70 độ hoặc cồn i-ốt, sau đó đến ngay phòng tiêm CDC Đà Nẵng để tiêm vắc xin dại và huyết thanh kháng dại càng sớm càng tốt.",
                      },
                      {
                        label: "Lịch tiêm phòng",
                        text: "Chào bạn, phòng tiêm chủng dịch vụ của CDC Đà Nẵng mở cửa từ Thứ 2 đến Chủ nhật (Buổi sáng: 7h30 - 11h00, Buổi chiều: 13h30 - 16h30). Bạn có thể đến trực tiếp để được Bác sĩ khám sàng lọc trước tiêm.",
                      },
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReplyText((prev) => (prev ? prev + "\n\n" + tpl.text : tpl.text))}
                        style={{
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          color: "var(--text)",
                        }}
                      >
                        + {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reply Editor */}
                <div style={{ marginBottom: "14px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
                    Nội dung Bác sĩ / Cán bộ chuyên trách trả lời cho người dân:
                  </label>
                  <textarea
                    rows={6}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung tư vấn, chỉ dẫn y tế chuyên môn gửi đến Zalo người dân..."
                    className="form-input"
                    style={{
                      width: "100%",
                      fontSize: "0.88rem",
                      padding: "10px 12px",
                      lineHeight: 1.5,
                      flex: 1,
                      minHeight: "130px",
                    }}
                  />
                </div>

                {/* AI Learning Checkbox */}
                <div
                  style={{
                    background: "var(--primary-light)",
                    border: "1px solid var(--border-focus)",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="saveToKb"
                    checked={saveToKnowledge}
                    onChange={(e) => setSaveToKnowledge(e.target.checked)}
                    style={{ width: 17, height: 17, marginTop: 2, cursor: "pointer" }}
                  />
                  <label htmlFor="saveToKb" style={{ fontSize: "0.82rem", cursor: "pointer", color: "var(--text)" }}>
                    <strong style={{ color: "var(--primary)" }}>🌟 Nạp câu trả lời này vào Khối óc AI (Luyện AI cho lần sau)</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Khi người dân khác hỏi câu tương tự, Trợ lý AI sẽ tự động học câu trả lời của Bác sĩ để giải đáp ngay lập tức.
                    </div>
                  </label>
                </div>

                {/* Bottom Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedInquiry(null)}
                    className="btn btn-outline"
                    style={{ padding: "8px 16px", fontSize: "0.88rem" }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="btn btn-primary"
                    style={{
                      padding: "8px 22px",
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Send size={16} />
                    {sendingReply ? "Đang gửi qua Zalo..." : "Gửi Trả Lời Zalo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
