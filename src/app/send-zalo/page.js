"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { canSendInternal, canBroadcast } from "@/lib/roles";
import {
  MessageSquarePlus, Users, UserCheck, Globe, Upload, X,
  Send, Image, FileVideo, FileText, ChevronDown, ChevronUp,
  Clock, CheckCircle, XCircle, Search, RefreshCw
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────
const SCOPE_OPTIONS = [
  { value: "all_staff",    label: "👨‍💼 Tất cả Nhân viên",   description: "Gởi đến toàn bộ CBNV đã liên kết Zalo" },
  { value: "list_staff",   label: "👤 Chọn Nhân viên",     description: "Chọn từng nhân viên cụ thể" },
  { value: "all_citizen",  label: "👥 Tất cả Khách hàng",  description: "Gởi đến toàn bộ người quan tâm OA" },
  { value: "list_citizen", label: "🔍 Chọn Khách hàng",   description: "Chọn từng khách hàng cụ thể" },
  { value: "all",          label: "🌐 Tất cả mọi người",   description: "Gởi đến cả nhân viên lẫn khách hàng" },
];

function AttachTag({ name, onRemove, icon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      background: "var(--primary-light)", color: "var(--primary)",
      borderRadius: "6px", padding: "4px 10px", fontSize: "0.8rem", fontWeight: 500,
    }}>
      {icon}
      <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", lineHeight: 1, padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ background: "var(--border)", borderRadius: 99, height: 8, overflow: "hidden" }}>
      <div style={{
        background: "linear-gradient(90deg, var(--primary), #22c55e)",
        width: `${value}%`, height: "100%",
        transition: "width 0.3s ease",
        borderRadius: 99,
      }} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function SendZaloPage() {
  const { data: session, status } = useSession();

  // Permission guard
  if (status === "authenticated" && !canSendInternal(session?.user?.role) && !canBroadcast(session?.user?.role)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
        <div style={{ fontSize: "3rem" }}>🚫</div>
        <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>Không có quyền truy cập</div>
        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", textAlign: "center", maxWidth: 360 }}>
          Trang này yêu cầu quyền <strong>📧 Tin nội bộ</strong> hoặc <strong>📢 Tin truyền thông</strong>.<br />
          Liên hệ Quản trị viên để được cấp quyền.
        </div>
      </div>
    );
  }

  // ─── State ──────────────────────────────────────────────────
  const [scope, setScope] = useState("all_staff");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  // Attachments
  const [imageAttachments, setImageAttachments]  = useState([]); // [{ name, url, preview }]
  const [videoAttachments, setVideoAttachments]  = useState([]); // [{ name, url }]
  const [fileAttachments,  setFileAttachments]   = useState([]); // [{ name, url }]

  // Recipient selection
  const [followers,        setFollowers]          = useState([]);
  const [staffLinks,       setStaffLinks]         = useState([]);
  const [selectedIds,      setSelectedIds]        = useState([]);
  const [searchTerm,       setSearchTerm]         = useState("");
  const [loadingRecip,     setLoadingRecip]       = useState(false);

  // Sending
  const [sending,          setSending]            = useState(false);
  const [sendProgress,     setSendProgress]       = useState(0);
  const [sendResult,       setSendResult]         = useState(null);

  // Uploading
  const [uploadingType,    setUploadingType]      = useState(null); // 'image'|'video'|'file'

  // History
  const [history,          setHistory]            = useState([]);
  const [loadingHistory,   setLoadingHistory]     = useState(false);

  const fileInputRef  = useRef(null);
  const imgInputRef   = useRef(null);
  const vidInputRef   = useRef(null);

  // ─── Load recipients ──────────────────────────────────────
  const loadRecipients = useCallback(async () => {
    if (!scope.includes("list")) return;
    setLoadingRecip(true);
    try {
      if (scope === "list_staff") {
        const res = await fetch("/api/followers?userType=staff&limit=500");
        const json = await res.json();
        // Also fetch staffZaloLinks
        const sRes = await fetch("/api/followers?limit=500");
        const sJson = await sRes.json();
        setFollowers(sJson.data || []);
      } else if (scope === "list_citizen") {
        const res = await fetch("/api/followers?userType=citizen&limit=500");
        const json = await res.json();
        setFollowers(json.data || []);
      }
    } catch(e) {
      console.error(e);
    }
    setLoadingRecip(false);
  }, [scope]);

  useEffect(() => {
    setSelectedIds([]);
    setSearchTerm("");
    loadRecipients();
  }, [scope]);

  // ─── Load history ─────────────────────────────────────────
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/send-zalo?limit=15");
      const json = await res.json();
      setHistory(json.data || []);
    } catch(e) {}
    setLoadingHistory(false);
  };

  useEffect(() => { loadHistory(); }, []);

  // ─── Upload helper ────────────────────────────────────────
  const handleUpload = async (file, type) => {
    setUploadingType(type);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.url) throw new Error(json.error || "Upload thất bại");
      return json.url;
    } finally {
      setUploadingType(null);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (imageAttachments.length >= 5) { alert("Tối đa 5 hình ảnh"); break; }
      try {
        const url = await handleUpload(file, "image");
        const preview = URL.createObjectURL(file);
        setImageAttachments(prev => [...prev, { name: file.name, url, preview }]);
      } catch(err) { alert("Lỗi upload ảnh: " + err.message); }
    }
    e.target.value = "";
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { alert("Video tối đa 100MB"); return; }
    try {
      const url = await handleUpload(file, "video");
      setVideoAttachments(prev => [...prev, { name: file.name, url }]);
    } catch(err) { alert("Lỗi upload video: " + err.message); }
    e.target.value = "";
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (fileAttachments.length >= 5) { alert("Tối đa 5 file"); break; }
      try {
        const url = await handleUpload(file, "file");
        setFileAttachments(prev => [...prev, { name: file.name, url }]);
      } catch(err) { alert("Lỗi upload file: " + err.message); }
    }
    e.target.value = "";
  };

  // ─── Send ─────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) { alert("Vui lòng nhập nội dung tin nhắn"); return; }
    if (scope.includes("list") && selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 người nhận");
      return;
    }

    const total = scope.includes("list") ? selectedIds.length : "?";
    const confirmed = window.confirm(
      `Xác nhận gởi tin đến ${typeof total === "number" ? total + " người" : "tất cả " + SCOPE_OPTIONS.find(s=>s.value===scope)?.label}?\n\nNội dung: "${content.substring(0,80)}..."`
    );
    if (!confirmed) return;

    setSending(true);
    setSendProgress(10);
    setSendResult(null);

    try {
      const body = {
        scope,
        userIds: scope.includes("list") ? selectedIds : [],
        title: title.trim(),
        content: content.trim(),
        url: url.trim(),
        imageUrls: imageAttachments.map(a => a.url),
        videoUrls: videoAttachments,
        fileAttachments,
        delay: 300,
      };

      setSendProgress(30);
      const res = await fetch("/api/send-zalo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSendProgress(90);
      const json = await res.json();
      setSendProgress(100);

      if (!res.ok) {
        setSendResult({ success: false, error: json.error });
      } else {
        setSendResult(json);
        // Reset form
        setContent("");
        setTitle("");
        setUrl("");
        setImageAttachments([]);
        setVideoAttachments([]);
        setFileAttachments([]);
        setSelectedIds([]);
        // Reload history
        setTimeout(loadHistory, 1000);
      }
    } catch(err) {
      setSendResult({ success: false, error: err.message });
    } finally {
      setSending(false);
      setTimeout(() => setSendProgress(0), 2000);
    }
  };

  // ─── Filtered recipients ──────────────────────────────────
  const filteredFollowers = followers.filter(f =>
    !searchTerm ||
    (f.displayName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.phone || "").includes(searchTerm)
  );

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const selectAll = () => setSelectedIds(filteredFollowers.map(f => f.zaloUserId));
  const clearAll  = () => setSelectedIds([]);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{ background: "linear-gradient(135deg, #0068ff, #00c6ff)", borderRadius: "12px", padding: "10px", display: "flex" }}>
          <MessageSquarePlus size={24} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>Gởi Zalo</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>Gởi tin đến Nhân viên & Khách hàng — kèm ảnh, video, file</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px", alignItems: "start" }}>
        {/* ─── LEFT: Compose ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Scope selector */}
          <div className="card" style={{ padding: "20px" }}>
            <label style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "12px", display: "block" }}>
              👥 Đối tượng nhận
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
              {SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScope(opt.value)}
                  style={{
                    border: scope === opt.value ? "2px solid var(--primary)" : "2px solid var(--border)",
                    borderRadius: "10px", padding: "10px 12px", background: scope === opt.value ? "var(--primary-light)" : "var(--surface)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", color: scope === opt.value ? "var(--primary)" : "var(--text)" }}>{opt.label}</div>
                  <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: "2px" }}>{opt.description}</div>
                </button>
              ))}
            </div>

            {/* List picker */}
            {scope.includes("list") && (
              <div style={{ marginTop: "16px", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <Search size={15} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "0.85rem", color: "var(--text)" }}
                  />
                  {loadingRecip ? (
                    <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button type="button" onClick={selectAll} style={{ fontSize: "0.72rem", background: "var(--primary-light)", color: "var(--primary)", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>Chọn tất cả</button>
                      <button type="button" onClick={clearAll}  style={{ fontSize: "0.72rem", background: "var(--border)", color: "var(--text-muted)", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>Bỏ chọn</button>
                    </div>
                  )}
                </div>
                <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                  {filteredFollowers.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {loadingRecip ? "Đang tải..." : "Không có dữ liệu"}
                    </div>
                  ) : filteredFollowers.map(f => (
                    <label key={f.zaloUserId} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "8px 12px", cursor: "pointer",
                      background: selectedIds.includes(f.zaloUserId) ? "var(--primary-light)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.15s",
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(f.zaloUserId)}
                        onChange={() => toggleSelect(f.zaloUserId)}
                        style={{ accentColor: "var(--primary)" }}
                      />
                      {f.avatarUrl ? (
                        <img src={f.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                          {(f.displayName || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.displayName || f.fullName || f.zaloUserId}
                        </div>
                        {f.phone && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{f.phone}</div>}
                      </div>
                    </label>
                  ))}
                </div>
                {selectedIds.length > 0 && (
                  <div style={{ padding: "8px 12px", background: "var(--primary-light)", color: "var(--primary)", fontSize: "0.8rem", fontWeight: 600, borderTop: "1px solid var(--border)" }}>
                    ✅ Đã chọn {selectedIds.length} người nhận
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compose */}
          <div className="card" style={{ padding: "20px" }}>
            <label style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "12px", display: "block" }}>
              ✏️ Soạn tin nhắn
            </label>

            {/* Title (optional) */}
            <div style={{ marginBottom: "10px" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tiêu đề (tùy chọn — sẽ in HOA ở đầu)"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Content */}
            <textarea
              className="form-input"
              placeholder="Nội dung tin nhắn..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              style={{ minHeight: 130, resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ textAlign: "right", fontSize: "0.72rem", color: content.length > 1800 ? "var(--danger)" : "var(--text-muted)" }}>
              {content.length}/2000
            </div>

            {/* URL optional */}
            <div style={{ marginTop: "10px" }}>
              <input
                type="url"
                className="form-input"
                placeholder="🔗 Đường dẫn kèm theo (tùy chọn)"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="card" style={{ padding: "20px" }}>
            <label style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "12px", display: "block" }}>
              📎 Đính kèm
            </label>

            {/* Upload buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              <button type="button" onClick={() => imgInputRef.current?.click()}
                disabled={!!uploadingType || imageAttachments.length >= 5}
                className="btn btn-ghost btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Image size={15} /> {uploadingType === "image" ? "Đang upload..." : "Thêm ảnh"}
              </button>
              <button type="button" onClick={() => vidInputRef.current?.click()}
                disabled={!!uploadingType || videoAttachments.length >= 3}
                className="btn btn-ghost btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FileVideo size={15} /> {uploadingType === "video" ? "Đang upload..." : "Thêm video"}
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={!!uploadingType || fileAttachments.length >= 5}
                className="btn btn-ghost btn-sm"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FileText size={15} /> {uploadingType === "file" ? "Đang upload..." : "Thêm file"}
              </button>
            </div>

            {/* Hidden inputs */}
            <input ref={imgInputRef}  type="file" accept="image/*"              multiple style={{ display: "none" }} onChange={handleImageUpload} />
            <input ref={vidInputRef}  type="file" accept="video/*"              style={{ display: "none" }} onChange={handleVideoUpload} />
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" multiple style={{ display: "none" }} onChange={handleFileUpload} />

            {/* Image previews */}
            {imageAttachments.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                {imageAttachments.map((img, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={img.preview} alt={img.name} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)" }} />
                    <button
                      type="button"
                      onClick={() => setImageAttachments(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video + File tags */}
            {(videoAttachments.length > 0 || fileAttachments.length > 0) && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {videoAttachments.map((v, i) => (
                  <AttachTag key={i} name={v.name} icon={<FileVideo size={12} />} onRemove={() => setVideoAttachments(prev => prev.filter((_, j) => j !== i))} />
                ))}
                {fileAttachments.map((f, i) => (
                  <AttachTag key={i} name={f.name} icon={<FileText size={12} />} onRemove={() => setFileAttachments(prev => prev.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}

            {imageAttachments.length === 0 && videoAttachments.length === 0 && fileAttachments.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                Chưa có đính kèm nào — tối đa 5 ảnh, 3 video, 5 file
              </div>
            )}
          </div>

          {/* Send button + progress */}
          <div className="card" style={{ padding: "16px 20px" }}>
            {sendProgress > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <ProgressBar value={sendProgress} />
              </div>
            )}
            {sendResult && (
              <div style={{
                display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px",
                padding: "10px 14px", borderRadius: "8px",
                background: sendResult.success ? "#dcfce7" : "#fee2e2",
                color: sendResult.success ? "#166534" : "#991b1b",
                fontWeight: 600, fontSize: "0.85rem",
              }}>
                {sendResult.success
                  ? <><CheckCircle size={16} /> Gởi thành công {sendResult.successCount}/{sendResult.total} người</>
                  : <><XCircle size={16} /> Lỗi: {sendResult.error}</>
                }
              </div>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !content.trim()}
              className="btn btn-primary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px" }}
            >
              {sending ? (
                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> Đang gởi...</>
              ) : (
                <><Send size={16} /> Gởi tin Zalo</>
              )}
            </button>
          </div>
        </div>

        {/* ─── RIGHT: History ─── */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={16} /> Lịch sử gởi
            </div>
            <button onClick={loadHistory} className="btn btn-ghost btn-sm" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
              <RefreshCw size={13} />
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px", fontSize: "0.85rem" }}>Đang tải...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px", fontSize: "0.85rem" }}>Chưa có lịch sử gởi tin</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.map(log => (
                <div key={log.id} style={{
                  padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)",
                  background: "var(--surface)", fontSize: "0.82rem",
                }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.content || "(Không có nội dung)"}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                    {new Date(log.receivedAt).toLocaleString("vi-VN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .send-zalo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
