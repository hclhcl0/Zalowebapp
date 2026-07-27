"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Send, Plus, X, CheckCircle, XCircle,
  Loader2, Eye, EyeOff, AlertCircle, RefreshCw, Search,
  ChevronLeft, ChevronRight, Users, Settings2, Mail, Trash2, Zap
} from "lucide-react";
import { generateSalaryEmail } from "@/lib/salaryEmailTemplate";
import { generateCustomEmail } from "@/lib/customEmailTemplate";
import { generateTaxEmail } from "@/lib/taxEmailTemplate";

// Page size for tables pagination
const PAGE_SIZE = 8;

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v === 0 ? "0" : v.toLocaleString("vi-VN");
  const n = parseFloat(String(v));
  if (!isNaN(n) && String(v).trim() !== "") return n.toLocaleString("vi-VN");
  return String(v);
};

const cleanPhone = (p) => {
  if (!p) return "";
  let cleaned = String(p).replace(/[^\d]/g, "");
  if (cleaned.startsWith("84") && cleaned.length > 9) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
};

const normalizeName = (n) => {
  return String(n || "").trim().toLowerCase().replace(/\s+/g, ' ');
};function ZaloLinkSelect({ value, followers, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedFollower = followers.find(f => f.zaloUserId === value);

  const filtered = followers.filter(f => {
    const term = search.toLowerCase();
    const name = (f.displayName || "").toLowerCase();
    const phone = (f.phone || "").toLowerCase();
    const userId = (f.zaloUserId || "").toLowerCase();
    const staffNameRaw = (f.staffLink?.staffNameRaw || "").toLowerCase();
    return name.includes(term) || phone.includes(term) || userId.includes(term) || staffNameRaw.includes(term);
  });

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", minWidth: "150px" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .zalo-select-option {
          transition: background-color 0.1s;
        }
        .zalo-select-option:hover {
          background-color: var(--bg) !important;
        }
        .zalo-select-option.active:hover {
          background-color: var(--primary-light) !important;
        }
        .zalo-select-danger-option:hover {
          background-color: #fef2f2 !important;
        }
      `}} />
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        type="button"
        className="form-input"
        style={{
          width: "100%",
          height: "28px",
          fontSize: "0.75rem",
          padding: "2px 8px",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          border: value ? "1px solid var(--success)" : "1px solid var(--border)",
          background: value ? "#f0fdf4" : "var(--bg)",
          color: value ? "#166534" : "var(--text)"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90%" }}>
          {selectedFollower ? (
            selectedFollower.staffLink?.staffNameRaw ? (
              `${selectedFollower.staffLink.staffNameRaw} (Zalo: ${selectedFollower.displayName})`
            ) : (
              `${selectedFollower.displayName} ${selectedFollower.phone ? `(${selectedFollower.phone})` : ""}`
            )
          ) : (
            "-- Chưa liên kết --"
          )}
        </span>
        <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", marginLeft: "4px" }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 999,
          background: "white",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-lg)",
          marginTop: "4px",
          padding: "6px",
          minWidth: "220px"
        }}>
          <input
            type="text"
            placeholder="Tìm tên hoặc SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{
              height: "28px",
              fontSize: "0.75rem",
              padding: "4px 8px",
              marginBottom: "6px",
              width: "100%",
              boxSizing: "border-box"
            }}
            autoFocus
          />
          <div style={{
            maxHeight: "150px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "2px"
          }}>
            <button
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              type="button"
              className="zalo-select-option zalo-select-danger-option"
              style={{
                width: "100%",
                padding: "6px 8px",
                fontSize: "0.75rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderRadius: "4px",
                color: "var(--danger)",
                fontWeight: 600,
                lineHeight: "1.5",
                flexShrink: 0,
                minHeight: "32px"
              }}
            >
              -- Chưa liên kết --
            </button>
            {filtered.length === 0 ? (
              <div style={{ padding: "6px 8px", fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                Không tìm thấy người dùng
              </div>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.zaloUserId}
                  onClick={() => {
                    onChange(f.zaloUserId);
                    setIsOpen(false);
                  }}
                  type="button"
                  className={`zalo-select-option ${f.zaloUserId === value ? "active" : ""}`}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: "0.75rem",
                    textAlign: "left",
                    background: f.zaloUserId === value ? "var(--primary-light)" : "transparent",
                    color: f.zaloUserId === value ? "var(--primary)" : "var(--text)",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "4px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: "1.5",
                    flexShrink: 0,
                    minHeight: "32px"
                  }}
                >
                  {f.staffLink?.staffNameRaw ? (
                    `${f.staffLink.staffNameRaw} (Zalo: ${f.displayName})`
                  ) : (
                    `${f.displayName} ${f.phone ? `(${f.phone})` : ""}`
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalaryEmailPage() {


  const [activeTab, setActiveTab] = useState("custom");

  // === accounts states ===
  const [accounts, setAccounts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [delayMs, setDelayMs] = useState(2000);
  const [followers, setFollowers] = useState([]);

  // Load Gmail pool from localStorage & followers from DB
  useEffect(() => {
    const saved = localStorage.getItem("cdc_gmail_pool");
    if (saved) {
      try {
        setAccounts(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    const savedBatch = localStorage.getItem("cdc_email_batch_size");
    if (savedBatch) setBatchSize(Number(savedBatch));
    const savedDelay = localStorage.getItem("cdc_email_delay_ms");
    if (savedDelay) setDelayMs(Number(savedDelay));
    setIsLoaded(true);

    // Tải người quan tâm Zalo (lấy tối đa 5000 để map đủ danh sách)
    fetch("/api/followers?limit=5000")
      .then(res => res.json())
      .then(json => {
        if (json.data) setFollowers(json.data);
      })
      .catch(err => console.error("Error loading Zalo followers:", err));
  }, []);
  const [isRefreshingFollowers, setIsRefreshingFollowers] = useState(false);
  const refreshFollowers = async () => {
    setIsRefreshingFollowers(true);
    try {
      const res = await fetch("/api/followers?limit=5000");
      const json = await res.json();
      if (json.data) {
        setFollowers(json.data);
      }
    } catch (err) {
      console.error("Error refreshing Zalo followers:", err);
    } finally {
      setIsRefreshingFollowers(false);
    }
  };

  return (
    <div>
      {/* Removed HEADER because banner is present */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        {accounts.length > 0 && (
          <span className="badge badge-approved" style={{ padding: "8px 12px", gap: "6px", height: "36px", display: "inline-flex", alignItems: "center" }}>
            <Zap className="w-3.5 h-3.5 fill-current" /> {accounts.length} Gmail Pool
          </span>
        )}
      </div>

      {/* Internal Banner */}
      <div style={{ marginBottom: "24px", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)", background: "white", display: "flex", justifyContent: "center" }}>
        <img 
          src="/images/banner-internal.png" 
          alt="Gửi tin nội bộ" 
          style={{ width: "100%", maxWidth: "800px", height: "auto", display: "block", objectFit: "contain" }} 
        />
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { id: "custom", label: "📧 Email Tùy Chọn", desc: "Gửi email đính kèm Excel tùy biến" },
          { id: "zalo", label: "💬 Tin Zalo Nội Bộ", desc: "Soạn tin nhắn gửi tới cán bộ nhân viên" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "4px",
              padding: "14px 18px",
              borderRadius: "var(--radius-lg)",
              border: `1px solid ${activeTab === tab.id ? "var(--primary)" : "var(--border)"}`,
              background: activeTab === tab.id ? "var(--primary-light)" : "var(--card-bg)",
              cursor: "pointer",
              flex: "1 1 200px",
              textAlign: "left",
              transition: "all 0.2s",
              boxShadow: activeTab === tab.id ? "var(--shadow-md), 0 0 0 3px var(--primary-glow)" : "var(--shadow-sm)"
            }}
          >
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: activeTab === tab.id ? "var(--primary)" : "var(--text)" }}>
              {tab.label}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {tab.desc}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main contents: active tab component */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "custom" ? (
            <CustomSalaryTab accounts={accounts} batchSize={batchSize} delayMs={delayMs} followers={followers} />
          ) : (
            <ZaloStaffTab followers={followers} />
          )}
        </div>

        {/* Right side config panel: Settings Card or Zalo Staff History Card */}
        <div className="space-y-6">
          {activeTab === "custom" ? (
            <div className="card" style={{ padding: "20px" }}>
              <div className="card-header" style={{ marginBottom: "16px" }}>
                <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🔑 Gmail Account Pool</span>
                </div>
              </div>
              <div className="space-y-4">
                <div style={{
                  background: accounts.length > 0 ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${accounts.length > 0 ? "#bbf7d0" : "#fecaca"}`,
                  color: accounts.length > 0 ? "#15803d" : "#dc2626",
                  borderRadius: "var(--radius)",
                  padding: "12px",
                  fontSize: "0.8rem",
                  lineHeight: "1.5",
                  display: "flex",
                  gap: "8px"
                }}>
                  <AlertCircle className="w-4 h-4 shrink-0 text-current mt-0.5" />
                  <div>
                    <strong>{accounts.length > 0 ? `Đang hoạt động (${accounts.length} Gmail)` : "Chưa cấu hình"}</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {accounts.length > 0 
                        ? "Tài khoản Gmail được luân phiên tự động để gửi thông tin nội bộ cơ quan."
                        : "Vui lòng thêm tài khoản Gmail để bắt đầu thực hiện chiến dịch."}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8rem", background: "var(--bg)", padding: "12px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Số lượng Gmail:</span>
                    <span style={{ fontWeight: 600 }}>{accounts.length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Số email mỗi đợt:</span>
                    <span style={{ fontWeight: 600 }}>{batchSize} email</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>Thời gian giãn cách:</span>
                    <span style={{ fontWeight: 600 }}>{delayMs / 1000} giây</span>
                  </div>
                </div>

                <a 
                  href="/settings?tab=gmail_pool" 
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", textDecoration: "none", display: "inline-flex", gap: "8px" }}
                >
                  <Settings2 className="w-4 h-4" /> Cấu hình Gmail &amp; Tốc độ
                </a>
              </div>
            </div>
          ) : (
            <ZaloStaffHistoryCard />
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT 1: BÁO LƯƠNG QUÝ TAB
// ==========================================
function SalaryTab({ accounts, batchSize, delayMs, followers }) {
  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);
  const [page, setPage] = useState(0);

  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("Thông báo thông báo nội bộ Quý I/2026 - CDC Đà Nẵng");
  const [customMessage, setCustomMessage] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState({ sent: 0, total: 0, success: 0, failed: 0, results: [] });
  const [previewRecord, setPreviewRecord] = useState(null);

  const handleLinkZalo = async (recordId, zaloUserId, record) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, zaloUserId } : r))
    );
    if (zaloUserId && record) {
      const rawPhone = record.phone || record.sdt;
      const phoneVal = cleanPhone(rawPhone);
      if (phoneVal) {
        try {
          await fetch("/api/followers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zaloUserId, phone: phoneVal })
          });
          console.log(`Saved phone ${phoneVal} for Zalo User ID ${zaloUserId}`);
        } catch (err) {
          console.error("Failed to save follower phone link:", err);
        }
      }
    }
  };

  const processFile = useCallback(async (file, sheetName = "") => {
    setParseError("");
    setParsing(true);
    setRecords([]);
    setFileName(file.name);
    setExcelFile(file);
    setPage(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (sheetName) fd.append("sheetName", sheetName);
      const res = await fetch("/api/salary-email/parse-excel", { method: "POST", body: fd });
      const json = await res.json();
      if (json.records) {
        setSheets(json.sheets || []);
        setSelectedSheet(json.selectedSheet || "");
        setRecords(
          json.records.map((r) => {
            // Tự động đối chiếu Zalo Follower
            let matchedFollower = null;
            if (followers && followers.length > 0) {
              const excelZaloId = r.zaloUserId || r.zaloId || r.idZalo || r.zalo;
              if (excelZaloId) {
                const cleanId = String(excelZaloId).trim();
                if (cleanId) matchedFollower = followers.find(f => f.zaloUserId === cleanId);
              }
              if (!matchedFollower && (r.phone || r.sdt)) {
                const cleanedR = cleanPhone(r.phone || r.sdt);
                if (cleanedR) matchedFollower = followers.find(f => f.phone && cleanPhone(f.phone) === cleanedR);
              }
              if (!matchedFollower) {
                const normR = normalizeName(r.tenNhanVien);
                if (normR) {
                  // Ưu tiên tìm trong staffLink (tên thật đã đăng ký)
                  matchedFollower = followers.find(f => 
                    f.staffLink && 
                    (normalizeName(f.staffLink.staffNameRaw) === normR || 
                     normalizeName(f.staffLink.staffName) === normR)
                  );
                  // Nếu không thấy, tìm theo displayName (tên hiển thị Zalo)
                  if (!matchedFollower) {
                    matchedFollower = followers.find(f => normalizeName(f.displayName) === normR);
                  }
                }
              }
            }

            return {
              ...r,
              id: crypto.randomUUID(),
              selected: true,
              status: "idle",
              zaloUserId: matchedFollower ? matchedFollower.zaloUserId : "",
            };
          })
        );
      } else {
        setParseError(json.error || "Lỗi đọc file");
      }
    } catch (e) {
      setParseError("Không thể kết nối server hoặc phân tích file.");
    } finally {
      setParsing(false);
    }
  }, [followers]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const startSend = async () => {
    const selectedRecords = records.filter((r) => r.selected && r.status !== "success");
    if (!selectedRecords.length || (channel !== "zalo" && !accounts.length) || isSending) return;
    setIsSending(true);
    setIsDone(false);
    setProg({ sent: 0, total: selectedRecords.length, success: 0, failed: 0, results: [] });

    setRecords((prev) =>
      prev.map((r) =>
        selectedRecords.some((sr) => sr.id === r.id)
          ? { ...r, status: "idle", error: undefined }
          : r
      )
    );

    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const res = await fetch("/api/salary-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          records: selectedRecords,
          accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject,
          batchSize,
          batchDelayMs: delayMs,
          customMessage,
          channel,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Lỗi hệ thống khi gửi email.");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r = ev.result;
            setRecords((prev) =>
              prev.map((rec) =>
                rec.email === r.email && rec.tenNhanVien === r.tenNhanVien
                  ? { ...rec, status: r.status, error: r.error }
                  : rec
              )
            );
            setProg((p) => ({
              sent: ev.index,
              total: ev.total,
              success: p.success + (r.status === "success" ? 1 : 0),
              failed: p.failed + (r.status === "error" ? 1 : 0),
              results: [...p.results, r],
            }));
            setTimeout(() => {
              if (resultsRef.current) {
                resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
              }
            }, 50);
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("Đã dừng gửi");
        setRecords((prev) =>
          prev.map((r) =>
            r.status === "idle" && selectedRecords.some((s) => s.id === r.id)
              ? { ...r, status: "idle" }
              : r
          )
        );
      } else {
        console.error(e);
        setParseError("Lỗi kết nối: " + e.message);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;

  const filteredRecords = records.filter((r) => {
    if (searchQuery && !r.tenNhanVien.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "selected") return r.selected;
    if (filterStatus === "success") return r.status === "success";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const pageRows = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedCount = records.filter((r) => r.selected && r.status !== "success").length;
  const canSend = selectedCount > 0 && (channel === "zalo" || accounts.length > 0) && !isSending;

  const toggleSelectAll = (checked) => {
    setRecords((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };
  const toggleSelect = (id, checked) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, selected: checked } : r)));
  };

  return (
    <div className="space-y-6">
      {/* ── STEP 1: UPLOAD ── */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "bold" }}>1</span>
            <span>Tải file Excel danh sách Thông báo nội bộ</span>
          </div>
        </div>
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDrag(true);
            }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDrag ? "var(--primary)" : "var(--border)"}`,
              background: isDrag ? "var(--primary-light)" : "var(--bg)",
              borderRadius: "var(--radius-lg)",
              padding: "32px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
            {parsing ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Đang phân tích file...</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>Kéo thả hoặc click để chọn file Excel</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Hỗ trợ: .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>

          {parseError && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "var(--danger)",
              borderRadius: "var(--radius)",
              padding: "12px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px"
            }}>
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{parseError}</span>
            </div>
          )}

          {records.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                  <span className="badge badge-info" style={{ gap: "4px" }}>
                    <Users className="w-3.5 h-3.5" /> {records.length} Nhân viên
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
                  {sheets.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Sheet:</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => {
                          const nextSheet = e.target.value;
                          if (excelFile) processFile(excelFile, nextSheet);
                        }}
                        className="form-select"
                        style={{
                          padding: "2px 8px",
                          fontSize: "0.72rem",
                          height: "26px",
                          width: "auto",
                          minWidth: "110px",
                          borderRadius: "6px",
                          border: "1px solid var(--primary)",
                          color: "var(--primary)",
                          fontWeight: 600,
                          background: "var(--primary-light)"
                        }}
                      >
                        {sheets.map((sh) => (
                          <option key={sh} value={sh}>{sh}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "4px", background: "var(--bg)", padding: "4px", borderRadius: "var(--radius)" }}>
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "selected", label: `Đã chọn (${records.filter(r => r.selected).length})` },
                    { id: "error", label: `Lỗi (${records.filter(r => r.status === "error").length})` },
                    { id: "success", label: "Đã gửi" }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setFilterStatus(st.id);
                        setPage(0);
                      }}
                      className="btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        background: filterStatus === st.id ? "white" : "transparent",
                        border: "none",
                        boxShadow: filterStatus === st.id ? "var(--shadow-sm)" : "none",
                        color: filterStatus === st.id ? "var(--primary)" : "var(--text-muted)",
                        borderRadius: "4px"
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Tìm kiếm theo tên nhân viên..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                    style={{ width: "100%", paddingLeft: "38px" }}
                  />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Đổi file
                </button>
              </div>

              {/* Table list */}
              <div className="table-wrapper" style={{ minHeight: "350px", overflowX: "auto", maxWidth: "100vw" }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "45px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={records.length > 0 && records.every((r) => r.selected)}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th>Tên nhân viên</th>
                      <th>Email nhận</th>
                      <th>Liên kết Zalo</th>
                      <th style={{ textAlign: "right" }}>HS T1</th>
                      <th style={{ textAlign: "right" }}>HS T2</th>
                      <th style={{ textAlign: "right" }}>HS T3</th>
                      <th style={{ textAlign: "right" }}>Tổng thu nhập</th>
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                      <th style={{ textAlign: "center" }}>Xem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} style={{
                        background: r.status === "success" ? "#f0fdf4" : r.status === "error" ? "#fef2f2" : "inherit"
                      }}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={(e) => toggleSelect(r.id, e.target.checked)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{r.tenNhanVien}</td>
                        <td style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.email}</td>
                        <td>
                          <ZaloLinkSelect
                            value={r.zaloUserId || ""}
                            followers={followers}
                            onChange={(val) => handleLinkZalo(r.id, val, r)}
                          />
                        </td>
                        <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{r.heSoLieuT1}</td>
                        <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{r.heSoLieuT2}</td>
                        <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{r.heSoLieuT3}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{fmt(r.tongThuNhap)}</td>
                        <td style={{ textAlign: "center" }}>
                          {r.status === "success" && <span className="badge badge-approved">Đã gửi</span>}
                          {r.status === "error" && <span className="badge badge-cancelled" title={r.error}>Lỗi</span>}
                          {r.status === "idle" && <span style={{ color: "var(--text-light)" }}>—</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px", minWidth: "auto" }}
                            onClick={() => setPreviewRecord(r)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan="10" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                          Không có dữ liệu phù hợp bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Trang {page + 1} / {totalPages}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="w-4 h-4" /> Trước
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                    >
                      Sau <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "bold" }}>2</span>
            <span>Cấu hình gửi thông báo nội bộ (Email & Zalo OA)</span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Kênh gửi thông báo</label>
            <div style={{ display: "flex", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                <input 
                  type="radio" 
                  name="channel-salary" 
                  value="email" 
                  checked={channel === "email"} 
                  onChange={() => setChannel("email")} 
                  style={{ cursor: "pointer" }}
                />
                📧 Chỉ gửi Gmail
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                <input 
                  type="radio" 
                  name="channel-salary" 
                  value="zalo" 
                  checked={channel === "zalo"} 
                  onChange={() => setChannel("zalo")} 
                  style={{ cursor: "pointer" }}
                />
                💬 Chỉ gửi Zalo OA
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                <input 
                  type="radio" 
                  name="channel-salary" 
                  value="both" 
                  checked={channel === "both"} 
                  onChange={() => setChannel("both")} 
                  style={{ cursor: "pointer" }}
                />
                🔄 Gửi cả hai kênh
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tiêu đề (Tiêu đề email / Tiêu đề tin nhắn Zalo)</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-input"
              placeholder="Nhập tiêu đề..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Lời nhắn gửi kèm đầu thư (Tùy chọn)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="form-textarea"
              placeholder="Nhập lời mở đầu gửi kèm..."
            />
          </div>

          {records.length > 0 && (
            <div style={{
              background: "var(--primary-light)",
              border: "1px solid var(--border-focus)",
              color: "var(--primary)",
              borderRadius: "var(--radius)",
              padding: "12px",
              fontSize: "0.8rem",
              lineHeight: "1.5"
            }}>
              {channel === "email" && (
                <>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                    Sẽ gửi {selectedCount} email thông báo nội bộ thông qua {accounts.length} tài khoản Gmail.
                  </p>
                  {accounts.length > 0 && (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Trung bình mỗi tài khoản gửi {Math.ceil(selectedCount / accounts.length)} email (Round-Robin).
                    </p>
                  )}
                </>
              )}
              {channel === "zalo" && (
                <p style={{ margin: 0, fontWeight: 700 }}>
                  Sẽ gửi {selectedCount} tin nhắn thông báo nội bộ qua Zalo OA cho cán bộ (yêu cầu cán bộ đã quan tâm Zalo OA).
                </p>
              )}
              {channel === "both" && (
                <>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                    Sẽ gửi đồng thời {selectedCount} email (qua Gmail Pool) & tin nhắn Zalo OA cho cán bộ.
                  </p>
                  {accounts.length > 0 && (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Gmail: mỗi tài khoản gửi khoảng {Math.ceil(selectedCount / accounts.length)} email.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <button
            onClick={startSend}
            disabled={!canSend}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", height: "42px", fontSize: "0.95rem" }}
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý {prog.sent}/{prog.total}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Bắt đầu gửi thông báo nội bộ ({channel === "email" ? "Gmail" : channel === "zalo" ? "Zalo" : "Gmail & Zalo"})
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── PROGRESS & RESULTS ── */}
      {(isSending || isDone) && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: "16px" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isDone ? <CheckCircle className="w-5 h-5 text-success" /> : <Loader2 className="w-5 h-5 text-primary animate-spin" />}
              <span>{isDone ? "Hoàn tất chiến dịch!" : `Đang tiến hành gửi... ${pct}%`}</span>
            </div>
            {!isDone && isSending && (
              <button
                onClick={() => abortControllerRef.current?.abort()}
                className="btn btn-danger btn-sm"
              >
                Dừng gửi
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div style={{ width: "100%", background: "var(--border)", height: "8px", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, background: "var(--primary)", height: "100%", transition: "width 0.3s ease" }}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px", textAlign: "center" }}>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text)" }}>{prog.sent}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Đã xử lý</p>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--success)" }}>{prog.success}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "#166534", fontWeight: 600 }}>Thành công</p>
              </div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--danger)" }}>{prog.failed}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "#991b1b", fontWeight: 600 }}>Thất bại</p>
              </div>
            </div>

            <div
              ref={resultsRef}
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--bg)"
              }}
            >
              {prog.results.map((r, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  fontSize: "0.75rem",
                  borderBottom: "1px solid var(--border)",
                  background: r.status === "success" ? "white" : "#fff5f5"
                }}>
                  {r.status === "success" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{r.tenNhanVien}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "6px", fontFamily: "monospace", fontSize: "0.7rem" }}>{r.email}</span>
                    {r.status === "error" && <p style={{ margin: "2px 0 0 0", color: "var(--danger)", fontSize: "0.65rem" }}>{r.error}</p>}
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-light)", fontFamily: "monospace" }}>{r.sentVia}</span>
                </div>
              ))}
            </div>

            {isDone && (
              <div style={{
                background: prog.failed > 0 ? "#fffbeb" : "#f0fdf4",
                border: `1px solid ${prog.failed > 0 ? "#fde68a" : "#bbf7d0"}`,
                color: prog.failed > 0 ? "#78350f" : "#166534",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                {prog.failed > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Có {prog.failed} email gửi thất bại. Vui lòng rà soát lại thông tin email của nhân viên.</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Hoàn tất! Tất cả {prog.success} email thông báo nội bộ đã gửi thành công! 🎉</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewRecord && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "var(--radius-xl)",
            width: "100%",
            maxWidth: "720px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)"
            }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail className="w-4 h-4 text-primary" /> Xem trước thông báo nội bộ: {previewRecord.tenNhanVien}
              </h3>
              <button
                onClick={() => setPreviewRecord(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px", minWidth: "auto", borderRadius: "50%" }}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: "auto",
              background: "#f1f5f9",
              padding: "20px"
            }}>
              <div
                style={{
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "24px",
                  boxShadow: "var(--shadow-sm)"
                }}
                dangerouslySetInnerHTML={{
                  __html: generateSalaryEmail(previewRecord, { quarterTitle: subject, customMessage }),
                }}
              />
            </div>
            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg)",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setPreviewRecord(null)}
                className="btn btn-outline btn-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 2: CUSTOM DYNAMIC EXCEL TAB
// ==========================================
function CustomSalaryTab({ accounts, batchSize, delayMs, followers }) {
  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [isSubHeader, setIsSubHeader] = useState(false);
  const [headers, setHeaders] = useState([]);

  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview/Send
  const [columnMapping, setColumnMapping] = useState({
    nameCol: "",
    emailCol: "",
    phoneCol: "",
    displayCols: [],
    totalCol: "",
  });

  const [records, setRecords] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("Thông báo chi trả thu nhập - CDC Đà Nẵng");
  const [customMessage, setCustomMessage] = useState("");
  const [footerNote, setFooterNote] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState({ sent: 0, total: 0, success: 0, failed: 0, results: [] });
  const [previewRecord, setPreviewRecord] = useState(null);

  const handleLinkZalo = async (recordId, zaloUserId, record) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, zaloUserId } : r))
    );
    if (zaloUserId && record) {
      let rawPhone = "";
      if (columnMapping && columnMapping.phoneCol) {
        rawPhone = record.data?.[columnMapping.phoneCol] || record[columnMapping.phoneCol] || "";
      }
      if (!rawPhone && record.phone) {
        rawPhone = record.phone;
      }
      const phoneVal = cleanPhone(rawPhone);
      if (phoneVal) {
        try {
          await fetch("/api/followers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zaloUserId, phone: phoneVal })
          });
          console.log(`Saved phone ${phoneVal} for Zalo User ID ${zaloUserId}`);
        } catch (err) {
          console.error("Failed to save follower phone link:", err);
        }
      }
    }
  };

  const processFile = useCallback(async (file, sheetName = "") => {
    setParseError("");
    setParsing(true);
    setExcelFile(file);
    setStep(1);
    setRecords([]);
    setFileName(file.name);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const b64 = e.target.result.split(",")[1];
        setFileBase64(b64);

        const fd = new FormData();
        fd.append("file", file);
        if (sheetName) fd.append("sheetName", sheetName);
        const res = await fetch("/api/salary-email/preview-excel", { method: "POST", body: fd });
        const json = await res.json();
        if (json.error) {
          setParseError(json.error);
        } else {
          setSheets(json.sheets || []);
          setSelectedSheet(json.selectedSheet || "");
          setHeaders(json.headers);
          setHeaderRowIndex(json.headerRowIndex);
          setIsSubHeader(json.isSubHeader || false);

          const lowerHeaders = json.headers.map((h) => h.toLowerCase());
          const guessName =
            json.headers[lowerHeaders.findIndex((h) => h.includes("họ và tên") || h.includes("tên nhân viên") || h.includes("ho ten"))] ||
            "";
          const guessEmail = json.headers[lowerHeaders.findIndex((h) => h.includes("mail") || h.includes("email"))] || "";
          const guessPhone = json.headers[lowerHeaders.findIndex((h) => h.includes("sđt") || h.includes("sdt") || h.includes("điện thoại") || h.includes("phone"))] || "";
          const guessZaloId = json.headers[lowerHeaders.findIndex((h) => h.includes("zalo id") || h.includes("zalo_id") || h.includes("zaloid") || h.includes("zalo userid") || h.includes("zalo user id"))] || "";
          const guessTotal = json.headers[lowerHeaders.findIndex((h) => h.includes("tổng cộng") || h.includes("thành tiền") || h.includes("cong"))] || "";

          setColumnMapping({
            nameCol: guessName,
            emailCol: guessEmail,
            phoneCol: guessPhone,
            zaloIdCol: guessZaloId,
            totalCol: guessTotal,
            displayCols: [],
          });
          setStep(2);
        }
        setParsing(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setParseError("Lỗi đọc file: " + e.message);
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const loadData = async () => {
    if (!columnMapping.nameCol) {
      setParseError("Vui lòng chọn cột Họ tên nhân viên.");
      return;
    }
    if (channel !== "zalo" && !columnMapping.emailCol) {
      setParseError("Vui lòng chọn cột Email nhân viên (bắt buộc khi gửi qua kênh Email).");
      return;
    }
    if (channel === "zalo" && !columnMapping.phoneCol && !columnMapping.zaloIdCol) {
      setParseError("Vui lòng chọn ít nhất cột Số điện thoại hoặc Zalo ID để làm tiêu chí đối chiếu Zalo.");
      return;
    }
    if (channel === "both" && !columnMapping.emailCol && !columnMapping.phoneCol && !columnMapping.zaloIdCol) {
      setParseError("Vui lòng chọn cột Email và ít nhất một cột liên hệ Zalo (SĐT hoặc Zalo ID) khi gửi cả hai kênh.");
      return;
    }
    setParsing(true);
    setParseError("");
    try {
      const res = await fetch("/api/salary-email/send-custom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, headerRowIndex, isSubHeader, columnMapping, sheetName: selectedSheet }),
      });
      const json = await res.json();
      if (json.records) {
        setRecords(
          json.records.map((r) => {
            // Tự động đối chiếu Zalo Follower
            let matchedFollower = null;
            if (followers && followers.length > 0) {
              if (columnMapping.zaloIdCol && r[columnMapping.zaloIdCol]) {
                const cleanId = String(r[columnMapping.zaloIdCol]).trim();
                if (cleanId) matchedFollower = followers.find(f => f.zaloUserId === cleanId);
              }
              if (!matchedFollower && columnMapping.phoneCol && r[columnMapping.phoneCol]) {
                const cleanedR = cleanPhone(r[columnMapping.phoneCol]);
                if (cleanedR) matchedFollower = followers.find(f => f.phone && cleanPhone(f.phone) === cleanedR);
              }
              if (!matchedFollower) {
                const nameVal = r[columnMapping.nameCol];
                if (nameVal) {
                  const normR = normalizeName(nameVal);
                  if (normR) {
                    // Ưu tiên tìm trong staffLink (tên thật đã đăng ký)
                    matchedFollower = followers.find(f => 
                      f.staffLink && 
                      (normalizeName(f.staffLink.staffNameRaw) === normR || 
                       normalizeName(f.staffLink.staffName) === normR)
                    );
                    // Nếu không thấy, tìm theo displayName (tên hiển thị Zalo)
                    if (!matchedFollower) {
                      matchedFollower = followers.find(f => normalizeName(f.displayName) === normR);
                    }
                  }
                }
              }
            }

            return {
              ...r,
              id: crypto.randomUUID(),
              selected: true,
              status: "idle",
              zaloUserId: matchedFollower ? matchedFollower.zaloUserId : "",
            };
          })
        );
        setStep(3);
      } else {
        setParseError("Không thể tải thông tin dòng Excel.");
      }
    } catch (e) {
      setParseError("Lỗi máy chủ: " + e.message);
    } finally {
      setParsing(false);
    }
  };

  const toggleDisplayCol = (header, checked) => {
    setColumnMapping((prev) => {
      let newCols = [...prev.displayCols];
      if (checked) {
        if (!newCols.find((c) => c.key === header)) newCols.push({ key: header, label: header });
      } else {
        newCols = newCols.filter((c) => c.key !== header);
      }
      return { ...prev, displayCols: newCols };
    });
  };

  const startSend = async () => {
    const selected = records.filter((r) => r.selected && r.status !== "success");
    if (!selected.length || (channel !== "zalo" && !accounts.length) || isSending) return;
    setIsSending(true);
    setIsDone(false);
    setProg({ sent: 0, total: selected.length, success: 0, failed: 0, results: [] });

    setRecords((prev) =>
      prev.map((r) =>
        selected.some((s) => s.id === r.id) ? { ...r, status: "idle", error: undefined } : r
      )
    );

    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const emailTitle = subject || "Thông thông báo nội bộ - CDC Đà Nẵng";
      const res = await fetch("/api/salary-email/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          fileBase64,
          fileName,
          headerRowIndex,
          isSubHeader,
          columnMapping,
          records: selected,
          accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject: emailTitle,
          emailTitle,
          batchSize,
          batchDelayMs: delayMs,
          customMessage,
          footerNote,
          channel,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Lỗi hệ thống khi gửi email.");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r = ev.result;
            setRecords((prev) =>
              prev.map((rec) =>
                rec.email === r.email && rec.tenNhanVien === r.tenNhanVien
                  ? { ...rec, status: r.status, error: r.error }
                  : rec
              )
            );
            setProg((p) => ({
              sent: ev.index,
              total: ev.total,
              success: p.success + (r.status === "success" ? 1 : 0),
              failed: p.failed + (r.status === "error" ? 1 : 0),
              results: [...p.results, r],
            }));
            setTimeout(() => {
              if (resultsRef.current) {
                resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
              }
            }, 50);
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("Đã dừng gửi");
        setRecords((prev) =>
          prev.map((r) =>
            r.status === "idle" && selected.some((s) => s.id === r.id)
              ? { ...r, status: "idle" }
              : r
          )
        );
      } else {
        console.error(e);
        setParseError("Lỗi kết nối: " + e.message);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;
  const filteredRecords = records.filter((r) => {
    if (searchQuery && !r.tenNhanVien.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "selected") return r.selected;
    if (filterStatus === "success") return r.status === "success";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const pageRows = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedCount = records.filter((r) => r.selected && r.status !== "success").length;
  const canSend = selectedCount > 0 && (channel === "zalo" || accounts.length > 0) && !isSending;

  return (
    <div className="space-y-6">
      {/* ── STEP 1: UPLOAD & MAP ── */}
      {step < 3 && (
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ display: "flex", alignItems: "center", justifyCenter: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</span>
              <span>Tải &amp; Khớp Cột (Excel Tùy Chọn)</span>
            </div>
          </div>
          <div>
            {step === 1 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDrag(true);
                }}
                onDragLeave={() => setIsDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${isDrag ? "var(--primary)" : "var(--border)"}`,
                  background: isDrag ? "var(--primary-light)" : "var(--bg)",
                  borderRadius: "var(--radius-lg)",
                  padding: "32px 20px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                  }}
                />
                {parsing ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Đang nạp file Excel...</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>Kéo thả hoặc click để đọc Excel cấu trúc bất kỳ</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Hỗ trợ: .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6" style={{ animation: "fadeIn 0.3s ease" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Đang xử lý:</span>
                    <span className="badge badge-info">{fileName}</span>
                    {sheets.length > 1 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Sheet:</span>
                        <select
                          value={selectedSheet}
                          onChange={(e) => {
                            const nextSheet = e.target.value;
                            if (excelFile) processFile(excelFile, nextSheet);
                          }}
                          className="form-select"
                          style={{
                            padding: "2px 8px",
                            fontSize: "0.72rem",
                            height: "26px",
                            width: "auto",
                            minWidth: "110px",
                            borderRadius: "6px",
                            border: "1px solid var(--primary)",
                            color: "var(--primary)",
                            fontWeight: 600,
                            background: "var(--primary-light)"
                          }}
                        >
                          {sheets.map((sh) => (
                            <option key={sh} value={sh}>{sh}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Đổi file khác
                  </button>
                </div>

                {/* Settings index header */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", background: "var(--bg)", padding: "12px", borderRadius: "var(--radius)" }}>
                  <div className="form-group" style={{ flex: "1 1 200px", margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Hàng tiêu đề (0-indexed)</label>
                    <input
                      type="number"
                      value={headerRowIndex}
                      onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
                      className="form-input"
                      style={{ height: "34px", padding: "4px 8px" }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px" }}>
                    <input
                      type="checkbox"
                      id="isSubHeader"
                      checked={isSubHeader}
                      onChange={(e) => setIsSubHeader(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label htmlFor="isSubHeader" className="form-label" style={{ margin: 0, fontSize: "0.75rem", cursor: "pointer" }}>
                      Có hàng tiêu đề phụ (Merge 2 hàng đầu)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ fontSize: "0.8rem" }}>
                  {/* Left: compulsory columns */}
                  <div className="space-y-4">
                    <h3 style={{ margin: "0 0 10px 0", fontWeight: 700, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>1. Thiết lập cột cơ bản</h3>
                    
                    {/* Chọn kênh gửi ngay tại Bước 2 */}
                    <div className="form-group" style={{ marginBottom: "16px", padding: "10px", background: "var(--primary-light)", borderRadius: "6px", border: "1px solid var(--border-focus)" }}>
                      <label className="form-label" style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.78rem" }}>🎯 LỰA CHỌN KÊNH GỬI TRƯỚC:</label>
                      <div style={{ display: "flex", gap: "14px", marginTop: "6px", flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>
                          <input 
                            type="radio" 
                            name="channel-custom-step2" 
                            value="email" 
                            checked={channel === "email"} 
                            onChange={() => setChannel("email")} 
                            style={{ cursor: "pointer" }}
                          />
                          📧 Chỉ gửi Gmail
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>
                          <input 
                            type="radio" 
                            name="channel-custom-step2" 
                            value="zalo" 
                            checked={channel === "zalo"} 
                            onChange={() => setChannel("zalo")} 
                            style={{ cursor: "pointer" }}
                          />
                          💬 Chỉ gửi Zalo OA
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}>
                          <input 
                            type="radio" 
                            name="channel-custom-step2" 
                            value="both" 
                            checked={channel === "both"} 
                            onChange={() => setChannel("both")} 
                            style={{ cursor: "pointer" }}
                          />
                          🔄 Gửi cả hai kênh
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cột Tên nhân viên <span style={{ color: "var(--danger)" }}>*</span></label>
                      <select
                        value={columnMapping.nameCol}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, nameCol: e.target.value }))}
                        className="form-select"
                      >
                        <option value="">-- Chọn cột chứa Họ tên --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Cột Email nhân viên 
                        {channel === "zalo" ? (
                          <span style={{ color: "var(--text-light)", fontWeight: 400, marginLeft: "4px" }}>(Không bắt buộc vì chỉ gửi Zalo)</span>
                        ) : (
                          <span style={{ color: "var(--danger)", marginLeft: "4px" }}>* (Bắt buộc gửi Email)</span>
                        )}
                      </label>
                      <select
                        value={columnMapping.emailCol}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, emailCol: e.target.value }))}
                        className="form-select"
                      >
                        <option value="">-- Chọn cột chứa Email --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Cột Số điện thoại 
                        {channel === "zalo" ? (
                          <span style={{ color: "var(--danger)", marginLeft: "4px" }}>* (Nên chọn để đối chiếu Zalo)</span>
                        ) : (
                          <span style={{ color: "var(--text-light)", fontWeight: 400, marginLeft: "4px" }}>(Tùy chọn)</span>
                        )}
                      </label>
                      <select
                        value={columnMapping.phoneCol || ""}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, phoneCol: e.target.value }))}
                        className="form-select"
                      >
                        <option value="">-- Không sử dụng --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cột Zalo ID <span style={{ color: "var(--text-light)", fontWeight: 400 }}>(Tùy chọn, đối chiếu Zalo trực tiếp)</span></label>
                      <select
                        value={columnMapping.zaloIdCol || ""}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, zaloIdCol: e.target.value }))}
                        className="form-select"
                      >
                        <option value="">-- Không sử dụng --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cột Tổng thu nhập <span style={{ color: "var(--text-light)", fontWeight: 400 }}>(Tùy chọn, sẽ tô đậm vàng ở chân bảng)</span></label>
                      <select
                        value={columnMapping.totalCol}
                        onChange={(e) => setColumnMapping((p) => ({ ...p, totalCol: e.target.value }))}
                        className="form-select"
                      >
                        <option value="">-- Không sử dụng --</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right: show columns options list */}
                  <div className="space-y-4">
                    <h3 style={{ margin: "0 0 10px 0", fontWeight: 700, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>2. Chọn các cột hiển thị trong Email</h3>
                    <div style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: "12px",
                      maxHeight: "220px",
                      overflowY: "auto"
                    }} className="space-y-3">
                      {(() => {
                        const validHeaders = headers.filter((h) => h !== columnMapping.nameCol && h !== columnMapping.emailCol);
                        if (validHeaders.length === 0) return <p style={{ textAlign: "center", color: "var(--text-muted)", margin: "20px 0" }}>Vui lòng chọn cột Họ tên và Email trước.</p>;

                        const grouped = validHeaders.reduce((acc, h) => {
                          const parts = h.split(" - ");
                          const group = parts.length > 1 ? parts[0] : "Thông tin chi tiết";
                          const sub = parts.length > 1 ? parts.slice(1).join(" - ") : h;
                          if (!acc[group]) acc[group] = [];
                          acc[group].push({ full: h, sub });
                          return acc;
                        }, {});

                        return Object.entries(grouped).map(([group, cols]) => (
                          <div key={group} style={{ marginBottom: "8px" }}>
                            <p style={{ margin: "0 0 4px 0", fontWeight: 700, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", textTransform: "uppercase" }}>{group}</p>
                            <div className="space-y-1" style={{ paddingLeft: "4px" }}>
                              {cols.map((c) => {
                                const isChecked = !!columnMapping.displayCols.find((x) => x.key === c.full);
                                return (
                                  <label key={c.full} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "3px", borderRadius: "4px" }} className="hover:bg-slate-200/50">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => toggleDisplayCol(c.full, e.target.checked)}
                                      style={{ cursor: "pointer" }}
                                    />
                                    <span style={{ fontSize: "0.75rem", color: "var(--text)" }}>{c.sub}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {parseError && (
                  <div style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "var(--danger)",
                    borderRadius: "var(--radius)",
                    padding: "12px",
                    fontSize: "0.8rem"
                  }}>
                    {parseError}
                  </div>
                )}

                <button
                  onClick={loadData}
                  disabled={parsing || !columnMapping.nameCol || (!columnMapping.emailCol && !columnMapping.phoneCol && !columnMapping.zaloIdCol)}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", height: "40px" }}
                >
                  {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                  Khớp tiêu chí &amp; Đọc dòng dữ liệu
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW & SEND ── */}
      {step === 3 && (
        <div className="space-y-6" style={{ animation: "fadeIn 0.3s ease" }}>
          <div className="card">
            <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div className="card-title" style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", justifyCenter: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</span>
                  <span>Danh Sách Nhân Viên Từ Excel</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setStep(2)}
                    className="btn btn-outline btn-sm"
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Chỉnh lại cột
                  </button>
                  <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm">
                    Đổi file
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="badge badge-approved">
                    <Users className="w-3.5 h-3.5" style={{ marginRight: "4px" }} /> {records.length} Nhân sự
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
                </div>
                <div style={{ display: "flex", gap: "4px", background: "var(--bg)", padding: "4px", borderRadius: "var(--radius)" }}>
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "selected", label: `Đã chọn (${records.filter(r => r.selected).length})` },
                    { id: "error", label: `Lỗi (${records.filter(r => r.status === "error").length})` },
                    { id: "success", label: "Thành công" }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setFilterStatus(st.id);
                        setPage(0);
                      }}
                      className="btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        background: filterStatus === st.id ? "white" : "transparent",
                        border: "none",
                        boxShadow: filterStatus === st.id ? "var(--shadow-sm)" : "none",
                        color: filterStatus === st.id ? "var(--primary)" : "var(--text-muted)",
                        borderRadius: "4px"
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: "relative", marginBottom: "12px" }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Tìm nhân viên..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  style={{ width: "100%", paddingLeft: "38px" }}
                />
              </div>

              {/* Records preview table */}
              <div className="table-wrapper" style={{ minHeight: "350px", overflowX: "auto", maxWidth: "100vw" }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "45px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={records.length > 0 && records.every((r) => r.selected)}
                          onChange={(e) => setRecords((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th>Nhân viên</th>
                      <th>Email nhận</th>
                      <th>Liên kết Zalo</th>
                      {columnMapping.totalCol && <th style={{ textAlign: "right" }}>{columnMapping.totalCol}</th>}
                      <th style={{ textAlign: "center" }}>Trạng thái</th>
                      <th style={{ textAlign: "center" }}>Xem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} style={{
                        background: r.status === "success" ? "#f0fdf4" : r.status === "error" ? "#fef2f2" : "inherit"
                      }}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={(e) =>
                              setRecords((prev) => prev.map((rec) => (rec.id === r.id ? { ...rec, selected: e.target.checked } : rec)))
                            }
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{r.tenNhanVien}</td>
                        <td style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.email}</td>
                        <td>
                          <ZaloLinkSelect
                            value={r.zaloUserId || ""}
                            followers={followers}
                            onChange={(val) => handleLinkZalo(r.id, val, r)}
                          />
                        </td>
                        {columnMapping.totalCol && <td style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>{fmt(r.data[columnMapping.totalCol])}</td>}
                        <td style={{ textAlign: "center" }}>
                          {r.status === "success" && <span className="badge badge-approved">Đã gửi</span>}
                          {r.status === "error" && <span className="badge badge-cancelled" title={r.error}>Lỗi</span>}
                          {r.status === "idle" && <span style={{ color: "var(--text-light)" }}>—</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px", minWidth: "auto" }}
                            onClick={() => setPreviewRecord(r)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                          Không có kết quả.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Trang {page + 1} / {totalPages}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="w-4 h-4" /> Trước
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                    >
                      Sau <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "flex", alignItems: "center", justifyCenter: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>3</span>
                <span>Cấu hình gửi thông báo tùy biến (Email & Zalo OA)</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Kênh gửi thông báo</label>
                <div style={{ display: "flex", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                    <input 
                      type="radio" 
                      name="channel-custom" 
                      value="email" 
                      checked={channel === "email"} 
                      onChange={() => setChannel("email")} 
                      style={{ cursor: "pointer" }}
                    />
                    📧 Chỉ gửi Gmail
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                    <input 
                      type="radio" 
                      name="channel-custom" 
                      value="zalo" 
                      checked={channel === "zalo"} 
                      onChange={() => setChannel("zalo")} 
                      style={{ cursor: "pointer" }}
                    />
                    💬 Chỉ gửi Zalo OA
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                    <input 
                      type="radio" 
                      name="channel-custom" 
                      value="both" 
                      checked={channel === "both"} 
                      onChange={() => setChannel("both")} 
                      style={{ cursor: "pointer" }}
                    />
                    🔄 Gửi cả hai kênh
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu đề gửi đi (Subject / Tiêu đề Zalo)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="form-input"
                  placeholder="Nhập tiêu đề thư..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Lời nhắn đầu thông báo (Tùy chọn)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="form-textarea"
                  placeholder="Kính gửi ông/bà... Dưới đây là thông tin chi tiết..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú chân thông báo (Footer note - Tùy chọn)</label>
                <textarea
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  className="form-textarea"
                  placeholder="Mọi thắc mắc xin phản hồi... Trân trọng."
                />
              </div>

              {records.length > 0 && (
                <div style={{
                  background: "var(--primary-light)",
                  border: "1px solid var(--border-focus)",
                  color: "var(--primary)",
                  borderRadius: "var(--radius)",
                  padding: "12px",
                  fontSize: "0.8rem",
                  lineHeight: "1.5"
                }}>
                  {channel === "email" && (
                    <>
                      <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                        Sẽ gửi {selectedCount} email tùy biến thông qua {accounts.length} tài khoản Gmail.
                      </p>
                      {accounts.length > 0 && (
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Trung bình mỗi tài khoản gửi {Math.ceil(selectedCount / accounts.length)} email (Round-Robin).
                        </p>
                      )}
                    </>
                  )}
                  {channel === "zalo" && (
                    <p style={{ margin: 0, fontWeight: 700 }}>
                      Sẽ gửi {selectedCount} tin nhắn Zalo OA tùy biến cho cán bộ (yêu cầu cán bộ đã quan tâm Zalo OA).
                    </p>
                  )}
                  {channel === "both" && (
                    <>
                      <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                        Sẽ gửi đồng thời {selectedCount} email tùy biến (qua Gmail Pool) & tin nhắn Zalo OA cho cán bộ.
                      </p>
                      {accounts.length > 0 && (
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Gmail: mỗi tài khoản gửi khoảng {Math.ceil(selectedCount / accounts.length)} email.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <button
                onClick={startSend}
                disabled={!canSend}
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", height: "42px" }}
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý {prog.sent}/{prog.total}...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Bắt đầu gửi ({channel === "email" ? "Gmail" : channel === "zalo" ? "Zalo" : "Gmail & Zalo"})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROGRESS & RESULTS ── */}
      {(isSending || isDone) && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: "16px" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isDone ? <CheckCircle className="w-5 h-5 text-success" /> : <Loader2 className="w-5 h-5 text-primary animate-spin" />}
              <span>{isDone ? "Hoàn tất!" : `Đang tiến hành... ${pct}%`}</span>
            </div>
            {!isDone && isSending && (
              <button
                onClick={() => abortControllerRef.current?.abort()}
                className="btn btn-danger btn-sm"
              >
                Dừng
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div style={{ width: "100%", background: "var(--border)", height: "8px", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, background: "var(--primary)", height: "100%", transition: "width 0.3s ease" }}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px", textAlign: "center" }}>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text)" }}>{prog.sent}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Đã gửi</p>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--success)" }}>{prog.success}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "#166534", fontWeight: 600 }}>Thành công</p>
              </div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--danger)" }}>{prog.failed}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "#991b1b", fontWeight: 600 }}>Thất bại</p>
              </div>
            </div>

            <div
              ref={resultsRef}
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--bg)"
              }}
            >
              {prog.results.map((r, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  fontSize: "0.75rem",
                  borderBottom: "1px solid var(--border)",
                  background: r.status === "success" ? "white" : "#fff5f5"
                }}>
                  {r.status === "success" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{r.tenNhanVien}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "6px", fontFamily: "monospace", fontSize: "0.7rem" }}>{r.email}</span>
                    {r.status === "error" && <p style={{ margin: "2px 0 0 0", color: "var(--danger)", fontSize: "0.65rem" }}>{r.error}</p>}
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-light)", fontFamily: "monospace" }}>{r.sentVia}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewRecord && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "var(--radius-xl)",
            width: "100%",
            maxWidth: "720px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)"
            }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail className="w-4 h-4 text-primary" /> Xem trước email: {previewRecord.tenNhanVien}
              </h3>
              <button
                onClick={() => setPreviewRecord(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px", minWidth: "auto", borderRadius: "50%" }}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: "auto",
              background: "#f1f5f9",
              padding: "20px"
            }}>
              <div
                style={{
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "24px",
                  boxShadow: "var(--shadow-sm)"
                }}
                dangerouslySetInnerHTML={{
                  __html: generateCustomEmail(previewRecord, {
                    emailTitle: subject || "Thông thông báo nội bộ - CDC Đà Nẵng",
                    customMessage,
                    footerNote,
                    columnMapping,
                  }),
                }}
              />
            </div>
            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg)",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setPreviewRecord(null)}
                className="btn btn-outline btn-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT 3: THUẾ TNCN TAB
// ==========================================
function TaxTab({ accounts, batchSize, delayMs, followers }) {
  const fileRef = useRef(null);
  const resultsRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [thang, setThang] = useState("");
  const [fileName, setFileName] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isDrag, setIsDrag] = useState(false);

  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [channel, setChannel] = useState("email");
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [showKhoanDetail, setShowKhoanDetail] = useState(true);

  const [isSending, setIsSending] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prog, setProg] = useState({ sent: 0, total: 0, success: 0, failed: 0, results: [] });
  const [previewRecord, setPreviewRecord] = useState(null);

  const handleLinkZalo = async (recordId, zaloUserId, record) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, zaloUserId } : r))
    );
    if (zaloUserId && record) {
      const rawPhone = record.phone || record.sdt;
      const phoneVal = cleanPhone(rawPhone);
      if (phoneVal) {
        try {
          await fetch("/api/followers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ zaloUserId, phone: phoneVal })
          });
          console.log(`Saved phone ${phoneVal} for Zalo User ID ${zaloUserId}`);
        } catch (err) {
          console.error("Failed to save follower phone link:", err);
        }
      }
    }
  };

  const processFile = useCallback(async (file, sheetName = "") => {
    setParseError("");
    setParsing(true);
    setRecords([]);
    setFileName(file.name);
    setExcelFile(file);
    setPage(0);
    setThang("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (sheetName) fd.append("sheetName", sheetName);
      const res = await fetch("/api/salary-email/parse-tax-excel", { method: "POST", body: fd });
      const json = await res.json();
      if (json.error) {
        setParseError(json.error);
        return;
      }
      if (json.records) {
        setSheets(json.sheets || []);
        setSelectedSheet(json.selectedSheet || "");
        const withTax = json.records.filter((r) => r.thueTNCN > 0);
        setRecords(
          withTax.map((r) => {
            // Tự động đối chiếu Zalo Follower
            let matchedFollower = null;
            if (followers && followers.length > 0) {
              const excelZaloId = r.zaloUserId || r.zaloId || r.idZalo || r.zalo;
              if (excelZaloId) {
                const cleanId = String(excelZaloId).trim();
                if (cleanId) matchedFollower = followers.find(f => f.zaloUserId === cleanId);
              }
              if (!matchedFollower && (r.phone || r.sdt)) {
                const cleanedR = cleanPhone(r.phone || r.sdt);
                if (cleanedR) matchedFollower = followers.find(f => f.phone && cleanPhone(f.phone) === cleanedR);
              }
              if (!matchedFollower) {
                const normR = normalizeName(r.tenNhanVien);
                if (normR) {
                  // Ưu tiên tìm trong staffLink (tên thật đã đăng ký)
                  matchedFollower = followers.find(f => 
                    f.staffLink && 
                    (normalizeName(f.staffLink.staffNameRaw) === normR || 
                     normalizeName(f.staffLink.staffName) === normR)
                  );
                  // Nếu không thấy, tìm theo displayName (tên hiển thị Zalo)
                  if (!matchedFollower) {
                    matchedFollower = followers.find(f => normalizeName(f.displayName) === normR);
                  }
                }
              }
            }

            return {
              ...r,
              id: crypto.randomUUID(),
              selected: true,
              status: "idle",
              zaloUserId: matchedFollower ? matchedFollower.zaloUserId : "",
            };
          })
        );
        setThang(json.thang || "");
        if (json.records.length !== withTax.length) {
          const skipped = json.records.length - withTax.length;
          setParseError(`ℹ️ Đã tự động bỏ qua ${skipped} nhân viên không có thông tin nội bộ khác.`);
        }
      }
    } catch (e) {
      setParseError("Không thể kết nối hoặc phân tích file cập nhật khác: " + e.message);
    } finally {
      setParsing(false);
    }
  }, [followers]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDrag(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const startSend = async () => {
    const selected = records.filter((r) => r.selected && r.status !== "success");
    if (!selected.length || (channel !== "zalo" && !accounts.length) || isSending) return;
    setIsSending(true);
    setIsDone(false);
    setProg({ sent: 0, total: selected.length, success: 0, failed: 0, results: [] });
    setRecords((prev) =>
      prev.map((r) =>
        selected.some((s) => s.id === r.id) ? { ...r, status: "idle", error: undefined } : r
      )
    );

    const ac = new AbortController();
    abortControllerRef.current = ac;

    try {
      const emailTitle = subject || `Thông báo Thông tin nội bộ khác tháng ${thang} - CDC Đà Nẵng`;
      const res = await fetch("/api/salary-email/send-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          records: selected,
          accounts: accounts.map(({ id, user, appPassword }) => ({ id, user, appPassword })),
          subject: emailTitle,
          batchSize,
          batchDelayMs: delayMs,
          customMessage,
          showKhoanDetail,
          channel,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Lỗi hệ thống khi gửi.");
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "progress") {
            const r = ev.result;
            setRecords((prev) =>
              prev.map((rec) =>
                rec.email === r.email && rec.tenNhanVien === r.tenNhanVien
                  ? { ...rec, status: r.status, error: r.error }
                  : rec
              )
            );
            setProg((p) => ({
              sent: ev.index,
              total: ev.total,
              success: p.success + (r.status === "success" ? 1 : 0),
              failed: p.failed + (r.status === "error" ? 1 : 0),
              results: [...p.results, r],
            }));
            setTimeout(() => {
              if (resultsRef.current) {
                resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
              }
            }, 50);
          }
          if (ev.type === "done") setIsDone(true);
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        console.log("Đã dừng gửi");
        setRecords((prev) =>
          prev.map((r) =>
            r.status === "idle" && selected.some((s) => s.id === r.id)
              ? { ...r, status: "idle" }
              : r
          )
        );
      } else {
        console.error(e);
        setParseError("Lỗi kết nối: " + e.message);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
    }
  };

  const pct = prog.total ? Math.round((prog.sent / prog.total) * 100) : 0;
  const filteredRecords = records.filter((r) => {
    if (searchQuery && !r.tenNhanVien.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus === "selected") return r.selected;
    if (filterStatus === "success") return r.status === "success";
    if (filterStatus === "error") return r.status === "error";
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const pageRows = filteredRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedCount = records.filter((r) => r.selected && r.status !== "success").length;
  const canSend = selectedCount > 0 && (channel === "zalo" || accounts.length > 0) && !isSending;

  return (
    <div className="space-y-6">
      {/* ── STEP 1: UPLOAD ── */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", justifyCenter: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>1</span>
            <span>Tải file Excel Thông tin nội bộ khác</span>
          </div>
        </div>
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDrag(true);
            }}
            onDragLeave={() => setIsDrag(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${isDrag ? "var(--primary)" : "var(--border)"}`,
              background: isDrag ? "var(--primary-light)" : "var(--bg)",
              borderRadius: "var(--radius-lg)",
              padding: "32px 20px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />
            {parsing ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Đang phân tích file...</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" }}>
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>Kéo thả hoặc nhấn để chọn file Thông tin nội bộ khác</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Hỗ trợ: .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>

          {parseError && (
            <div style={{
              background: parseError.startsWith("ℹ️") ? "var(--primary-light)" : "#fef2f2",
              border: `1px solid ${parseError.startsWith("ℹ️") ? "var(--border-focus)" : "#fecaca"}`,
              color: parseError.startsWith("ℹ️") ? "var(--primary)" : "var(--danger)",
              borderRadius: "var(--radius)",
              padding: "12px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px"
            }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {records.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                  <span className="badge badge-info" style={{ gap: "4px" }}>
                    <Users className="w-3.5 h-3.5" /> {records.length} Nhân viên phát sinh cập nhật khác
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
                  {thang && <span className="badge badge-approved">Tháng {thang}</span>}
                  {sheets.length > 1 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "10px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Sheet:</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => {
                          const nextSheet = e.target.value;
                          if (excelFile) processFile(excelFile, nextSheet);
                        }}
                        className="form-select"
                        style={{
                          padding: "2px 8px",
                          fontSize: "0.72rem",
                          height: "26px",
                          width: "auto",
                          minWidth: "110px",
                          borderRadius: "6px",
                          border: "1px solid var(--primary)",
                          color: "var(--primary)",
                          fontWeight: 600,
                          background: "var(--primary-light)"
                        }}
                      >
                        {sheets.map((sh) => (
                          <option key={sh} value={sh}>{sh}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "4px", background: "var(--bg)", padding: "4px", borderRadius: "var(--radius)" }}>
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "selected", label: `Đã chọn (${records.filter(r => r.selected).length})` },
                    { id: "error", label: `Lỗi (${records.filter(r => r.status === "error").length})` },
                    { id: "success", label: "Đã gửi" }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setFilterStatus(st.id);
                        setPage(0);
                      }}
                      className="btn"
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.75rem",
                        background: filterStatus === st.id ? "white" : "transparent",
                        border: "none",
                        boxShadow: filterStatus === st.id ? "var(--shadow-sm)" : "none",
                        color: filterStatus === st.id ? "var(--primary)" : "var(--text-muted)",
                        borderRadius: "4px"
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Tìm kiếm theo tên nhân viên..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                    style={{ width: "100%", paddingLeft: "38px" }}
                  />
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Đổi file
                </button>
              </div>

              {/* Table check list */}
              <div className="table-wrapper" style={{ minHeight: "350px", overflowX: "auto", maxWidth: "100vw" }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "45px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={records.length > 0 && records.every((r) => r.selected)}
                          onChange={(e) => setRecords((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th>Khoa/Phòng</th>
                      <th>Tên nhân viên</th>
                      <th>Email nhận</th>
                      <th>Liên kết Zalo</th>
                      <th style={{ textAlign: "right" }}>Tổng thu nhập</th>
                      <th style={{ textAlign: "right" }}>TNTT</th>
                      <th style={{ textAlign: "right", color: "var(--danger)" }}>Cập nhật khác phải nộp</th>
                      <th style={{ textAlign: "center" }}>TT</th>
                      <th style={{ textAlign: "center" }}>Xem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id} style={{
                        background: r.status === "success" ? "#f0fdf4" : r.status === "error" ? "#fef2f2" : "inherit"
                      }}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={r.selected}
                            onChange={(e) =>
                              setRecords((prev) => prev.map((rec) => (rec.id === r.id ? { ...rec, selected: e.target.checked } : rec)))
                            }
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>{r.phong}</td>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>{r.tenNhanVien}</td>
                        <td style={{ fontFamily: "monospace", color: "var(--text-muted)", fontSize: "0.8rem" }}>{r.email}</td>
                        <td>
                          <ZaloLinkSelect
                            value={r.zaloUserId || ""}
                            followers={followers}
                            onChange={(val) => handleLinkZalo(r.id, val, r)}
                          />
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>{fmt(r.cong)}</td>
                        <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--text-muted)" }}>{fmt(Math.max(0, r.thuNhapTinhThue))}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--danger)" }}>{fmt(r.thueTNCN)}</td>
                        <td style={{ textAlign: "center" }}>
                          {r.status === "success" && <span className="badge badge-approved">Đã gửi</span>}
                          {r.status === "error" && <span className="badge badge-cancelled" title={r.error}>Lỗi</span>}
                          {r.status === "idle" && <span style={{ color: "var(--text-light)" }}>—</span>}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px", minWidth: "auto" }}
                            onClick={() => setPreviewRecord(r)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan="10" style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                          Không có kết quả.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Trang {page + 1} / {totalPages}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="w-4 h-4" /> Trước
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                    >
                      Sau <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 2: SEND CONFIG ── */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "16px" }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ display: "flex", alignItems: "center", justifyCenter: "center", width: "24px", height: "24px", borderRadius: "50%", background: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>2</span>
            <span>Cấu hình &amp; Tiến hành gửi cập nhật khác (Email & Zalo OA)</span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Kênh gửi thông báo</label>
            <div style={{ display: "flex", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                <input 
                  type="radio" 
                  name="channel-tax" 
                  value="email" 
                  checked={channel === "email"} 
                  onChange={() => setChannel("email")} 
                  style={{ cursor: "pointer" }}
                />
                📧 Chỉ gửi Gmail
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                <input 
                  type="radio" 
                  name="channel-tax" 
                  value="zalo" 
                  checked={channel === "zalo"} 
                  onChange={() => setChannel("zalo")} 
                  style={{ cursor: "pointer" }}
                />
                💬 Chỉ gửi Zalo OA
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                <input 
                  type="radio" 
                  name="channel-tax" 
                  value="both" 
                  checked={channel === "both"} 
                  onChange={() => setChannel("both")} 
                  style={{ cursor: "pointer" }}
                />
                🔄 Gửi cả hai kênh
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tiêu đề thông báo (Subject / Tiêu đề Zalo)</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Thông báo Cập nhật khác Thu Nhập Cá Nhân tháng ${thang || "__"} - CDC Đà Nẵng`}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nội dung đính kèm thêm (Tùy chọn)</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="form-textarea"
              placeholder="Nhập nội dung lưu ý thêm..."
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg)", padding: "10px 14px", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
            <input
              type="checkbox"
              id="showKhoanDetail"
              checked={showKhoanDetail}
              onChange={(e) => setShowKhoanDetail(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            <label htmlFor="showKhoanDetail" className="form-label" style={{ margin: 0, fontSize: "0.8rem", cursor: "pointer" }}>
              Hiển thị chi tiết từng khoản thu nhập trong thông báo
            </label>
          </div>

          {records.length > 0 && (
            <div style={{
              background: "var(--primary-light)",
              border: "1px solid var(--border-focus)",
              color: "var(--primary)",
              borderRadius: "var(--radius)",
              padding: "12px",
              fontSize: "0.8rem",
              lineHeight: "1.5"
            }}>
              {channel === "email" && (
                <>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                    Sẽ gửi {selectedCount} email thông tin nội bộ khác thông qua {accounts.length} tài khoản Gmail.
                  </p>
                  {accounts.length > 0 && (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Trung bình mỗi tài khoản gửi {Math.ceil(selectedCount / accounts.length)} email (Round-Robin).
                    </p>
                  )}
                </>
              )}
              {channel === "zalo" && (
                <p style={{ margin: 0, fontWeight: 700 }}>
                  Sẽ gửi {selectedCount} tin nhắn Zalo OA thông tin nội bộ khác cho cán bộ (yêu cầu cán bộ đã quan tâm Zalo OA).
                </p>
              )}
              {channel === "both" && (
                <>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 700 }}>
                    Sẽ gửi đồng thời {selectedCount} email thông tin nội bộ khác (qua Gmail Pool) & tin nhắn Zalo OA cho cán bộ.
                  </p>
                  {accounts.length > 0 && (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Gmail: mỗi tài khoản gửi khoảng {Math.ceil(selectedCount / accounts.length)} email.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <button
            onClick={startSend}
            disabled={!canSend}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", height: "42px" }}
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý {prog.sent}/{prog.total}...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Bắt đầu gửi ({channel === "email" ? "Gmail" : channel === "zalo" ? "Zalo" : "Gmail & Zalo"})
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── PROGRESS & RESULTS ── */}
      {(isSending || isDone) && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: "16px" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isDone ? <CheckCircle className="w-5 h-5 text-success" /> : <Loader2 className="w-5 h-5 text-primary animate-spin" />}
              <span>{isDone ? "Hoàn tất gửi cập nhật khác!" : `Đang tiến hành... ${pct}%`}</span>
            </div>
            {!isDone && isSending && (
              <button
                onClick={() => abortControllerRef.current?.abort()}
                className="btn btn-danger btn-sm"
              >
                Dừng
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div style={{ width: "100%", background: "var(--border)", height: "8px", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, background: "var(--primary)", height: "100%", transition: "width 0.3s ease" }}></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px", textAlign: "center" }}>
              <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text)" }}>{prog.sent}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>Đã gửi</p>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--success)" }}>{prog.success}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "#166534", fontWeight: 600 }}>Thành công</p>
              </div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius)", padding: "10px" }}>
                <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--danger)" }}>{prog.failed}</span>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "#991b1b", fontWeight: 600 }}>Thất bại</p>
              </div>
            </div>

            <div
              ref={resultsRef}
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: "var(--bg)"
              }}
            >
              {prog.results.map((r, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  fontSize: "0.75rem",
                  borderBottom: "1px solid var(--border)",
                  background: r.status === "success" ? "white" : "#fff5f5"
                }}>
                  {r.status === "success" ? (
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-danger shrink-0" />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{r.tenNhanVien}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "6px", fontFamily: "monospace", fontSize: "0.7rem" }}>{r.email}</span>
                    {r.status === "error" && <p style={{ margin: "2px 0 0 0", color: "var(--danger)", fontSize: "0.65rem" }}>{r.error}</p>}
                  </div>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-light)", fontFamily: "monospace" }}>{r.sentVia}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewRecord && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "var(--radius-xl)",
            width: "100%",
            maxWidth: "720px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)"
            }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail className="w-4 h-4 text-emerald-600" /> Xem trước email cập nhật khác: {previewRecord.tenNhanVien}
              </h3>
              <button
                onClick={() => setPreviewRecord(null)}
                className="btn btn-ghost btn-sm"
                style={{ padding: "4px", minWidth: "auto", borderRadius: "50%" }}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div style={{
              flex: 1,
              overflowY: "auto",
              background: "#f1f5f9",
              padding: "20px"
            }}>
              <div
                style={{
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "24px",
                  boxShadow: "var(--shadow-sm)"
                }}
                dangerouslySetInnerHTML={{
                  __html: generateTaxEmail(previewRecord, {
                    emailTitle: subject || `Thông báo Cập nhật khác Thu Nhập Cá Nhân tháng ${thang}`,
                    customMessage,
                    showKhoanDetail,
                  }),
                }}
              />
            </div>
            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid var(--border)",
              background: "var(--bg)",
              display: "flex",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={() => setPreviewRecord(null)}
                className="btn btn-outline btn-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT: ZALO STAFF MESSAGE COMPOSE TAB
// ==========================================
// ==========================================
// COMPONENT: LỊCH SỬ GỬI TIN ZALO NỘI BỘ
// ==========================================
function ZaloStaffHistoryCard() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    setLoading(true);
    fetch("/api/broadcast")
      .then((r) => r.json())
      .then((json) => setLogs(json.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);

  const parsePayload = (raw) => {
    try { return JSON.parse(raw || "{}"); } catch { return {}; }
  };

  return (
    <div className="card" style={{ padding: "20px" }}>
      <div className="card-header" style={{ marginBottom: "16px" }}>
        <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>📋 Lịch Sử Tin Zalo</span>
          <button
            onClick={fetchLogs}
            title="Làm mới"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)" }}>
          <Loader2 className="w-5 h-5 animate-spin" style={{ margin: "0 auto 8px", display: "block" }} />
          <div style={{ fontSize: "0.8rem" }}>Đang tải...</div>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Chưa có lịch sử gửi tin Zalo nào
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {logs.slice(0, 10).map((log) => {
            const payload = parsePayload(log.rawPayload);
            const titleRaw = (log.content || "").split("\n")[0];
            const title = titleRaw.replace(/^\[|\]$/g, "") || "Tin nhắn Zalo";
            const dateStr = new Date(log.receivedAt).toLocaleString("vi-VN", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            });
            const success = payload.successCount ?? "?";
            const total = payload.total ?? "?";
            const fail = payload.failCount ?? "?";
            return (
              <div key={log.id} style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "10px 12px",
                fontSize: "0.78rem"
              }}>
                <div style={{
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: "6px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}>
                  💬 {title}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", gap: "8px" }}>
                    <span style={{ color: "#16a34a" }}>✅ {success}</span>
                    {Number(fail) > 0 && <span style={{ color: "#dc2626" }}>❌ {fail}</span>}
                    <span>/ {total}</span>
                  </span>
                  <span style={{ fontSize: "0.72rem" }}>{dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT: GỬI TIN ZALO NỘI BỘ
// ==========================================
function ZaloStaffTab({ followers }) {

  const [scope, setScope] = useState("all_staff");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [messageType, setMessageType] = useState("text"); // 'text' | 'list'
  
  const [listElements, setListElements] = useState([
    { title: "", subtitle: "", imageUrl: "", actionType: "oa.open.url", actionValue: "", actionSmsContent: "" }
  ]);

  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // CMS Article Picker
  const [isCmsModalOpen, setIsCmsModalOpen] = useState(false);
  const [cmsArticles, setCmsArticles] = useState([]);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsSearch, setCmsSearch] = useState("");
  const [cmsPage, setCmsPage] = useState(1);
  const [cmsTotalPages, setCmsTotalPages] = useState(1);
  const [cmsUrl, setCmsUrl] = useState("");
  const [cmsError, setCmsError] = useState("");

  const fetchCmsArticles = async (search = "", page = 1) => {
    setCmsLoading(true);
    setCmsError("");
    try {
      const params = new URLSearchParams({ search, page: String(page) });
      const res = await fetch(`/api/payload-articles?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setCmsError(json.error || "Lỗi tải bài viết");
        setCmsArticles([]);
      } else {
        setCmsArticles(json.docs || []);
        setCmsTotalPages(json.totalPages || 1);
        setCmsUrl(json.cmsUrl || "");
      }
    } catch {
      setCmsError("Không thể kết nối đến Website CMS");
      setCmsArticles([]);
    } finally {
      setCmsLoading(false);
    }
  };

  const openCmsModal = () => {
    setIsCmsModalOpen(true);
    setCmsSearch("");
    setCmsPage(1);
    fetchCmsArticles("", 1);
  };

  const addArticleFromCms = (article) => {
    if (listElements.length >= 5) {
      alert("Zalo chỉ cho phép tối đa 5 thẻ trong tin nhắn danh sách.");
      return;
    }
    const imgPath = article.image?.sizes?.card?.url || article.image?.url || "";
    const resolvedImg = imgPath.startsWith("/") ? `${cmsUrl}${imgPath}` : imgPath;
    const articleUrl = cmsUrl ? `${cmsUrl}/bai-viet/${article.slug}` : "";
    const newEl = {
      title: article.title.substring(0, 120),
      subtitle: (article.description || article.title).substring(0, 120),
      imageUrl: resolvedImg,
      actionType: "oa.open.url",
      actionValue: articleUrl,
      actionSmsContent: "",
    };
    setListElements((prev) => [...prev, newEl]);
    setIsCmsModalOpen(false);
  };


  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQ, setSearchQ] = useState("");

  const staffList = followers.filter(f => f.userType === "staff");
  
  const filteredStaff = staffList.filter(f => {
    const term = searchQ.toLowerCase();
    const name = (f.displayName || "").toLowerCase();
    const phone = (f.phone || "").toLowerCase();
    const dept = (f.department || "").toLowerCase();
    const staffNameRaw = (f.staffLink?.staffNameRaw || "").toLowerCase();
    return name.includes(term) || phone.includes(term) || dept.includes(term) || staffNameRaw.includes(term);
  });

  const charLimit = 1000;

  const handleElementChange = (index, field, value) => {
    const newElements = [...listElements];
    newElements[index][field] = value;
    setListElements(newElements);
  };

  const addElement = () => {
    if (listElements.length >= 5) {
      alert("Zalo chỉ cho phép tối đa 5 thẻ trong tin nhắn danh sách.");
      return;
    }
    setListElements([...listElements, { title: "", subtitle: "", imageUrl: "", actionType: "oa.open.url", actionValue: "", actionSmsContent: "" }]);
  };

  const removeElement = (index) => {
    if (listElements.length <= 1) return;
    const newElements = [...listElements];
    newElements.splice(index, 1);
    setListElements(newElements);
  };

  const handleImageUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Chỉ chấp nhận tệp tin hình ảnh.");
      return;
    }

    setUploadingIndex(index);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tải ảnh thất bại");
      handleElementChange(index, "imageUrl", data.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  };

  const toggleSelect = (zaloUserId) => {
    setSelectedIds((prev) =>
      prev.includes(zaloUserId) ? prev.filter((id) => id !== zaloUserId) : [...prev, zaloUserId]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredStaff.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStaff.map((f) => f.zaloUserId));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    
    if (messageType === "text") {
      if (!title.trim() || !content.trim()) {
        alert("Vui lòng nhập đủ Tiêu đề và Nội dung.");
        return;
      }
    } else {
      if (listElements.length === 0) {
        alert("Vui lòng thêm ít nhất 1 thẻ.");
        return;
      }
      for (let i = 0; i < listElements.length; i++) {
        const el = listElements[i];
        if (!el.title.trim() || !el.imageUrl.trim()) {
          alert(`Thẻ số ${i + 1} thiếu Tiêu đề hoặc URL hình ảnh.`);
          return;
        }
      }
    }

    if (scope === "list_staff" && selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất một nhân viên nhận.");
      return;
    }

    const previewText = messageType === "text" ? content.substring(0, 80) : `${listElements.length} thẻ tham số`;
    const previewTitle = messageType === "text" ? title : listElements[0].title;
    const confirmed = window.confirm(
      scope === "all_staff"
        ? `Bạn có chắc muốn gửi tin đến TẤT CẢ cán bộ nhân viên đã liên kết Zalo?\n\nTiêu đề: "${previewTitle}"\nNội dung: "${previewText}..."`
        : `Gửi tin đến ${selectedIds.length} nhân viên đã chọn?\n\nTiêu đề: "${previewTitle}"`
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/salary-email/send-zalo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          userIds: scope === "list_staff" ? selectedIds : undefined,
          messageType,
          title: title.trim(),
          content: content.trim(),
          url: url.trim() || undefined,
          elements: messageType === "list" ? listElements : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gửi thất bại");
      setResult({ success: true, successCount: json.successCount, total: json.total, failCount: json.failCount });
      setTitle("");
      setContent("");
      setUrl("");
      setSelectedIds([]);
      setListElements([{ title: "", subtitle: "", imageUrl: "", actionType: "oa.open.url", actionValue: "", actionSmsContent: "" }]);
      
      window.dispatchEvent(new Event("zalo_staff_sent"));
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSend}>
        <div className="card" style={{ padding: "20px" }}>
          <div className="card-header" style={{ marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>💬 Soạn tin nhắn gửi Zalo cho Nhân viên</span>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Phạm vi gửi tin */}
            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Phạm vi gửi tin</label>
              <div className="segmented-control" style={{ display: "flex", marginTop: "6px", width: "100%" }}>
                <button
                  type="button"
                  className={`segmented-btn ${scope === "all_staff" ? "active" : ""}`}
                  onClick={() => { setScope("all_staff"); setSelectedIds([]); }}
                  style={{ flex: 1, padding: "8px 12px" }}
                >
                  📢 Tất cả nhân viên ({staffList.length})
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${scope === "list_staff" ? "active" : ""}`}
                  onClick={() => { setScope("list_staff"); setSelectedIds([]); }}
                  style={{ flex: 1, padding: "8px 12px" }}
                >
                  🎯 Chọn lọc nhân viên
                </button>
              </div>
            </div>

            {/* Danh sách nhân viên */}
            {scope === "list_staff" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>
                    Chọn nhân viên nhận tin
                    {selectedIds.length > 0 && (
                      <span style={{ marginLeft: "8px", background: "var(--primary)", color: "white", borderRadius: "20px", padding: "1px 10px", fontSize: "0.75rem" }}>
                        {selectedIds.length} đã chọn
                      </span>
                    )}
                  </label>
                  <div style={{ display: "flex", gap: "8px", width: "100%", flex: "1 1 200px", justifyContent: "flex-end" }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Tìm tên, SĐT, khoa phòng..."
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      style={{ flex: 1, maxWidth: "200px", padding: "6px 10px", fontSize: "0.8rem" }}
                    />
                    <button type="button" className="btn btn-outline btn-sm" onClick={selectAll} style={{ fontSize: "0.78rem" }}>
                      {selectedIds.length === filteredStaff.length && filteredStaff.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </button>
                  </div>
                </div>
                
                <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", maxHeight: "350px", overflowY: "auto" }}>
                  {filteredStaff.length === 0 ? (
                    <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      Không tìm thấy nhân viên nào đã liên kết Zalo.
                    </div>
                  ) : (
                    filteredStaff.map((f) => (
                      <label
                        key={f.zaloUserId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          background: selectedIds.includes(f.zaloUserId) ? "var(--primary-light)" : "white",
                          transition: "background 0.1s"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(f.zaloUserId)}
                          onChange={() => toggleSelect(f.zaloUserId)}
                          style={{ accentColor: "var(--primary)", width: "16px", height: "16px" }}
                        />
                        {f.avatarUrl ? (
                          <img src={f.avatarUrl} alt={f.displayName} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}>
                            {f.displayName?.[0] || "U"}
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            {f.staffLink?.staffNameRaw ? (
                              <>
                                <span>{f.staffLink.staffNameRaw}</span>
                                <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "8px", fontSize: "0.78rem" }}>
                                  (Zalo: {f.displayName})
                                </span>
                              </>
                            ) : (
                              f.displayName
                            )}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "10px" }}>
                            <span>📞 {f.phone || "--"}</span>
                            {f.department && <span>🏢 {f.department}</span>}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Loại tin nhắn */}
            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Loại tin nhắn</label>
              <div className="segmented-control" style={{ display: "flex", marginTop: "6px", marginBottom: "12px", width: "100%" }}>
                <button
                  type="button"
                  className={`segmented-btn ${messageType === "text" ? "active" : ""}`}
                  onClick={() => setMessageType("text")}
                  style={{ flex: 1, padding: "8px 12px" }}
                >
                  📄 Văn bản
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${messageType === "list" ? "active" : ""}`}
                  onClick={() => setMessageType("list")}
                  style={{ flex: 1, padding: "8px 12px" }}
                >
                  📑 Danh sách Carousel
                </button>
              </div>
            </div>

            {/* Form soạn tin */}
            {messageType === "text" && (
              <>
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Tiêu đề thông báo</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Thông báo cập nhật thông tin nội bộ cơ quan"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required={messageType === "text"}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label className="form-label" style={{ marginBottom: 0, fontWeight: 600 }}>Nội dung tin nhắn</label>
                    <span style={{ fontSize: "0.75rem", color: content.length > charLimit * 0.9 ? "var(--danger)" : "var(--text-muted)" }}>
                      {content.length}/{charLimit}
                    </span>
                  </div>
                  <textarea
                    className="form-input"
                    placeholder="Nhập nội dung thông báo gửi đến nhân viên..."
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, charLimit))}
                    style={{ minHeight: "120px", resize: "vertical", lineHeight: 1.6 }}
                    required={messageType === "text"}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Đường dẫn kèm theo <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(tùy chọn)</span></label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://... — nếu có, sẽ thêm nút 'Xem chi tiết'"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </>
            )}

            {messageType === "list" && (
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "0.95rem", fontWeight: 700 }}>Thiết kế các thẻ danh sách (Tối đa 5 thẻ)</h4>
                {listElements.map((el, index) => (
                  <div key={index} style={{ background: "white", padding: "16px", borderRadius: "6px", border: "1px solid var(--border)", marginBottom: "16px", position: "relative" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Thẻ thứ {index + 1}</span>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={openCmsModal}
                          style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                        >
                          📰 Thêm từ Website CMS
                        </button>
                        {listElements.length > 1 && (
                          <button type="button" onClick={() => removeElement(index)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem" }}>
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>Tiêu đề</label>
                        <input type="text" className="form-input" style={{ padding: "6px 10px" }} value={el.title} onChange={(e) => handleElementChange(index, "title", e.target.value)} required={messageType === "list"} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>Phụ đề (Mô tả)</label>
                        <input type="text" className="form-input" style={{ padding: "6px 10px" }} value={el.subtitle || ""} placeholder="Bấm xem chi tiết..." onChange={(e) => handleElementChange(index, "subtitle", e.target.value)} />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>Ảnh bìa (URL)</label>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: "6px 10px", flex: 1 }} 
                            value={el.imageUrl} 
                            placeholder="Link hoặc tải ảnh lên"
                            onChange={(e) => handleElementChange(index, "imageUrl", e.target.value)} 
                            required={messageType === "list"} 
                          />
                          <label 
                            htmlFor={`file-upload-zalo-${index}`} 
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              cursor: "pointer", 
                              padding: "6px 12px", 
                              fontSize: "0.8rem", 
                              margin: 0,
                              whiteSpace: "nowrap",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              background: "#f1f5f9",
                              color: "#334155",
                              fontWeight: 600
                            }}
                          >
                            {uploadingIndex === index ? "⏳..." : "📁 Tải ảnh"}
                          </label>
                          <input 
                            type="file" 
                            id={`file-upload-zalo-${index}`} 
                            accept="image/*" 
                            style={{ display: "none" }} 
                            onChange={(e) => handleImageUpload(index, e)} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>Hành động</label>
                        <select className="form-input" style={{ padding: "6px 10px" }} value={el.actionType} onChange={(e) => handleElementChange(index, "actionType", e.target.value)}>
                          <option value="oa.open.url">Mở đường dẫn (Link)</option>
                          <option value="oa.query.show">Gửi tin nhắn đến OA</option>
                          <option value="oa.query.hide">Gửi tin nhắn ẩn đến OA</option>
                          <option value="oa.open.sms">Mở app gửi SMS</option>
                          <option value="oa.open.phone">Mở app gọi điện</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="form-label" style={{ fontSize: "0.8rem" }}>
                          {el.actionType === "oa.open.url" && "Đường dẫn (Link)"}
                          {el.actionType === "oa.open.phone" && "Số điện thoại"}
                          {el.actionType === "oa.open.sms" && "Số điện thoại nhận SMS"}
                          {(el.actionType === "oa.query.show" || el.actionType === "oa.query.hide") && "Nội dung tin nhắn (Payload)"}
                        </label>
                        <input 
                          type={el.actionType.includes("phone") || el.actionType.includes("sms") ? "tel" : "text"} 
                          className="form-input" 
                          style={{ padding: "6px 10px" }} 
                          value={el.actionValue} 
                          placeholder={
                            el.actionType === "oa.open.url" ? "https://..." : 
                            el.actionType.includes("query") ? "VD: Xem thông tin" : 
                            "090..."
                          }
                          onChange={(e) => handleElementChange(index, "actionValue", e.target.value)} 
                          required={messageType === "list"} 
                        />
                      </div>

                      {el.actionType === "oa.open.sms" && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Nội dung tin nhắn SMS</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ padding: "6px 10px" }} 
                            value={el.actionSmsContent} 
                            placeholder="Nội dung soạn sẵn..."
                            onChange={(e) => handleElementChange(index, "actionSmsContent", e.target.value)} 
                            required={messageType === "list" && el.actionType === "oa.open.sms"} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {listElements.length < 5 && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={addElement} style={{ width: "100%", padding: "8px" }}>
                    + Thêm thẻ tham số
                  </button>
                )}
              </div>
            )}

            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "#f0f9ff", padding: "10px 14px", borderRadius: "var(--radius)", border: "1px solid #bae6fd" }}>
              💡 <strong>Lưu ý:</strong> Tin nhắn Zalo nội bộ sẽ được gửi trực tiếp qua Zalo OA đến danh sách nhân viên đã được chọn. Vui lòng đảm bảo các tài khoản Zalo của nhân viên đã quan tâm OA để nhận được tin nhắn.
            </div>

            {/* Thông báo kết quả */}
            {result && (
              <div style={{
                padding: "12px 16px",
                borderRadius: "var(--radius)",
                background: result.success ? "#f0fdf4" : "#fff5f5",
                border: `1px solid ${result.success ? "#86efac" : "#fca5a5"}`,
                fontSize: "0.875rem",
                color: result.success ? "#166534" : "#991b1b",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>{result.success ? "✅" : "❌"}</span>
                {result.success
                  ? `Đã gửi thành công ${result.successCount}/${result.total} nhân viên${result.failCount > 0 ? ` (${result.failCount} lỗi)` : ""}`
                  : `Gửi lỗi: ${result.error}`
                }
              </div>
            )}

            {/* Nút gửi */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsPreviewOpen(true)}
                disabled={messageType === "text" && !title.trim()}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Eye className="w-4 h-4" /> Xem trước tin
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || (messageType === "text" && (!title.trim() || !content.trim()))}
                style={{ minWidth: "160px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ marginRight: "6px" }} />
                    Đang gửi Zalo...
                  </>
                ) : (
                  <>
                    📣 {scope === "all_staff" ? "Gửi tất cả nhân viên" : `Gửi cho ${selectedIds.length || "..."} nhân viên`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ===== Modal xem trước Zalo ===== */}
      {isPreviewOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white", borderRadius: "24px",
            width: "100%", maxWidth: "360px", height: "720px", maxHeight: "90vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
            position: "relative"
          }}>
            {/* Header giả lập Zalo */}
            <div style={{ background: "var(--primary)", padding: "16px 16px 12px", color: "white", display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => setIsPreviewOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", padding: 0 }}>
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "white", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                  OA
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "1rem" }}>CDC Đà Nẵng</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Vừa mới truy cập</div>
                </div>
              </div>
            </div>

            {/* Khung chat */}
            <div style={{ flex: 1, background: "#e2e8f0", padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              {messageType === "text" ? (
                <div style={{ display: "flex", gap: "8px", maxWidth: "85%" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.7rem", flexShrink: 0 }}>
                    OA
                  </div>
                  <div style={{ background: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                    <div style={{ padding: "12px" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "8px" }}>{title || "Chưa có tiêu đề"}</div>
                      <div style={{ fontSize: "0.9rem", color: "#333", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                        {content || "Chưa có nội dung"}
                      </div>
                    </div>
                    {url && (
                      <div style={{ borderTop: "1px solid #eee", padding: "10px", textAlign: "center", color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
                        Xem chi tiết
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.7rem", flexShrink: 0 }}>
                    OA
                  </div>
                  <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "10px", width: "100%", scrollbarWidth: "none" }}>
                    {listElements.map((el, i) => (
                      <div key={i} style={{ width: "240px", background: "white", borderRadius: "8px", overflow: "hidden", flexShrink: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                        <div style={{ width: "100%", height: "135px", background: "#f1f5f9", position: "relative" }}>
                          {el.imageUrl ? (
                            <img src={el.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                              Chưa có ảnh
                            </div>
                          )}
                        </div>
                        <div style={{ padding: "12px" }}>
                          <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {el.title || "Chưa có tiêu đề"}
                          </div>
                          {el.subtitle && (
                            <div style={{ fontSize: "0.8rem", color: "#64748b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {el.subtitle}
                            </div>
                          )}
                        </div>
                        <div style={{ borderTop: "1px solid #eee", padding: "10px", textAlign: "center", color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem" }}>
                          {el.actionType === "oa.open.url" ? "Xem chi tiết" :
                           el.actionType.includes("phone") ? "Gọi ngay" :
                           el.actionType.includes("sms") ? "Nhắn tin SMS" :
                           "Phản hồi"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input giả lập Zalo */}
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: "12px", alignItems: "center" }}>
              <div style={{ flex: 1, height: "36px", background: "white", borderRadius: "18px", border: "1px solid var(--border)", display: "flex", alignItems: "center", padding: "0 12px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Nhập tin nhắn...
              </div>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Send className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal chọn bài từ Website CMS ===== */}
      {isCmsModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white", borderRadius: "14px",
            width: "90%", maxWidth: "620px", maxHeight: "82vh",
            display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden"
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>📰 Chọn bài từ Website CMS</h3>
              <button type="button" onClick={() => setIsCmsModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm kiếm bài viết..."
                  value={cmsSearch}
                  onChange={(e) => setCmsSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setCmsPage(1); fetchCmsArticles(cmsSearch, 1); } }}
                  style={{ flex: 1, padding: "8px 12px" }}
                />
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setCmsPage(1); fetchCmsArticles(cmsSearch, 1); }}
                  style={{ padding: "8px 14px" }}>🔍</button>
              </div>
            </div>

            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              {cmsLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Đang tải...
                </div>
              ) : cmsError ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--danger)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚠️</div>
                  <div style={{ fontWeight: 600, marginBottom: "6px" }}>{cmsError}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Kiểm tra lại URL Website CMS trong mục Cài đặt → Kết nối Website CMS</div>
                </div>
              ) : cmsArticles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>📭 Không tìm thấy bài nào.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {cmsArticles.map((article) => {
                    const imgPath = article.image?.sizes?.card?.url || article.image?.url || "";
                    const thumbUrl = imgPath.startsWith("/") ? `${cmsUrl}${imgPath}` : imgPath;
                    return (
                      <div
                        key={article.id}
                        onClick={() => addArticleFromCms(article)}
                        style={{
                          padding: "12px 14px", borderRadius: "8px",
                          border: "1px solid var(--border)", cursor: "pointer",
                          transition: "all 0.15s", background: "#fff",
                          display: "flex", gap: "12px", alignItems: "flex-start"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "#f0f9ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "#fff"; }}
                      >
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 54, height: 54, borderRadius: "6px", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>📰</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {article.title}
                          </div>
                          {article.description && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                              {article.description.substring(0, 100)}{article.description.length > 100 ? "..." : ""}
                            </div>
                          )}
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            📅 {new Date(article.createdAt).toLocaleDateString("vi-VN")}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 700, flexShrink: 0, alignSelf: "center" }}>+ Thêm</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button type="button" className="btn btn-outline btn-sm"
                  disabled={cmsPage <= 1 || cmsLoading}
                  onClick={() => { const p = cmsPage - 1; setCmsPage(p); fetchCmsArticles(cmsSearch, p); }}
                  style={{ padding: "4px 10px" }}>←</button>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Trang {cmsPage}/{cmsTotalPages}</span>
                <button type="button" className="btn btn-outline btn-sm"
                  disabled={cmsPage >= cmsTotalPages || cmsLoading}
                  onClick={() => { const p = cmsPage + 1; setCmsPage(p); fetchCmsArticles(cmsSearch, p); }}
                  style={{ padding: "4px 10px" }}>→</button>
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsCmsModalOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
