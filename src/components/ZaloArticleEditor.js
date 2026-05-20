"use client";

import { useState, useEffect, useRef } from "react";

export default function ZaloArticleEditor({ 
  article, 
  category, 
  isStaff, 
  onSave, 
  onCancel,
  actionLoading 
}) {
  // Form states matching Zalo OA article editor
  const [title, setTitle] = useState(article?.title || "");
  const [summary, setSummary] = useState(article?.summary || "");
  const [author, setAuthor] = useState(article?.author || "CDC Đà Nẵng");
  const [coverUrl, setCoverUrl] = useState(article?.coverUrl || "");
  const [content, setContent] = useState(article?.content || "");
  
  // Publish configuration
  const [publish, setPublish] = useState(article?.isPublished || false);
  const [broadcastNow, setBroadcastNow] = useState(false);

  const [quillLoaded, setQuillLoaded] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const editorRef = useRef(null);
  const quillInstance = useRef(null);

  // Load Quill assets from CDN
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Avoid duplicate css
    if (!document.getElementById("quill-cdn-css")) {
      const link = document.createElement("link");
      link.id = "quill-cdn-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.snow.css";
      document.head.appendChild(link);
    }

    const initQuill = () => {
      if (quillInstance.current) return;

      const Quill = window.Quill;
      if (!Quill) return;

      // Custom font/size/align configurations if any
      
      quillInstance.current = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: "#zalo-toolbar"
        },
        placeholder: "Viết nội dung bài viết chi tiết tại đây..."
      });

      // Set initial content
      if (content) {
        quillInstance.current.clipboard.dangerouslyPasteHTML(content);
      }

      // Update content state on change
      quillInstance.current.on("text-change", () => {
        setContent(quillInstance.current.root.innerHTML);
      });

      setQuillLoaded(true);
    };

    if (window.Quill) {
      initQuill();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/quill@2.0.2/dist/quill.js";
      script.onload = initQuill;
      document.body.appendChild(script);
    }
  }, []);

  // Update content if article changes (e.g. edit mode loaded)
  useEffect(() => {
    if (quillInstance.current && article) {
      const currentHTML = quillInstance.current.root.innerHTML;
      if (currentHTML !== article.content) {
        quillInstance.current.clipboard.dangerouslyPasteHTML(article.content || "");
      }
    }
  }, [article]);

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

      setCoverUrl(data.url);
      setSuccessMsg("Tải ảnh bìa thành công!");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Tiêu đề bài viết không được để trống.");
      return;
    }
    if (!summary.trim()) {
      setErrorMsg("Trích dẫn không được để trống.");
      return;
    }
    if (content === "" || content === "<p><br></p>") {
      setErrorMsg("Nội dung bài viết không được để trống.");
      return;
    }

    onSave({
      title,
      summary,
      author,
      coverUrl,
      content,
      isPublished: isStaff ? false : publish,
      publish: isStaff ? false : publish,
      broadcastNow: isStaff ? false : broadcastNow
    });
  };

  const lastEditedTime = article?.updatedAt 
    ? new Date(article.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
    : "";

  return (
    <div className="zalo-editor-card">
      <div className="zalo-editor-header">
        <h2>{article ? "✏️ Sửa bài viết" : "✍️ Soạn bài viết mới"}</h2>
        <button className="zalo-btn zalo-btn-secondary" onClick={onCancel}>
          Quay lại danh sách
        </button>
      </div>

      {successMsg && (
        <div className="zalo-alert zalo-alert-success">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="zalo-alert zalo-alert-danger">{errorMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="zalo-editor-form">
        {/* Row 1: Tiêu đề */}
        <div className="zalo-editor-row">
          <div className="zalo-editor-label">
            Tiêu đề <span className="zalo-required">*</span>
          </div>
          <div className="zalo-editor-field">
            <input
              type="text"
              maxLength={150}
              className="zalo-input"
              placeholder="Nhập tiêu đề bài viết (tối đa 150 ký tự)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div className="zalo-char-counter">{title.length}/150</div>
          </div>
        </div>

        {/* Row 2: Trích dẫn */}
        <div className="zalo-editor-row">
          <div className="zalo-editor-label">
            Trích dẫn <span className="zalo-required">*</span>
          </div>
          <div className="zalo-editor-field">
            <textarea
              maxLength={300}
              rows={3}
              className="zalo-textarea"
              placeholder="Nhập trích dẫn tóm tắt nội dung bài viết (tối đa 300 ký tự)..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
            <div className="zalo-char-counter">{summary.length}/300</div>
          </div>
        </div>

        {/* Row 3: Tác giả */}
        <div className="zalo-editor-row">
          <div className="zalo-editor-label">Tác giả</div>
          <div className="zalo-editor-field">
            <div className="zalo-author-container">
              <input
                type="text"
                maxLength={50}
                className="zalo-input zalo-author-input"
                placeholder="Tên tác giả..."
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
              {lastEditedTime && (
                <span className="zalo-last-edit">
                  Chỉnh sửa lần cuối vào {lastEditedTime}
                </span>
              )}
            </div>
            <div className="zalo-char-counter">{author.length}/50</div>
          </div>
        </div>

        {/* Row 4: Ảnh bìa (Cover Upload) */}
        <div className="zalo-editor-row">
          <div className="zalo-editor-label">Ảnh bìa</div>
          <div className="zalo-editor-field">
            <div className="zalo-cover-uploader-box">
              {coverUrl ? (
                <div className="zalo-cover-preview-container">
                  <img src={coverUrl} alt="Cover Preview" className="zalo-cover-preview-img" />
                  <button 
                    type="button" 
                    className="zalo-cover-remove-btn" 
                    onClick={() => setCoverUrl("")}
                    title="Xóa ảnh bìa"
                  >
                    ❌ Xóa ảnh
                  </button>
                </div>
              ) : (
                <label className="zalo-cover-upload-placeholder">
                  <div className="zalo-cover-upload-icon">📷</div>
                  <div className="zalo-cover-upload-text">
                    {uploadingCover ? "Đang tải lên..." : "Tải ảnh bìa lên (Dung lượng < 1MB, tỉ lệ gợi ý 16:9)"}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCover}
                    style={{ display: "none" }}
                    disabled={uploadingCover}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Nội dung (Quill WYSIWYG Editor) */}
        <div className="zalo-editor-row">
          <div className="zalo-editor-label">
            Nội dung <span className="zalo-required">*</span>
          </div>
          <div className="zalo-editor-field">
            <div className="zalo-editor-container">
              {/* Custom Toolbar */}
              <div id="zalo-toolbar" className="zalo-toolbar">
                <select className="ql-header" defaultValue="">
                  <option value="">Bình thường</option>
                  <option value="1">Tiêu đề 1</option>
                  <option value="2">Tiêu đề 2</option>
                  <option value="3">Tiêu đề 3</option>
                  <option value="4">Tiêu đề 4</option>
                </select>

                <span className="ql-formats-separator"></span>

                <button className="ql-bold" type="button" title="Chữ đậm"></button>
                <button className="ql-italic" type="button" title="Chữ nghiêng"></button>
                <button className="ql-underline" type="button" title="Gạch chân"></button>

                <span class="ql-formats-separator"></span>

                <button className="ql-list" value="bullet" type="button" title="Danh sách tròn"></button>
                <button className="ql-list" value="ordered" type="button" title="Danh sách số"></button>

                <span class="ql-formats-separator"></span>

                <button className="ql-indent" value="-1" type="button" title="Giảm lề"></button>
                <button className="ql-indent" value="+1" type="button" title="Tăng lề"></button>

                <span class="ql-formats-separator"></span>

                <button className="ql-blockquote" type="button" title="Trích dẫn khối"></button>

                <span class="ql-formats-separator"></span>

                <select className="ql-align" defaultValue="">
                  <option value=""></option>
                  <option value="center"></option>
                  <option value="right"></option>
                  <option value="justify"></option>
                </select>

                <span class="ql-formats-separator"></span>

                <button className="ql-image" type="button" title="Chèn ảnh"></button>
                <button className="ql-video" type="button" title="Chèn video"></button>
                <button className="ql-link" type="button" title="Chèn liên kết"></button>

                <span class="ql-formats-separator"></span>

                <select className="ql-color" title="Màu chữ"></select>
                <select className="ql-background" title="Màu nền"></select>

                <span class="ql-formats-separator"></span>
                <button className="ql-clean" type="button" title="Xóa định dạng"></button>
              </div>

              {/* Editor Text Area */}
              <div 
                ref={editorRef} 
                className="zalo-editor-body"
                style={{ minHeight: "350px" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Quyền hạn phát hành */}
        <div className="zalo-publish-section">
          <h4>🔒 QUYỀN HẠN PHÁT HÀNH</h4>
          {isStaff ? (
            <div className="zalo-staff-warning">
              ⚠️ Tài khoản của bạn là <strong>Nhân viên</strong>. Bài viết sẽ lưu dưới dạng <strong>Bản nháp</strong> để Admin duyệt.
            </div>
          ) : (
            <div className="zalo-publish-options">
              <label className="zalo-checkbox-label">
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                />
                🚀 Xuất bản bài viết ngay (Đọc trực tiếp trên CDC Dashboard)
              </label>

              <label className="zalo-checkbox-label" style={{ color: "var(--primary)" }}>
                <input
                  type="checkbox"
                  checked={broadcastNow}
                  onChange={(e) => setBroadcastNow(e.target.checked)}
                />
                📢 Gửi tin broadcast khẩn cấp đến toàn bộ người theo dõi Zalo OA
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="zalo-editor-actions">
          <button 
            type="button" 
            className="zalo-btn zalo-btn-secondary" 
            onClick={onCancel}
            disabled={actionLoading}
          >
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            className="zalo-btn zalo-btn-primary" 
            disabled={actionLoading || !quillLoaded}
          >
            {actionLoading ? "Đang lưu..." : (isStaff ? "💾 Lưu Bản Nháp" : "💾 Lưu & Hoàn Tất")}
          </button>
        </div>
      </form>

      {/* Embedded CSS styles matching the Zalo OA style */}
      <style jsx global>{`
        .zalo-editor-card {
          background: #ffffff;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }

        .zalo-editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .zalo-editor-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
        }

        .zalo-editor-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .zalo-editor-row {
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .zalo-editor-row {
            flex-direction: column;
            gap: 6px;
          }
          .zalo-editor-label {
            width: 100% !important;
            padding-top: 0 !important;
          }
        }

        .zalo-editor-label {
          width: 140px;
          font-weight: 600;
          font-size: 0.9rem;
          color: #334155;
          padding-top: 10px;
          text-align: left;
        }

        .zalo-required {
          color: #ef4444;
          margin-left: 2px;
        }

        .zalo-editor-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          width: 100%;
        }

        .zalo-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 0.9rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          transition: all 0.15s ease;
          background: #ffffff;
          color: #0f172a;
        }

        .zalo-input:focus, .zalo-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .zalo-textarea {
          width: 100%;
          padding: 10px 14px;
          font-size: 0.9rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          resize: vertical;
          transition: all 0.15s ease;
          font-family: inherit;
          color: #0f172a;
          background: #ffffff;
        }

        .zalo-char-counter {
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: right;
          margin-top: 2px;
          font-weight: 500;
        }

        .zalo-author-container {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
        }

        .zalo-author-input {
          max-width: 250px;
        }

        .zalo-last-edit {
          font-size: 0.8rem;
          color: #64748b;
          font-style: italic;
        }

        /* Cover Image Uploader Box */
        .zalo-cover-uploader-box {
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
          overflow: hidden;
          transition: border-color 0.15s ease;
        }

        .zalo-cover-uploader-box:hover {
          border-color: #94a3b8;
        }

        .zalo-cover-upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          cursor: pointer;
          min-height: 120px;
          text-align: center;
        }

        .zalo-cover-upload-icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .zalo-cover-upload-text {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .zalo-cover-preview-container {
          position: relative;
          width: 100%;
          max-height: 250px;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #000;
        }

        .zalo-cover-preview-img {
          width: 100%;
          height: auto;
          max-height: 250px;
          object-fit: cover;
        }

        .zalo-cover-remove-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: background 0.15s;
        }

        .zalo-cover-remove-btn:hover {
          background: #dc2626;
        }

        /* Quill Editor Styling */
        .zalo-editor-container {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
          background: #ffffff;
        }

        .zalo-toolbar {
          border-bottom: 1px solid #cbd5e1 !important;
          background: #f8fafc;
          padding: 8px 12px !important;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
        }

        .zalo-toolbar button, .zalo-toolbar select {
          margin: 0 !important;
          height: 28px !important;
          padding: 3px 5px !important;
          border-radius: 4px;
        }

        .ql-formats-separator {
          width: 1px;
          height: 18px;
          background: #cbd5e1;
          margin: 0 6px;
          display: inline-block;
        }

        .zalo-editor-body {
          font-size: 0.95rem;
          line-height: 1.6;
          color: #0f172a;
          border: none !important;
          padding: 16px !important;
        }

        .zalo-editor-body p {
          margin-bottom: 12px;
        }

        /* Publish section */
        .zalo-publish-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .zalo-publish-section h4 {
          font-size: 0.8rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .zalo-staff-warning {
          font-size: 0.85rem;
          color: #d97706;
          font-weight: 500;
        }

        .zalo-publish-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .zalo-checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          color: #334155;
        }

        .zalo-checkbox-label input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        /* Actions */
        .zalo-editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
        }

        .zalo-btn {
          padding: 10px 20px;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .zalo-btn-primary {
          background: #0068ff;
          color: white;
          border: none;
        }

        .zalo-btn-primary:hover {
          background: #0052cc;
        }

        .zalo-btn-primary:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }

        .zalo-btn-secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }

        .zalo-btn-secondary:hover {
          background: #e2e8f0;
        }

        .zalo-alert {
          padding: 12px 16px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .zalo-alert-success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .zalo-alert-danger {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
      `}</style>
    </div>
  );
}
