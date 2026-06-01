"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, FileText, Upload, BrainCircuit, Download } from "lucide-react";
import { useSession } from "next-auth/react";
import { CDC_DEPARTMENTS } from "@/lib/departments";

export default function AiKnowledgePage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("file"); // "file" or "link"
  const [driveUrl, setDriveUrl] = useState("");
  const [driveExt, setDriveExt] = useState("pdf");
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CDC_DEPARTMENTS[0]);
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge");
      const json = await res.json();
      if (json.success) {
        setDocuments(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Update category if staff has a department
  useEffect(() => {
    if (session?.user?.role === "staff" && session?.user?.department) {
      setCategory(session.user.department);
    }
  }, [session]);

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
      if (!driveUrl.includes("drive.google.com")) {
        alert("Vui lòng nhập link Google Drive hợp lệ!");
        return;
      }
      formData.append("driveUrl", driveUrl);
      formData.append("driveExt", driveExt);
      formData.append("title", title || "Tài liệu từ Drive");
    }

    formData.append("category", category);

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
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchDocuments();
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
        setDocuments(documents.filter((d) => d.id !== id));
      } else {
        alert("Lỗi: " + json.error);
      }
    } catch (err) {
      alert("Lỗi kết nối");
    }
  };

  const handleDownload = (doc) => {
    const blob = new Blob([doc.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const baseName = doc.title.replace(/\.[^.]+$/, "");
    a.download = `${baseName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <BrainCircuit className="w-5 h-5 text-primary" />
              Tài liệu đã nạp ({documents.length})
            </h2>
            <a 
              href="/api/knowledge/backup" 
              className="btn btn-outline btn-sm" 
              download 
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "white" }}
            >
              📥 Sao lưu (JSON)
            </a>
          </div>

          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ margin: "0 auto 12px", width: 24, height: 24, borderColor: "var(--border)", borderTopColor: "var(--primary)" }} />
              Đang tải danh sách...
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", background: "var(--bg)", borderRadius: "var(--radius)", border: "1px dashed var(--border)" }}>
              Chưa có tài liệu nào trong Kho tri thức AI.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {documents.map((doc) => (
                <div key={doc.id} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "white" }}>
                  <div style={{ padding: "10px", background: "var(--primary-light)", borderRadius: "8px", color: "var(--primary)" }}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text)" }}>{doc.title}</h3>
                      <span className="badge" style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fde68a" }}>
                        {doc.category}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                      Đã nạp: {new Date(doc.createdAt).toLocaleString("vi-VN")} • {doc.content.length.toLocaleString("vi-VN")} ký tự
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", opacity: 0.8, background: "var(--bg)", padding: "8px", borderRadius: "6px" }}>
                      {doc.content}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(doc.id, doc.title)} className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", padding: "8px" }} title="Xóa tài liệu này">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDownload(doc)} className="btn btn-ghost btn-sm" style={{ color: "var(--primary)", padding: "8px" }} title="Tải về dạng .txt">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
