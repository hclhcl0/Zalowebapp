"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export default function NewsManager({ category, title, description }) {
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "staff";
  const isStaff = userRole === "staff";

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null); // null if creating, article object if editing
  const [syncing, setSyncing] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCoverUrl, setFormCoverUrl] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formPublish, setFormPublish] = useState(false);
  const [formBroadcast, setFormBroadcast] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tải ảnh lên thất bại");
      }

      setFormCoverUrl(data.url);
      setSuccessMsg("Tải ảnh bìa lên thành công!");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  // Load articles
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?category=${category}`);
      const json = await res.json();
      if (json.data) {
        setArticles(json.data);
      }
    } catch (err) {
      console.error("Error fetching articles:", err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Open editor
  const handleOpenCreate = () => {
    setCurrentArticle(null);
    setFormTitle("");
    setFormContent("");
    setFormCoverUrl("");
    setFormSummary("");
    setFormPublish(false);
    setFormBroadcast(false);
    setErrorMsg("");
    setSuccessMsg("");
    setIsEditing(true);
  };

  const handleOpenEdit = (article) => {
    setCurrentArticle(article);
    setFormTitle(article.title);
    setFormContent(article.content);
    setFormCoverUrl(article.coverUrl || "");
    setFormSummary(article.summary || "");
    setFormPublish(article.isPublished);
    setFormBroadcast(false); // reset broadcast option
    setErrorMsg("");
    setSuccessMsg("");
    setIsEditing(true);
  };

  // Close editor
  const handleCloseEditor = () => {
    setIsEditing(false);
    setCurrentArticle(null);
  };

  // Submit form (Save / Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(true);

    if (!formTitle.trim() || !formContent.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ tiêu đề và nội dung.");
      setActionLoading(false);
      return;
    }

    try {
      const url = currentArticle ? `/api/news/${currentArticle.id}` : "/api/news";
      const method = currentArticle ? "PUT" : "POST";
      const payload = {
        title: formTitle,
        content: formContent,
        coverUrl: formCoverUrl,
        summary: formSummary,
        category,
        isPublished: isStaff ? false : formPublish,
        publish: isStaff ? false : formPublish,
        broadcastNow: isStaff ? false : formBroadcast,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra");
      }

      setSuccessMsg(currentArticle ? "Cập nhật bài viết thành công!" : "Tạo bài viết mới thành công!");
      setIsEditing(false);
      fetchArticles();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete article
  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.")) {
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể xóa bài viết");
      setSuccessMsg("Đã xóa bài viết thành công.");
      fetchArticles();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Quick publish / unpublish (only for admin)
  const handleTogglePublish = async (article) => {
    try {
      const res = await fetch(`/api/news/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: !article.isPublished
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Thao tác thất bại");
      setSuccessMsg(article.isPublished ? "Đã hạ bài viết xuống bản nháp." : "Đã xuất bản bài viết.");
      fetchArticles();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Publish to Zalo OA (only for admin)
  const handlePublishZalo = async (article) => {
    if (!article.coverUrl) {
      setErrorMsg("Bài viết chưa có Ảnh bìa (Cover URL). Vui lòng chỉnh sửa và cập nhật Ảnh bìa trước khi đăng lên Zalo.");
      return;
    }
    
    if (!confirm("Bạn có chắc chắn muốn xuất bản bài viết này lên hệ thống Zalo OA (Media Store)?")) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setActionLoading(true);

    try {
      const res = await fetch(`/api/news/${article.id}/publish-zalo`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể đăng bài lên Zalo OA");
      
      setSuccessMsg("Đã đăng bài viết lên Zalo OA thành công! (Mã bài viết: " + data.data.zaloArticleId + ")");
      fetchArticles();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Sync articles from Zalo OA
  const handleSyncZalo = async () => {
    if (!confirm("Bạn có chắc chắn muốn đồng bộ toàn bộ bài viết từ Zalo OA về database không? Quá trình này sẽ mất một vài giây.")) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");
    setSyncing(true);

    try {
      const res = await fetch("/api/news/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể đồng bộ bài viết từ Zalo OA");
      
      setSuccessMsg(`Đồng bộ thành công! Đã thêm mới ${data.createdCount} bài viết và cập nhật ${data.updatedCount} bài viết từ Zalo OA.`);
      fetchArticles();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-desc">{description}</p>
        </div>
        {!isEditing && (
          <div style={{ display: "flex", gap: "10px" }}>
            {!isStaff && (
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleSyncZalo}
                disabled={syncing}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {syncing ? "⏳ Đang đồng bộ..." : "🔁 Đồng bộ từ Zalo"}
              </button>
            )}
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              ➕ Soạn tin mới
            </button>
          </div>
        )}
      </div>

      {/* Alert Messages */}
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

      {isEditing ? (
        /* News Editor Composer Block */
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
              {currentArticle ? "✏️ Chỉnh sửa bài viết" : "✍️ Soạn thảo bài viết mới"}
            </h3>
            <button className="btn btn-outline btn-sm" onClick={handleCloseEditor}>
              Quay lại danh sách
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="article-title">Tiêu đề bài viết</label>
              <input
                id="article-title"
                type="text"
                className="form-input"
                placeholder="Nhập tiêu đề hấp dẫn..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="article-cover">Ảnh Bìa (Bắt buộc nếu đăng Zalo)</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  id="article-cover"
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="https://example.com/image.jpg hoặc tải lên..."
                  value={formCoverUrl}
                  onChange={(e) => setFormCoverUrl(e.target.value)}
                />
                <label
                  htmlFor="cover-upload"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: "10px 16px",
                    fontSize: "0.85rem",
                    margin: 0,
                    whiteSpace: "nowrap",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "#f1f5f9",
                    color: "#334155",
                    fontWeight: 600,
                    transition: "all 0.15s"
                  }}
                >
                  {uploadingCover ? "⏳..." : "📁 Tải ảnh"}
                </label>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCover}
                  style={{ display: "none" }}
                />
              </div>
              <small style={{ color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Ảnh bìa dung lượng dưới 1MB. Hỗ trợ định dạng JPG, PNG.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="article-summary">Mô tả ngắn (Tuỳ chọn)</label>
              <textarea
                id="article-summary"
                className="form-input"
                placeholder="Tóm tắt ngắn gọn nội dung bài viết..."
                rows={2}
                value={formSummary}
                onChange={(e) => setFormSummary(e.target.value)}
              />
            </div>


            <div className="form-group">
              <label className="form-label" htmlFor="article-content">Nội dung bài viết</label>
              <textarea
                id="article-content"
                className="form-textarea"
                placeholder="Viết nội dung bài viết chi tiết tại đây..."
                rows={12}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                style={{ fontFamily: "inherit", fontSize: "0.9rem", lineHeight: 1.6 }}
                required
              />
            </div>

            {/* Phân quyền Option cho Admin / Staff */}
            <div style={{ background: "var(--bg)", padding: "16px", borderRadius: "var(--radius)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                🔒 QUYỀN HẠN PHÁT HÀNH
              </div>
              
              {isStaff ? (
                <div style={{ color: "var(--warning)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  ⚠️ Tài khoản của bạn là <strong>Nhân viên</strong>. Bạn chỉ được lưu bài dưới dạng <strong>Bản nháp</strong>. Admin sẽ duyệt và phát hành bài viết này.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      id="form-publish"
                      checked={formPublish}
                      onChange={(e) => setFormPublish(e.target.checked)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="form-publish" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
                      🚀 Xuất bản ngay (Mọi người có thể đọc)
                    </label>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      id="form-broadcast"
                      checked={formBroadcast}
                      onChange={(e) => setFormBroadcast(e.target.checked)}
                      style={{ width: "16px", height: "16px", cursor: "pointer" }}
                    />
                    <label htmlFor="form-broadcast" style={{ fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", color: "var(--primary)" }}>
                      📢 Gửi tin broadcast khẩn cấp đến toàn bộ người theo dõi Zalo OA
                    </label>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
              <button type="button" className="btn btn-outline" onClick={handleCloseEditor} disabled={actionLoading}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                {actionLoading ? "Đang lưu..." : (isStaff ? "💾 Lưu Bản Nháp" : "💾 Lưu & Hoàn Tất")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Articles List */
        <div className="card">
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)", width: 28, height: 28, marginRight: "10px" }} />
              Đang tải danh sách bài viết...
            </div>
          ) : articles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              📭 Chưa có bài viết nào trong mục này. Bấm nút "Soạn tin mới" phía trên để tạo.
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "12px 8px" }}>Bài viết</th>
                    <th style={{ padding: "12px 8px", width: "150px" }}>Ngày tạo</th>
                    <th style={{ padding: "12px 8px", width: "120px" }}>Trạng thái</th>
                    <th style={{ padding: "12px 8px", width: "200px" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}>
                      <td style={{ padding: "16px 8px" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text)", marginBottom: "4px" }}>
                          {article.title}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "450px", marginBottom: "4px" }}>
                          {article.content}
                        </div>
                        {article.zaloArticleId && (
                          <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>🔹 Zalo ID: {article.zaloArticleId}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {new Date(article.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td style={{ padding: "16px 8px" }}>
                        {article.isPublished ? (
                          <span className="badge badge-success">Đã xuất bản</span>
                        ) : (
                          <span className="badge badge-pending">Bản nháp</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 8px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenEdit(article)} style={{ padding: "4px 8px" }}>
                            ✏️ Sửa
                          </button>
                          
                          {/* Admin only actions */}
                          {!isStaff && (
                            <>
                              <button
                                className={`btn btn-sm ${article.isPublished ? "btn-outline" : "btn-primary"}`}
                                onClick={() => handleTogglePublish(article)}
                                style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                              >
                                {article.isPublished ? "Hạ nháp" : "Xuất bản"}
                              </button>
                              
                              <button
                                className="btn btn-sm"
                                onClick={() => handlePublishZalo(article)}
                                style={{ padding: "4px 8px", fontSize: "0.75rem", background: "#0068ff", color: "white", border: "none" }}
                                disabled={actionLoading}
                              >
                                🚀 Đăng Zalo OA
                              </button>

                              <button className="btn btn-outline btn-sm" onClick={() => handleDelete(article.id)} style={{ padding: "4px 8px", color: "var(--danger)", borderColor: "var(--danger)" }}>
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
