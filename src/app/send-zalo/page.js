"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { canSendInternal, canBroadcast } from "@/lib/roles";
import {
  MessageSquarePlus, Send, Image, FileVideo, FileText,
  Clock, CheckCircle, XCircle, Search, RefreshCw, X,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────
const SCOPE_OPTIONS = [
  { value: "all_staff",    label: "👨‍💼 Tất cả Nhân viên",  desc: "Toàn bộ CBNV đã liên kết Zalo" },
  { value: "list_staff",   label: "👤 Chọn Nhân viên",    desc: "Chọn từng nhân viên cụ thể" },
  { value: "all_citizen",  label: "👥 Tất cả Khách hàng", desc: "Toàn bộ người quan tâm OA" },
  { value: "list_citizen", label: "🔍 Chọn Khách hàng",  desc: "Chọn từng khách hàng cụ thể" },
  { value: "all",          label: "🌐 Tất cả mọi người",  desc: "Cả nhân viên lẫn khách hàng" },
];

// ─── Mini Components ─────────────────────────────────────────
function AttachTag({ name, onRemove, icon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "5px",
      background: "var(--primary-light)", color: "var(--primary)",
      borderRadius: "6px", padding: "4px 8px", fontSize: "0.78rem", fontWeight: 500,
      maxWidth: "100%",
    }}>
      {icon}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{name}</span>
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, flexShrink: 0 }}>
        <X size={13} />
      </button>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ background: "var(--border)", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{
        background: "linear-gradient(90deg, var(--primary), #22c55e)",
        width: `${value}%`, height: "100%",
        transition: "width 0.4s ease", borderRadius: 99,
      }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SendZaloPage() {
  const { data: session, status } = useSession();

  // ─── Permission Guard ─────────────────────────────────────
  if (status === "authenticated" && !canSendInternal(session?.user?.role) && !canBroadcast(session?.user?.role)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem" }}>🚫</div>
        <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>Không có quyền truy cập</div>
        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 360 }}>
          Trang này yêu cầu quyền <strong>📧 Tin nội bộ</strong> hoặc <strong>📢 Tin truyền thông</strong>.<br />
          Liên hệ Quản trị viên để được cấp quyền.
        </div>
      </div>
    );
  }

  // ─── State ───────────────────────────────────────────────
  const [scope,             setScope]             = useState("all_staff");
  const [title,             setTitle]             = useState("");
  const [content,           setContent]           = useState("");
  const [url,               setUrl]               = useState("");
  const [imageAttachments,  setImageAttachments]  = useState([]);
  const [videoAttachments,  setVideoAttachments]  = useState([]);
  const [fileAttachments,   setFileAttachments]   = useState([]);
  const [followers,         setFollowers]         = useState([]);
  const [selectedIds,       setSelectedIds]       = useState([]);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [loadingRecip,      setLoadingRecip]      = useState(false);
  const [sending,           setSending]           = useState(false);
  const [sendProgress,      setSendProgress]      = useState(0);
  const [sendResult,        setSendResult]        = useState(null);
  const [uploadingType,     setUploadingType]     = useState(null);
  const [history,           setHistory]           = useState([]);
  const [loadingHistory,    setLoadingHistory]    = useState(false);

  const imgInputRef  = useRef(null);
  const vidInputRef  = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Load recipients ──────────────────────────────────────
  const loadRecipients = useCallback(async () => {
    if (!scope.includes("list")) { setFollowers([]); return; }
    setLoadingRecip(true);
    try {
      const endpoint = scope === "list_staff"
        ? "/api/followers?limit=500"
        : "/api/followers?userType=citizen&limit=500";
      const json = await fetch(endpoint).then(r => r.json());
      setFollowers(json.data || []);
    } catch (e) { console.error(e); }
    setLoadingRecip(false);
  }, [scope]);

  useEffect(() => {
    setSelectedIds([]);
    setSearchTerm("");
    loadRecipients();
  }, [scope]);

  // ─── Load history ─────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const json = await fetch("/api/send-zalo?limit=20").then(r => r.json());
      setHistory(json.data || []);
    } catch (e) {}
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadHistory(); }, []);

  // ─── Upload ───────────────────────────────────────────────
  const doUpload = async (file, type) => {
    setUploadingType(type);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const json = await fetch("/api/upload", { method: "POST", body: fd }).then(r => r.json());
      if (!json.url) throw new Error(json.error || "Upload thất bại");
      return json.url;
    } finally {
      setUploadingType(null);
    }
  };

  const onImgChange = async (e) => {
    for (const file of Array.from(e.target.files || [])) {
      if (imageAttachments.length >= 5) { alert("Tối đa 5 ảnh"); break; }
      try {
        const uploadedUrl = await doUpload(file, "image");
        const preview = URL.createObjectURL(file);
        setImageAttachments(p => [...p, { name: file.name, url: uploadedUrl, preview }]);
      } catch (err) { alert("Lỗi upload ảnh: " + err.message); }
    }
    e.target.value = "";
  };

  const onVidChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { alert("Video tối đa 100MB"); return; }
    try {
      const uploadedUrl = await doUpload(file, "video");
      setVideoAttachments(p => [...p, { name: file.name, url: uploadedUrl }]);
    } catch (err) { alert("Lỗi upload video: " + err.message); }
    e.target.value = "";
  };

  const onFileChange = async (e) => {
    for (const file of Array.from(e.target.files || [])) {
      if (fileAttachments.length >= 5) { alert("Tối đa 5 file"); break; }
      try {
        const uploadedUrl = await doUpload(file, "file");
        setFileAttachments(p => [...p, { name: file.name, url: uploadedUrl }]);
      } catch (err) { alert("Lỗi upload file: " + err.message); }
    }
    e.target.value = "";
  };

  // ─── Send ─────────────────────────────────────────────────
  const handleSend = async () => {
    const hasAttachments = imageAttachments.length > 0 || videoAttachments.length > 0 || fileAttachments.length > 0;
    if (!content.trim() && !hasAttachments) { alert("Vui lòng nhập nội dung hoặc thêm đính kèm"); return; }
    if (scope.includes("list") && selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 người nhận");
      return;
    }
    const scopeLabel = SCOPE_OPTIONS.find(s => s.value === scope)?.label || scope;
    const recipText  = scope.includes("list") ? `${selectedIds.length} người đã chọn` : scopeLabel;
    
    const previewContent = content.trim() ? `"${content.substring(0, 100)}..."` : "(Chỉ gởi đính kèm)";
    if (!window.confirm(`Xác nhận gởi tin đến ${recipText}?\n\n${previewContent}`)) return;

    setSending(true); setSendProgress(10); setSendResult(null);
    try {
      setSendProgress(30);
      const res  = await fetch("/api/send-zalo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope, userIds: scope.includes("list") ? selectedIds : [],
          title: title.trim(), content: content.trim(), url: url.trim(),
          imageUrls: imageAttachments.map(a => a.url),
          videoUrls: videoAttachments,
          fileAttachments,
          delay: 300,
        }),
      });
      setSendProgress(90);
      const json = await res.json();
      setSendProgress(100);
      setSendResult(json.error ? { success: false, error: json.error } : json);
      if (!json.error) {
        setContent(""); setTitle(""); setUrl("");
        setImageAttachments([]); setVideoAttachments([]); setFileAttachments([]);
        setSelectedIds([]);
        setTimeout(loadHistory, 800);
      }
    } catch (err) {
      setSendResult({ success: false, error: err.message });
    } finally {
      setSending(false);
      setTimeout(() => setSendProgress(0), 2500);
    }
  };

  // ─── Recipient helpers ────────────────────────────────────
  const filtered = followers.filter(f =>
    !searchTerm ||
    (f.displayName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.phone || "").includes(searchTerm)
  );
  const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAll    = ()   => setSelectedIds(filtered.map(f => f.zaloUserId));
  const clearAll     = ()   => setSelectedIds([]);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="sz-page">

      {/* ── Header ── */}
      <div className="sz-header">
        <div style={{ background: "linear-gradient(135deg,#0068ff,#00c6ff)", borderRadius: 12, padding: 10, display: "flex", flexShrink: 0 }}>
          <MessageSquarePlus size={22} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0 }}>Gởi Zalo</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: 0 }}>
            Gởi đến Nhân viên & Khách hàng — kèm ảnh, video, file
          </p>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="sz-grid">

        {/* ── LEFT col ── */}
        <div className="sz-left">

          {/* Scope */}
          <div className="card sz-card">
            <div className="sz-card-title">👥 Đối tượng nhận</div>
            <div className="sz-scope-grid">
              {SCOPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScope(opt.value)}
                  className={`sz-scope-btn${scope === opt.value ? " active" : ""}`}
                >
                  <span className="sz-scope-label">{opt.label}</span>
                  <span className="sz-scope-desc">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Recipient picker (for list scopes) */}
            {scope.includes("list") && (
              <div className="sz-recip-box">
                {/* Search bar */}
                <div className="sz-recip-search">
                  <Search size={14} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="sz-search-input"
                  />
                  {loadingRecip
                    ? <RefreshCw size={13} style={{ animation: "sz-spin 1s linear infinite", flexShrink: 0 }} />
                    : (
                      <div style={{ display: "flex", gap: 5 }}>
                        <button type="button" onClick={selectAll} className="sz-chip-btn primary">Chọn tất cả</button>
                        <button type="button" onClick={clearAll}  className="sz-chip-btn">Bỏ chọn</button>
                      </div>
                    )
                  }
                </div>

                {/* List */}
                <div className="sz-recip-list">
                  {filtered.length === 0
                    ? <div className="sz-empty">{loadingRecip ? "Đang tải..." : "Không có dữ liệu"}</div>
                    : filtered.map(f => (
                      <label key={f.zaloUserId} className={`sz-recip-row${selectedIds.includes(f.zaloUserId) ? " selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(f.zaloUserId)}
                          onChange={() => toggleSelect(f.zaloUserId)}
                          style={{ accentColor: "var(--primary)", flexShrink: 0 }}
                        />
                        {f.avatarUrl
                          ? <img src={f.avatarUrl} alt="" className="sz-avatar" />
                          : <div className="sz-avatar sz-avatar-fallback">{(f.displayName || "?")[0].toUpperCase()}</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="sz-recip-name">{f.displayName || f.fullName || f.zaloUserId}</div>
                          {f.phone && <div className="sz-recip-phone">{f.phone}</div>}
                        </div>
                      </label>
                    ))
                  }
                </div>

                {selectedIds.length > 0 && (
                  <div className="sz-selected-bar">✅ Đã chọn {selectedIds.length} người nhận</div>
                )}
              </div>
            )}
          </div>

          {/* Compose */}
          <div className="card sz-card">
            <div className="sz-card-title">✏️ Soạn tin nhắn</div>
            <input
              type="text"
              className="form-input"
              placeholder="Tiêu đề (tùy chọn — in HOA ở đầu)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <textarea
              className="form-input"
              placeholder="Nội dung tin nhắn..."
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ textAlign: "right", fontSize: "0.72rem", color: content.length > 1800 ? "#ef4444" : "var(--text-muted)", marginTop: 4 }}>
              {content.length}/2000
            </div>
            <input
              type="url"
              className="form-input"
              placeholder="🔗 Đường dẫn kèm theo (tùy chọn)"
              value={url}
              onChange={e => setUrl(e.target.value)}
              style={{ marginTop: 10 }}
            />
          </div>

          {/* Attachments */}
          <div className="card sz-card">
            <div className="sz-card-title">📎 Đính kèm</div>

            <div className="sz-attach-btns">
              <button type="button" onClick={() => imgInputRef.current?.click()}
                disabled={!!uploadingType || imageAttachments.length >= 5}
                className="btn btn-ghost btn-sm sz-attach-btn">
                <Image size={14} />
                {uploadingType === "image" ? "Đang tải..." : `Ảnh (${imageAttachments.length}/5)`}
              </button>
              <button type="button" onClick={() => vidInputRef.current?.click()}
                disabled={!!uploadingType || videoAttachments.length >= 3}
                className="btn btn-ghost btn-sm sz-attach-btn">
                <FileVideo size={14} />
                {uploadingType === "video" ? "Đang tải..." : `Video (${videoAttachments.length}/3)`}
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={!!uploadingType || fileAttachments.length >= 5}
                className="btn btn-ghost btn-sm sz-attach-btn">
                <FileText size={14} />
                {uploadingType === "file" ? "Đang tải..." : `File (${fileAttachments.length}/5)`}
              </button>
            </div>

            <input ref={imgInputRef}  type="file" accept="image/*" multiple style={{ display: "none" }} onChange={onImgChange} />
            <input ref={vidInputRef}  type="file" accept="video/*" style={{ display: "none" }} onChange={onVidChange} />
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" multiple style={{ display: "none" }} onChange={onFileChange} />

            {/* Image previews */}
            {imageAttachments.length > 0 && (
              <div className="sz-img-previews">
                {imageAttachments.map((img, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={img.preview} alt={img.name} className="sz-img-thumb" />
                    <button type="button" className="sz-img-remove"
                      onClick={() => setImageAttachments(p => p.filter((_, j) => j !== i))}>
                      <X size={9} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video + file tags */}
            {(videoAttachments.length > 0 || fileAttachments.length > 0) && (
              <div className="sz-tag-list">
                {videoAttachments.map((v, i) => (
                  <AttachTag key={i} name={v.name} icon={<FileVideo size={11} />}
                    onRemove={() => setVideoAttachments(p => p.filter((_, j) => j !== i))} />
                ))}
                {fileAttachments.map((f, i) => (
                  <AttachTag key={i} name={f.name} icon={<FileText size={11} />}
                    onRemove={() => setFileAttachments(p => p.filter((_, j) => j !== i))} />
                ))}
              </div>
            )}

            {imageAttachments.length === 0 && videoAttachments.length === 0 && fileAttachments.length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontStyle: "italic", marginTop: 4 }}>
                Chưa có đính kèm — tối đa 5 ảnh, 3 video, 5 file
              </div>
            )}
          </div>

          {/* Send */}
          <div className="card sz-card">
            {sendProgress > 0 && <div style={{ marginBottom: 10 }}><ProgressBar value={sendProgress} /></div>}
            {sendResult && (
              <div className={`sz-result${sendResult.success ? " ok" : " err"}`}>
                {sendResult.success
                  ? <><CheckCircle size={15} /> Gởi thành công {sendResult.successCount}/{sendResult.total} người</>
                  : <><XCircle size={15} /> Lỗi: {sendResult.error}</>
                }
              </div>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !content.trim()}
              className="btn btn-primary sz-send-btn"
            >
              {sending
                ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "white", borderColor: "rgba(255,255,255,0.3)" }} /> Đang gởi...</>
                : <><Send size={15} /> Gởi tin Zalo</>
              }
            </button>
          </div>

        </div>{/* /left */}

        {/* ── RIGHT col: History ── */}
        <div className="sz-right">
          <div className="card" style={{ padding: 0, height: "100%" }}>
            <div className="sz-hist-header">
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700 }}>
                <Clock size={16} color="var(--primary)" /> Lịch sử gởi tin
              </div>
              <button onClick={loadHistory} className="btn btn-ghost btn-sm" style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <RefreshCw size={13} /> Làm mới
              </button>
            </div>

            {/* Mobile: cards / Desktop: table */}
            {loadingHistory ? (
              <div className="sz-empty" style={{ padding: 40 }}>
                <RefreshCw size={18} style={{ animation: "sz-spin 1s linear infinite" }} />
                <span style={{ marginTop: 8 }}>Đang tải...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="sz-empty" style={{ padding: 40 }}>Chưa có lịch sử gởi tin.</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="sz-hist-table">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Thời gian</th>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Nội dung</th>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Phạm vi</th>
                        <th style={{ padding: "10px 14px", textAlign: "left" }}>Đính kèm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(log => {
                        let p = {};
                        try { p = JSON.parse(log.rawPayload || "{}"); } catch (_) {}
                        const label = SCOPE_OPTIONS.find(s => s.value === p.scope)?.label || p.scope || "—";
                        return (
                          <tr key={log.id} style={{ borderBottom: "1px solid var(--border)", fontSize: "0.83rem" }}>
                            <td style={{ padding: "10px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {new Date(log.receivedAt).toLocaleString("vi-VN")}
                            </td>
                            <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                              <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {log.content || "—"}
                              </div>
                            </td>
                            <td style={{ padding: "10px 14px", color: "var(--primary)", fontWeight: 600 }}>{label}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <div style={{ display: "flex", gap: 5 }}>
                                {p.imageUrls?.length > 0     && <span className="sz-badge blue"><Image size={9} /> {p.imageUrls.length}</span>}
                                {p.videoUrls?.length > 0     && <span className="sz-badge yellow"><FileVideo size={9} /> {p.videoUrls.length}</span>}
                                {p.fileAttachments?.length > 0 && <span className="sz-badge purple"><FileText size={9} /> {p.fileAttachments.length}</span>}
                                {!p.imageUrls?.length && !p.videoUrls?.length && !p.fileAttachments?.length && <span style={{ color: "var(--text-muted)" }}>—</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sz-hist-cards">
                  {history.map(log => {
                    let p = {};
                    try { p = JSON.parse(log.rawPayload || "{}"); } catch (_) {}
                    const label = SCOPE_OPTIONS.find(s => s.value === p.scope)?.label || p.scope || "—";
                    return (
                      <div key={log.id} className="sz-hist-card">
                        <div className="sz-hist-card-row">
                          <span className="sz-hist-scope">{label}</span>
                          <span className="sz-hist-time">{new Date(log.receivedAt).toLocaleString("vi-VN")}</span>
                        </div>
                        <div className="sz-hist-content">{log.content || "—"}</div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                          {p.imageUrls?.length > 0      && <span className="sz-badge blue"><Image size={9} /> {p.imageUrls.length} ảnh</span>}
                          {p.videoUrls?.length > 0      && <span className="sz-badge yellow"><FileVideo size={9} /> {p.videoUrls.length} video</span>}
                          {p.fileAttachments?.length > 0 && <span className="sz-badge purple"><FileText size={9} /> {p.fileAttachments.length} file</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

      </div>{/* /sz-grid */}

      {/* ── Responsive Styles ── */}
      <style>{`
        .sz-page { padding: 16px; max-width: 1200px; margin: 0 auto; }
        .sz-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .sz-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        .sz-left { display: flex; flex-direction: column; gap: 14px; }
        .sz-right { position: sticky; top: 16px; }
        .sz-card { padding: 18px; }
        .sz-card-title { font-weight: 700; font-size: 0.9rem; margin-bottom: 12px; color: var(--text); }

        /* Scope buttons */
        .sz-scope-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 7px; }
        .sz-scope-btn { border: 2px solid var(--border); border-radius: 9px; padding: 9px 11px; background: var(--surface); cursor: pointer; text-align: left; transition: all .2s; }
        .sz-scope-btn.active { border-color: var(--primary); background: var(--primary-light); }
        .sz-scope-label { display: block; font-weight: 600; font-size: 0.83rem; color: var(--text); }
        .sz-scope-btn.active .sz-scope-label { color: var(--primary); }
        .sz-scope-desc { display: block; font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }

        /* Recipient box */
        .sz-recip-box { margin-top: 14px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .sz-recip-search { display: flex; align-items: center; gap: 7px; padding: 9px 12px; background: var(--bg); border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 6px; }
        .sz-search-input { flex: 1; min-width: 100px; border: none; background: transparent; outline: none; font-size: 0.84rem; color: var(--text); }
        .sz-chip-btn { font-size: 0.7rem; border: none; border-radius: 4px; padding: 2px 8px; cursor: pointer; background: var(--border); color: var(--text-muted); }
        .sz-chip-btn.primary { background: var(--primary-light); color: var(--primary); }
        .sz-recip-list { max-height: 200px; overflow-y: auto; }
        .sz-recip-row { display: flex; align-items: center; gap: 9px; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); transition: background .15s; }
        .sz-recip-row.selected { background: var(--primary-light); }
        .sz-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .sz-avatar-fallback { background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; }
        .sz-recip-name { font-weight: 600; font-size: 0.84rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sz-recip-phone { font-size: 0.7rem; color: var(--text-muted); }
        .sz-selected-bar { padding: 7px 12px; background: var(--primary-light); color: var(--primary); font-size: 0.8rem; font-weight: 600; }

        /* Attachments */
        .sz-attach-btns { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 10px; }
        .sz-attach-btn { display: flex; align-items: center; gap: 5px; }
        .sz-img-previews { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
        .sz-img-thumb { width: 68px; height: 68px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); display: block; }
        .sz-img-remove { position: absolute; top: -5px; right: -5px; background: #ef4444; border: none; border-radius: 50%; width: 17px; height: 17px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; }
        .sz-tag-list { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }

        /* Send button */
        .sz-send-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; font-size: 0.95rem; }
        .sz-result { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; padding: 9px 12px; border-radius: 8px; font-weight: 600; font-size: 0.84rem; }
        .sz-result.ok  { background: #dcfce7; color: #166534; }
        .sz-result.err { background: #fee2e2; color: #991b1b; }

        /* History */
        .sz-hist-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); }
        .sz-hist-table { display: block; }
        .sz-hist-cards { display: none; }
        .sz-hist-card { padding: 12px 16px; border-bottom: 1px solid var(--border); }
        .sz-hist-card-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px; }
        .sz-hist-scope { font-size: 0.8rem; font-weight: 700; color: var(--primary); }
        .sz-hist-time { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
        .sz-hist-content { font-size: 0.84rem; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* Badges */
        .sz-badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600; }
        .sz-badge.blue   { background: #e0f2fe; color: #0369a1; }
        .sz-badge.yellow { background: #fef9c3; color: #854d0e; }
        .sz-badge.purple { background: #f3e8ff; color: #6b21a8; }

        /* Empty state */
        .sz-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.88rem; gap: 6px; }

        /* Spinner */
        @keyframes sz-spin { to { transform: rotate(360deg); } }

        /* ── Mobile ≤ 768px ── */
        @media (max-width: 768px) {
          .sz-page { padding: 12px; }
          .sz-grid { grid-template-columns: 1fr; }
          .sz-right { position: static; }
          .sz-scope-grid { grid-template-columns: 1fr 1fr; }
          .sz-hist-table { display: none; }
          .sz-hist-cards { display: block; }
          .sz-send-btn { padding: 14px; font-size: 1rem; }
        }

        /* ── Very small ≤ 400px ── */
        @media (max-width: 400px) {
          .sz-scope-grid { grid-template-columns: 1fr; }
          .sz-attach-btns { flex-direction: column; }
          .sz-attach-btn { width: 100%; justify-content: center; padding: 10px; }
        }
      `}</style>
    </div>
  );
}
