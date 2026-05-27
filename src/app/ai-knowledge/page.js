"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, FileText, Upload, BrainCircuit } from "lucide-react";
import { useSession } from "next-auth/react";

export default function AiKnowledgePage() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Dịch tễ");
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
    const file = fileInputRef.current?.files[0];
    if (!file) {
      alert("Vui lòng chọn file PDF hoặc TXT!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
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
        if (session?.user?.role !== "staff") {
          setCategory("Dịch tễ");
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
          <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <BrainCircuit className="w-5 h-5 text-primary" />
            Tài liệu đã nạp ({documents.length})
          </h2>

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
              <input
                type="text"
                className="form-input"
                placeholder="VD: Tiêm chủng, Dịch tễ, Khám bệnh..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={session?.user?.role === "staff"}
                required
              />
              {session?.user?.role === "staff" && (
                <p style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px" }}>
                  * Tự động gán theo phòng ban của bạn.
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Chọn File (Chỉ hỗ trợ .PDF, .TXT)</label>
              <input
                type="file"
                className="form-input"
                accept=".pdf,.txt,.md"
                ref={fileInputRef}
                required
                style={{ padding: "8px", background: "var(--bg)" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
              {uploading ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderColor: "rgba(255,255,255,0.4)", borderTopColor: "white" }} /> Đang xử lý file...</>
              ) : (
                <><Plus className="w-4 h-4" /> Nạp vào Khối óc AI</>
              )}
            </button>
          </form>

          <div style={{ marginTop: "24px", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6, padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534" }}>
            <strong>💡 Mẹo:</strong> Tài liệu càng có cấu trúc rõ ràng thì AI học càng nhanh. File PDF sẽ tự động được trích xuất thành văn bản để AI có thể đọc và ghi nhớ.
          </div>
        </div>
      </div>
    </div>
  );
}
