"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { canBroadcast } from "@/lib/roles";

export default function BroadcastPage() {
  const { data: session, status } = useSession();

  // Guard: kiểm tra quyền
  if (status === "authenticated" && !canBroadcast(session?.user?.role)) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "3rem" }}>🚫</div>
        <div style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--text)" }}>Không có quyền truy cập</div>
        <div style={{ fontSize: "0.9rem", textAlign: "center", maxWidth: 360 }}>
          Trang này yêu cầu quyền <strong>📢 Tin truyền thông</strong>.<br/>Liên hệ Quản trị viên để được cấp quyền.
        </div>
      </div>
    );
  }

  const [scope, setScope] = useState("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  
  // Tin nhắn danh sách (Carousel)
  const [messageType, setMessageType] = useState("text"); // 'text' | 'list'
  const [listElements, setListElements] = useState([
    { title: "", subtitle: "", imageUrl: "", actionType: "oa.open.url", actionValue: "", actionSmsContent: "" }
  ]);

  const [uploadingIndex, setUploadingIndex] = useState(null);

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
    } catch (err) {
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
    // Resolve image URL
    let imgPath = article.image?.sizes?.card?.url || article.image?.url || "";
    if (imgPath.startsWith("http")) {
      try { imgPath = new URL(imgPath).pathname; } catch (e) {}
    }
    const resolvedImg = imgPath.startsWith("/") && cmsUrl ? `${cmsUrl}${imgPath}` : imgPath;
    // Build article URL using slug
    const articleUrl = cmsUrl ? `${cmsUrl}/bai-viet/${article.slug}` : "";
    const newEl = {
      title: article.title.substring(0, 120),
      subtitle: (article.description || article.title).substring(0, 120),
      imageUrl: resolvedImg,
      actionType: "oa.open.url",
      actionValue: articleUrl,
      actionSmsContent: "",
    };
    setListElements((prev) => {
      const isFirstEmpty = prev.length === 1 && !prev[0].title && !prev[0].actionValue;
      if (isFirstEmpty) {
        return [newEl];
      }
      return [...prev, newEl];
    });
    setIsCmsModalOpen(false);
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

  const handleSingleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Chỉ chấp nhận tập tin hình ảnh.");
      return;
    }

    setUploadingIndex(-1); // Use -1 to represent single image upload
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Tải ảnh thất bại");
      setImageUrl(data.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Danh sách người quan tâm để chọn thủ công
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQ, setSearchQ] = useState("");

  // Lịch sử broadcast
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const charLimit = 1000;

  // Xử lý thay đổi List Elements
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


  const [allFollowers, setAllFollowers] = useState([]);
  
  const fetchFollowers = useCallback(async () => {
    setLoadingFollowers(true);
    try {
      const res = await fetch(`/api/followers?limit=10000`);
      const json = await res.json();
      if (json.data) setAllFollowers(json.data);
    } finally {
      setLoadingFollowers(false);
    }
  }, []);

  // Remove diacritics for search
  const removeAccents = (str) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  };

  const normalizedSearch = removeAccents(searchQ.trim());
  const followers = allFollowers.filter(f => {
    if (!normalizedSearch) return true;
    const nameMatch = removeAccents(f.displayName || f.fullName || "").includes(normalizedSearch);
    const phoneMatch = removeAccents(f.phone || "").includes(normalizedSearch);
    const deptMatch = removeAccents(f.department || "").includes(normalizedSearch);
    return nameMatch || phoneMatch || deptMatch;
  });

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/broadcast");
      const json = await res.json();
      if (json.data) setHistory(json.data);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (scope === "list") fetchFollowers();
  }, [scope, fetchFollowers]);

  const toggleSelect = (zaloUserId) => {
    setSelectedIds((prev) =>
      prev.includes(zaloUserId) ? prev.filter((id) => id !== zaloUserId) : [...prev, zaloUserId]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === followers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(followers.map((f) => f.zaloUserId));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    
    // Validation
    if (messageType === "text") {
      if (!title.trim() || !content.trim()) {
        alert("Vui lòng nhập đủ Tiêu đề và Nội dung.");
        return;
      }
    } else if (messageType === "video") {
      if (!url.trim()) {
        alert("Vui lòng nhập hoặc tải lên đường dẫn video.");
        return;
      }
    } else {
      if (listElements.length === 0) {
        alert("Vui lòng thêm ít nhất 1 thẻ tham số.");
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

    if (scope === "list" && selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất một người nhận.");
      return;
    }

    const previewText = messageType === "text" ? content.substring(0, 80) : `${listElements.length} thẻ tham số`;
    const previewTitle = messageType === "text" ? title : listElements[0].title;
    const confirmed = window.confirm(
      scope === "all"
        ? `Bạn có chắc muốn gửi tin đến TẤT CẢ người quan tâm Zalo OA?\n\nTiêu đề: "${previewTitle}"\nNội dung: "${previewText}..."`
        : `Gửi tin đến ${selectedIds.length} người đã chọn?\n\nTiêu đề: "${previewTitle}"`
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          userIds: scope === "list" ? selectedIds : undefined,
          messageType,
          title: title.trim(),
          content: content.trim(),
          url: url.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          elements: messageType === "list" ? listElements : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gửi thất bại");
      setResult({ success: true, successCount: json.successCount, total: json.total, failCount: json.failCount });
      setTitle("");
      setContent("");
      setUrl("");
      setImageUrl("");
      setSelectedIds([]);
      // Do not reset listElements to preserve user's work, let them clear manually if needed, or maybe reset to 1 element
      setListElements([{ title: "", subtitle: "", imageUrl: "", actionType: "oa.open.url", actionValue: "", actionSmsContent: "" }]);
      fetchHistory();
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  const scopeOptions = [
    { value: "all", label: "📢 Tất cả" },
    { value: "list", label: "🎯 Chọn lọc" },
  ];

  return (
    <div>
      {/* Removed HEADER because banner is present */}

      {/* Broadcast Banner */}
      <div style={{ marginBottom: "24px", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)", background: "white", display: "flex", justifyContent: "center" }}>
        <img 
          src="/images/banner-broadcast.png" 
          alt="Gửi tin truyền thông" 
          style={{ width: "100%", maxWidth: "800px", height: "auto", display: "block", objectFit: "contain" }} 
        />
      </div>

      <div className="dashboard-grid" style={{ alignItems: "flex-start", gap: "24px" }}>

        {/* === LEFT: Compose Form === */}
        <form onSubmit={handleSend}>
          <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
            <div className="card-header" style={{ marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
              <div className="card-title">📝 Soạn tin nhắn</div>
            </div>
            <div style={{ padding: "0", display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Scope selector */}
              <div>
                <label className="form-label">Phạm vi gửi tin</label>
                <div className="segmented-control" style={{ display: "flex", marginTop: "6px", width: "100%" }}>
                  {scopeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`segmented-btn ${scope === opt.value ? "active" : ""}`}
                      onClick={() => { setScope(opt.value); setSelectedIds([]); }}
                      style={{ flex: 1, padding: "8px 12px" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List selector */}
              {scope === "list" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Chọn người nhận
                      {selectedIds.length > 0 && (
                        <span style={{ marginLeft: "8px", background: "var(--primary)", color: "white", borderRadius: "20px", padding: "1px 10px", fontSize: "0.75rem" }}>
                          {selectedIds.length} đã chọn
                        </span>
                      )}
                    </label>
                    <div style={{ display: "flex", gap: "8px", width: "100%", sm: "auto", flex: "1 1 200px", justifyContent: "flex-end" }}>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Tìm tên, SĐT..."
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        style={{ flex: 1, maxWidth: "180px", padding: "6px 10px", fontSize: "0.8rem" }}
                      />
                      <button type="button" className="btn btn-outline btn-sm" onClick={selectAll} style={{ fontSize: "0.78rem" }}>
                        {selectedIds.length === followers.length && followers.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                      </button>
                    </div>
                  </div>
                  <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", maxHeight: "260px", overflowY: "auto" }}>
                    {loadingFollowers ? (
                      <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>Đang tải...</div>
                    ) : followers.length === 0 ? (
                      <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Chưa có dữ liệu. Hãy đồng bộ người quan tâm trước.
                      </div>
                    ) : (
                      followers.map((f) => (
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
                                f.fullName || f.displayName || "Người dùng Zalo"
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{f.phone || f.zaloUserId}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Message Type Selector */}
              <div>
                <label className="form-label">Loại tin nhắn</label>
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
                    📑 Danh sách
                  </button>
                </div>
              </div>

              {messageType === "text" && (
                <>
                  {/* Title field */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Tiêu đề thông báo</label>
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Thông báo lịch tiêm chủng tháng 6/2025"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required={messageType === "text"}
                    />
                  </div>

                  {/* Content composer */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>Nội dung tin nhắn</label>
                      <span style={{ fontSize: "0.75rem", color: content.length > charLimit * 0.9 ? "var(--danger)" : "var(--text-muted)" }}>
                        {content.length}/{charLimit}
                      </span>
                    </div>
                    <textarea
                      className="form-input"
                      placeholder="Nhập nội dung thông báo gửi đến người quan tâm Zalo OA..."
                      value={content}
                      onChange={(e) => setContent(e.target.value.slice(0, charLimit))}
                      style={{ minHeight: "120px", resize: "vertical", lineHeight: 1.6 }}
                      required={messageType === "text"}
                    />
                  </div>

                  {/* URL (optional) */}
                  <div>
                    <label className="form-label">Đường dẫn kèm theo <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(tùy chọn)</span></label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://... — nếu có, sẽ thêm nút 'Xem chi tiết'"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  
                  {/* Image URL (optional) */}
                  <div>
                    <label className="form-label">Hình ảnh kèm theo <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(tùy chọn)</span></label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ flex: 1 }} 
                        value={imageUrl} 
                        placeholder="Nhập link hoặc tải ảnh lên"
                        onChange={(e) => setImageUrl(e.target.value)} 
                      />
                      <label 
                        htmlFor="single-file-upload" 
                        style={{ 
                          padding: "8px 16px", background: "#f1f5f9", border: "1px solid var(--border)", 
                          borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                          color: "#334155", fontWeight: 600, fontSize: "0.8rem", flexShrink: 0, height: "40px"
                        }}
                      >
                        {uploadingIndex === -1 ? "⏳..." : "📁 Tải lên"}
                      </label>
                      <input 
                        id="single-file-upload" 
                        type="file" 
                        accept="image/*" 
                        style={{ display: "none" }} 
                        onChange={handleSingleImageUpload} 
                      />
                    </div>
                  </div>
                </>
              )}



              {messageType === "list" && (
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "0.95rem" }}>Thiết kế Thành phần (Các thẻ tham số)</h4>
                  {listElements.map((el, index) => (
                    <div key={index} style={{ background: "white", padding: "16px", borderRadius: "6px", border: "1px solid var(--border)", marginBottom: "16px", position: "relative" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Tham số {index + 1}</span>
                        <div style={{ display: "flex", gap: "10px" }}>

                          {listElements.length > 1 && (
                            <button type="button" onClick={() => removeElement(index)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem" }}>
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                        <div>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Tiêu đề của tham số {index + 1}</label>
                          <input type="text" className="form-input" style={{ padding: "6px 10px" }} value={el.title} onChange={(e) => handleElementChange(index, "title", e.target.value)} required={messageType === "list"} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Mô tả ngắn (Phụ đề)</label>
                          <input type="text" className="form-input" style={{ padding: "6px 10px" }} value={el.subtitle || ""} placeholder="VD: Bấm để xem chi tiết thông báo..." onChange={(e) => handleElementChange(index, "subtitle", e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Đường dẫn hình ảnh</label>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "6px 10px", flex: 1 }} 
                              value={el.imageUrl} 
                              placeholder="Nhập link hoặc tải ảnh lên"
                              onChange={(e) => handleElementChange(index, "imageUrl", e.target.value)} 
                              required={messageType === "list"} 
                            />
                            <label 
                              htmlFor={`file-upload-${index}`} 
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
                                fontWeight: 600,
                                transition: "all 0.15s"
                              }}
                            >
                              {uploadingIndex === index ? "⏳..." : "📁 Tải ảnh"}
                            </label>
                            <input 
                              type="file" 
                              id={`file-upload-${index}`} 
                              accept="image/*" 
                              style={{ display: "none" }} 
                              onChange={(e) => handleImageUpload(index, e)} 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: "0.8rem" }}>Loại hành động</label>
                          <select className="form-input" style={{ padding: "6px 10px" }} value={el.actionType} onChange={(e) => handleElementChange(index, "actionType", e.target.value)}>
                            <option value="oa.open.url">Mở 1 đường dẫn</option>
                            <option value="oa.query.show">Gởi 1 tin nhắn đến OA</option>
                            <option value="oa.query.hide">Gởi 1 tin nhắn ẩn đến OA</option>
                            <option value="oa.open.sms">Mở ứng dụng gởi sms</option>
                            <option value="oa.open.phone">Mở ứng dụng gọi điện thoại</option>
                          </select>
                        </div>
                        
                        {/* Dynamic Action Value */}
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
                              el.actionType.includes("query") ? "Vd: Tôi muốn tư vấn" : 
                              "090..."
                            }
                            onChange={(e) => handleElementChange(index, "actionValue", e.target.value)} 
                            required={messageType === "list"} 
                          />
                        </div>

                        {/* Additional SMS Content Field */}
                        {el.actionType === "oa.open.sms" && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <label className="form-label" style={{ fontSize: "0.8rem" }}>Nội dung tin nhắn SMS</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ padding: "6px 10px" }} 
                              value={el.actionSmsContent} 
                              placeholder="Vd: Xin chào, tôi cần hỗ trợ..."
                              onChange={(e) => handleElementChange(index, "actionSmsContent", e.target.value)} 
                              required={messageType === "list" && el.actionType === "oa.open.sms"} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    {listElements.length < 5 && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={addElement} style={{ flex: 1, padding: "8px" }}>
                        + Thêm tham số trống
                      </button>
                    )}
                    {listElements.length < 5 && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => { setMessageType("list"); openCmsModal(); }} style={{ flex: 1, padding: "8px", color: "var(--primary)", borderColor: "var(--primary)" }}>
                        📰 Thêm từ Website CMS
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "12px", textAlign: "center" }}>
                    Zalo hỗ trợ tối đa 5 thẻ trong một tin nhắn danh sách.
                  </p>
                </div>
              )}

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "#f0f9ff", padding: "10px 14px", borderRadius: "var(--radius)", border: "1px solid #bae6fd" }}>
                💡 <strong>Tin Truyền Thông</strong> được gửi qua Zalo OA dưới dạng template và gửi tuần tự đến từng người.
                Thời gian gửi phụ thuộc vào số lượng người quan tâm (mỗi người ~100ms).
              </div>

              {/* Result notice */}
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
                    ? `✅ Đã gửi thành công ${result.successCount}/${result.total} người${result.failCount > 0 ? ` (${result.failCount} lỗi)` : ""}`
                    : `Lỗi: ${result.error}`
                  }
                </div>
              )}

              {/* Send button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || (messageType === "text" && (!title.trim() || !content.trim()))}
                  style={{ minWidth: "160px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {sending ? (
                    <>
                      <div className="spinner" style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      📣 {scope === "all" ? "Gửi đến tất cả" : `Gửi đến ${selectedIds.length || "..."} người`}
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </form>

        {/* === RIGHT: Broadcast History === */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">📋 Lịch sử gửi tin</div>
            <button className="btn btn-ghost btn-sm" onClick={fetchHistory} style={{ fontSize: "0.75rem" }}>🔄 Làm mới</button>
          </div>
          <div style={{ padding: "0" }}>
            {loadingHistory ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>Đang tải...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</div>
                <div>Chưa có tin nào được gửi</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {history.map((log) => {
                  let payload = {};
                  try { payload = JSON.parse(log.rawPayload || "{}"); } catch (_) {}
                  return (
                    <div key={log.id} style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <span style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: payload.scope === "all" ? "#dbeafe" : "#f3e8ff",
                          color: payload.scope === "all" ? "#1d4ed8" : "#7c3aed",
                          fontWeight: 600
                        }}>
                          {payload.scope === "all" ? "📢 Tất cả" : "🎯 Chọn lọc"}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {new Date(log.receivedAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: "6px", lineHeight: 1.5, wordBreak: "break-word" }}>
                        {log.content.length > 120 ? log.content.substring(0, 120) + "..." : log.content}
                      </div>
                      {(payload.successCount !== undefined || payload.sentCount !== undefined) && (
                        <div style={{ fontSize: "0.75rem", color: "var(--success)", fontWeight: 600 }}>
                          ✅ Đã gửi: {payload.successCount ?? payload.sentCount}
                          {payload.total !== undefined ? `/${payload.total}` : ""} người
                          {payload.failCount > 0 ? ` (${payload.failCount} lỗi)` : ""}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

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
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text)" }}>📰 Chọn bài từ Website CMS</h3>
              <button type="button" onClick={() => setIsCmsModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {/* Search */}
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

            {/* Content */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              {cmsLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
                  Đang tải danh sách bài viết...
                </div>
              ) : cmsError ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--danger)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>⚠️</div>
                  <div style={{ fontWeight: 600, marginBottom: "6px" }}>{cmsError}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Kiểm tra lại URL Website CMS trong mục Cài đặt → Kết nối Website CMS</div>
                </div>
              ) : cmsArticles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>📭 Không tìm thấy bài viết nào.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {cmsArticles.map((article) => {
                    let imgPath = article.image?.sizes?.card?.url || article.image?.url || "";
                    if (imgPath.startsWith("http")) {
                      try { imgPath = new URL(imgPath).pathname; } catch (e) {}
                    }
                    const thumbUrl = imgPath.startsWith("/") && cmsUrl ? `${cmsUrl}${imgPath}` : imgPath;
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
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {article.description}
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

            {/* Pagination + Footer */}
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
