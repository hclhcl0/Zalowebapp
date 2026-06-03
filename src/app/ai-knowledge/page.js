"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, FileText, Upload, BrainCircuit, Download, RefreshCw, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { CDC_DEPARTMENTS } from "@/lib/departments";

export default function AiKnowledgePage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  
  const [uploadType, setUploadType] = useState("file"); // "file" or "link"
  const [driveUrl, setDriveUrl] = useState("");
  const [driveExt, setDriveExt] = useState("pdf");
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CDC_DEPARTMENTS[0]);
  const [allowedDepartment, setAllowedDepartment] = useState("ALL");
  const fileInputRef = useRef(null);

  // Phân trang & Tìm kiếm
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Lưu giá trị input đang gõ

  const fetchDocuments = async (currentPage = page, searchStr = searchKeyword) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(searchStr)}`);
      const json = await res.json();
      if (json.success) {
        setDocuments(json.data);
        setTotalPages(json.totalPages);
        setTotalDocs(json.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(page, searchKeyword);
  }, [page, searchKeyword]);

  // Update category if staff has a department
  useEffect(() => {
    if (session?.user?.role === "staff" && session?.user?.department) {
      setCategory(session.user.department);
      setAllowedDepartment(session.user.department);
    }
  }, [session]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchKeyword(searchInput);
    setPage(1); // Reset về trang 1 khi tìm kiếm mới
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    if (uploadType === "file") {
      const file = fileInputRef.current?.files[0];
      if (!file) {
        alert("Vui lòng chọn file PDF, DOCX, PPTX, TXT, XLSX hoặc CSV!");
        return;
      }
      formData.append("file", file);
      formData.append("title", title || file.name);
    } else {
      if (!driveUrl.includes("google.com")) {
        alert("Vui lòng nhập link Google Drive/Docs/Sheets hợp lệ!");
        return;
      }
      formData.append("driveUrl", driveUrl);
      formData.append("driveExt", driveExt);
      formData.append("title", title || "Tài liệu từ Drive");
    }

    formData.append("category", category);
    formData.append("allowedDepartment", allowedDepartment);

    setUploading(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        alert("Thêm tài liệu thành công!");
        setTitle("");
        setDriveUrl("");
        if (session?.user?.role !== "staff") {
          setCategory(CDC_DEPARTMENTS[0]);
          setAllowedDepartment("ALL");
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchDocuments(1, searchKeyword); // Tải lại danh sách
      } else {
        alert("Lỗi: " + json.error);
      }
    } catch (err) {
      alert("Đã xảy ra lỗi khi tải lên!");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, docTitle) => {
    if (!confirm(`Bạn có chắc chắn muốn xoá tài liệu "${docTitle}" không?`)) return;
    
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchDocuments(page, searchKeyword);
      } else {
        alert("Lỗi: " + json.error);
      }
    } catch (err) {
      alert("Lỗi kết nối");
    }
  };

  const handleDownload = async (doc) => {
    try {
      // Vì danh sách ko còn content, ta phải gọi API lấy detail
      const res = await fetch(`/api/knowledge/${doc.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const blob = new Blob([json.data.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const baseName = doc.title.replace(/\.[^.]+$/, "");
        a.download = `${baseName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert("Không thể lấy nội dung tài liệu.");
      }
    } catch (err) {
      alert("Lỗi kết nối tải file.");
    }
  };

  const handleSync = async (doc) => {
    if (!confirm(`Bạn muốn hệ thống kết nối vào Google Drive và làm mới lại nội dung của "${doc.title}"?`)) return;
    setSyncingId(doc.id);
    try {
      const res = await fetch(`/api/knowledge/${doc.id}/sync`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert("Đồng bộ thành công! Nội dung mới nhất đã được nạp cho AI.");
        fetchDocuments(page, searchKeyword);
      } else {
        alert("Lỗi đồng bộ: " + json.error);
      }
    } catch (err) {
      alert("Lỗi kết nối khi đồng bộ.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧠 Kho Tri Thức AI</h1>
          <p className="page-desc">Quản lý và dán nhãn các tài liệu chuyên môn để AI học và trả lời người dân.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "24px" }}>
        {/* Danh sách tài liệu */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <BrainCircuit className="w-5 h-5 text-primary" />
              Tài liệu đã nạp {totalDocs > 0 ? `(${totalDocs})` : ""}
            </h2>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu..."
                  className="form-input"
                  style={{ padding: "6px 12px", minWidth: "200px" }}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="btn btn-outline btn-sm" style={{ padding: "6px 10px" }}>
                  <Search className="w-4 h-4" />
                </button>
              </form>
              <a 
                href="/api/knowledge/backup" 
                className="btn btn-outline btn-sm" 
                download 
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "white" }}
              >
                📥 Sao lưu (JSON)
              </a>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
              <div className="spinner" style={{ margin: "0 auto 12px", width: 24, height: 24, borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
              Đang tải danh sách...
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px dashed var(--border)", flex: 1 }}>
              Không tìm thấy tài liệu nào.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {documents.map((doc) => (
                <div key={doc.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "white" }}>
                  <div style={{ padding: "10px", background: "var(--primary-light)", borderRadius: "8px", color: "var(--primary)" }}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text)" }}>{doc.title}</h3>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span className="badge" style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
                          {doc.category}
                        </span>
                        {doc.allowedDepartment ? (
                          <span className="badge" style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" }}>
                            🔒 Chỉ {doc.allowedDepartment}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe" }}>
                            🌐 Tất cả cơ quan
                          </span>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>Đã nạp: {new Date(doc.createdAt).toLocaleString("vi-VN")}</span>
                      {doc.sourceUrl && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem" }}>
                          🔗 Google Drive
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div style={{ display: "flex", gap: "4px" }}>
                    {doc.sourceUrl && (
                      <button 
                        onClick={() => handleSync(doc)} 
                        disabled={syncingId === doc.id}
                        className="btn btn-ghost btn-sm" 
                        style={{ color: "#0ea5e9", padding: "8px" }} 
                        title="Đồng bộ lại từ Google Drive"
                      >
                        {syncingId === doc.id ? (
                           <span className="spinner" style={{ width: 14, height: 14, borderColor: "var(--border)", borderTopColor: "#0ea5e9" }} />
                        ) : (
                           <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button onClick={() => handleDownload(doc)} className="btn btn-ghost btn-sm" style={{ color: "var(--primary)", padding: "8px" }} title="Tải về dạng .txt">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(doc.id, doc.title)} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", padding: "8px" }} title="Xóa tài liệu này">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "24px", gap: "16px" }}>
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
                className="btn btn-outline btn-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                Trang {page} / {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
                className="btn btn-outline btn-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Form Upload */}
        <div className="card" style={{ height: "fit-content", position: "sticky", top: "24px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Upload className="w-5 h-5 text-primary" />
            Nạp tài liệu mới
          </h2>
          
          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên tài liệu (Tùy chọn)</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Phác đồ điều trị Sốt xuất huyết"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Chuyên môn (Tag)</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={session?.user?.role === "staff"}
                required
                style={{ cursor: session?.user?.role === "staff" ? "not-allowed" : "pointer" }}
              >
                {CDC_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {session?.user?.role === "staff" && (
                <p style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px" }}>
                  * Tự động gán theo phòng ban của bạn.
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Quyền xem tài liệu</label>
              <select
                className="form-input"
                value={allowedDepartment}
                onChange={(e) => setAllowedDepartment(e.target.value)}
                disabled={session?.user?.role === "staff"}
                required
                style={{ cursor: session?.user?.role === "staff" ? "not-allowed" : "pointer" }}
              >
                <option value="ALL">🌐 Tất cả cơ quan & người dân</option>
                {CDC_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>🔒 Chỉ {d}</option>
                ))}
              </select>
              {session?.user?.role === "staff" && (
                <p style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px" }}>
                  * Tài liệu của nhân viên mặc định chỉ dành riêng cho phòng ban của bạn.
                </p>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", background: "var(--bg)", padding: "4px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setUploadType("file")}
                style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", background: uploadType === "file" ? "white" : "transparent", boxShadow: uploadType === "file" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", fontWeight: uploadType === "file" ? 600 : 400, color: uploadType === "file" ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", transition: "all 0.2s" }}
              >
                Tải file lên
              </button>
              <button
                type="button"
                onClick={() => setUploadType("link")}
                style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "none", background: uploadType === "link" ? "white" : "transparent", boxShadow: uploadType === "link" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", fontWeight: uploadType === "link" ? 600 : 400, color: uploadType === "link" ? "var(--primary)" : "var(--text-muted)", cursor: "pointer", transition: "all 0.2s" }}
              >
                Link Google Drive
              </button>
            </div>

            {uploadType === "file" ? (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Chọn File (Hỗ trợ .PDF, .DOCX, .PPTX, .TXT, .XLSX, .CSV)</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.docx,.pptx,.txt,.md,.xlsx,.xls,.csv"
                  ref={fileInputRef}
                  required
                  style={{ padding: "8px", background: "var(--bg)" }}
                />
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Link Google Drive (Phải bật Bất kỳ ai có liên kết)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://drive.google.com/file/d/..."
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Định dạng file (để AI đọc đúng chuẩn)</label>
                  <select
                    className="form-input"
                    value={driveExt}
                    onChange={(e) => setDriveExt(e.target.value)}
                  >
                    <option value="pdf">PDF (Ảnh/Văn bản)</option>
                    <option value="docx">Word (.docx)</option>
                    <option value="pptx">PowerPoint (.pptx)</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV</option>
                    <option value="txt">Text (.txt)</option>
                  </select>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
              {uploading ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} /> Đang xử lý file...</>
              ) : (
                <><Plus className="w-4 h-4" /> Nạp vào Khối óc AI</>
              )}
            </button>
          </form>

          <div style={{ marginTop: "24px", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6, padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534" }}>
            <strong>💡 Mẹo:</strong> Tài liệu càng có cấu trúc rõ ràng thì AI học càng nhanh. File Word, PDF, Excel sẽ tự động được trích xuất thành văn bản (text/csv) để AI có thể ghi nhớ. Đặc biệt, dữ liệu bảng (Excel) rất hữu ích cho các bảng giá, lịch trực.
          </div>
        </div>
      </div>
    </div>
  );
}
