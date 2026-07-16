"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Search, X, Upload, FolderPlus, FileSpreadsheet,
  AlertCircle, CheckCircle, Tag, Image as ImageIcon, LayoutGrid
} from "lucide-react";
import { useSession } from "next-auth/react";

const formatPrice = (p) => Number(p).toLocaleString("vi-VN") + " đ";

// ─────────────────────────────────────────────
// Tab 1: Quản lý danh mục dịch vụ
// ─────────────────────────────────────────────
function CategoriesTab({ categories, fetchData }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", imageUrl: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const imgInputRef = useRef(null);

  const openAdd = () => { setEditItem(null); setForm({ name: "", description: "", imageUrl: "" }); setError(""); setShowForm(true); };
  const openEdit = (cat) => { setEditItem(cat); setForm({ name: cat.name, description: cat.description || "", imageUrl: cat.imageUrl || "" }); setError(""); setShowForm(true); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        // Chuyển đổi path tương đối thành URL tuyệt đối
        const baseUrl = window.location.origin;
        const fullUrl = json.url.startsWith("http") ? json.url : `${baseUrl}${json.url}`;
        setForm(f => ({ ...f, imageUrl: fullUrl }));
      } else {
        setError("Upload ảnh thất bại: " + (json.error || "Lỗi không xác định"));
      }
    } catch (err) {
      setError("Lỗi upload: " + err.message);
    } finally {
      setUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!form.name.trim()) { setError("Vui lòng nhập tên danh mục"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editItem ? `/api/service-categories/${editItem.id}` : "/api/service-categories";
      const method = editItem ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || `Lỗi ${res.status}`);
        return;
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError("Lỗi kết nối: " + err.message);
    } finally { setSaving(false); }
  };

  const del = async (cat) => {
    if (!confirm(`Xóa danh mục "${cat.name}"? Tất cả dịch vụ bên trong cũng sẽ bị xóa.`)) return;
    await fetch(`/api/service-categories/${cat.id}`, { method: "DELETE" });
    fetchData();
  };

  const gradients = [
    "linear-gradient(135deg,#667eea,#764ba2)",
    "linear-gradient(135deg,#4facfe,#00f2fe)",
    "linear-gradient(135deg,#43e97b,#38f9d7)",
    "linear-gradient(135deg,#fa709a,#fee140)",
    "linear-gradient(135deg,#f093fb,#f5576c)",
    "linear-gradient(135deg,#a18cd1,#fbc2eb)",
    "linear-gradient(135deg,#fccb90,#d57eeb)",
    "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>{categories.length} danh mục dịch vụ</p>
        <button className="btn btn-primary" onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> Thêm danh mục
        </button>
      </div>

      {categories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <LayoutGrid size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Chưa có danh mục nào. Nhấn "Thêm danh mục" để bắt đầu.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {categories.map((cat, idx) => (
            <div key={cat.id} className="card" style={{ overflow: "hidden", padding: 0 }}>
              <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: cat.imageUrl ? "none" : gradients[idx % gradients.length], position: "relative", overflow: "hidden" }}>
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 36, opacity: 0.9 }}>⚕️</span>
                )}
              </div>
              <div style={{ padding: "12px 14px" }}>
                <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "0.95rem" }}>{cat.name}</p>
                {cat.description && (
                  <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{cat.description}</p>
                )}
                <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "var(--text-muted)" }}>{cat._count?.services ?? 0} dịch vụ</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline" style={{ flex: 1, padding: "5px 8px", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }} onClick={() => openEdit(cat)}>
                    <Pencil size={12} /> Sửa
                  </button>
                  <button style={{ padding: "5px 8px", color: "var(--danger)", border: "1px solid var(--danger)", background: "transparent", borderRadius: 6, cursor: "pointer" }} onClick={() => del(cat)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowForm(false)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: "90%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontWeight: 700, fontSize: "1.1rem" }}>{editItem ? "Sửa danh mục" : "Thêm danh mục dịch vụ"}</h3>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "0.9rem" }}>Tên danh mục <span style={{ color: "red" }}>*</span></label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Xét nghiệm, Siêu âm..." autoFocus />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "0.9rem" }}>Mô tả ngắn</label>
                <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả về nhóm dịch vụ này..." rows={2} style={{ resize: "none" }} />
              </div>

              {/* Image upload */}
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: "0.9rem" }}>Ảnh đại diện</label>
                <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />

                {form.imageUrl ? (
                  <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                    <img src={form.imageUrl} alt="preview" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} onError={e => { e.target.style.display = "none"; }} />
                    <button
                      onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                      style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null}

                <button
                  className="btn btn-outline"
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderStyle: "dashed" }}
                  onClick={() => imgInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={15} />
                  {uploading ? "Đang tải lên..." : form.imageUrl ? "Đổi ảnh khác" : "Tải ảnh lên"}
                </button>

                {/* Hoặc nhập URL */}
                <div style={{ marginTop: 8 }}>
                  <input
                    className="form-input"
                    value={form.imageUrl}
                    onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="Hoặc dán URL ảnh: https://..."
                    style={{ fontSize: "0.82rem" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving || uploading}>
                {saving ? "Đang lưu..." : "Lưu danh mục"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// Tab 2: Bảng giá
// ─────────────────────────────────────────────
function PricesTab({ categories, services, fetchData }) {
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editSvc, setEditSvc] = useState(null);
  const [svcForm, setSvcForm] = useState({ name: "", price: "", unit: "lần", note: "", categoryId: "", order: 0 });
  const [savingSvc, setSavingSvc] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const importInputRef = useRef(null);

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const openAddSvc = (catId) => { setEditSvc(null); setSvcForm({ name: "", price: "", unit: "lần", note: "", categoryId: String(catId), order: 0 }); setShowSvcForm(true); };
  const openEditSvc = (svc) => { setEditSvc(svc); setSvcForm({ name: svc.name, price: svc.price, unit: svc.unit, note: svc.note || "", categoryId: String(svc.categoryId), order: svc.order }); setShowSvcForm(true); };

  const saveSvc = async () => {
    if (!svcForm.name.trim() || !svcForm.price || !svcForm.categoryId) return;
    setSavingSvc(true);
    try {
      const url = editSvc ? `/api/service-prices/${editSvc.id}` : "/api/service-prices";
      const method = editSvc ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(svcForm) });
      setShowSvcForm(false);
      fetchData();
    } finally { setSavingSvc(false); }
  };

  const deleteSvc = async (svc) => {
    if (!confirm(`Xóa dịch vụ "${svc.name}"?`)) return;
    await fetch(`/api/service-prices/${svc.id}`, { method: "DELETE" });
    fetchData();
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setShowImportModal(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/service-prices/import", { method: "POST", body: formData });
      const json = await res.json();
      setImportResult(json);
      if (json.success) fetchData();
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const svcByCategory = (catId) => services.filter(s => s.categoryId === catId && (!search || s.name.toLowerCase().includes(search.toLowerCase())));

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32, paddingRight: searchInput ? 32 : 10 }}
            placeholder="Tìm kiếm dịch vụ..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setSearch(searchInput); }}
          />
          {searchInput && <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}><X size={14} /></button>}
        </div>
        <input ref={importInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImport} />
        <button className="btn btn-outline" onClick={() => importInputRef.current?.click()} disabled={importing}
          style={{ display: "flex", alignItems: "center", gap: 6, borderColor: "#16a34a", color: "#16a34a" }}>
          <FileSpreadsheet size={15} /> {importing ? "Đang import..." : "Import Excel"}
        </button>
      </div>

      {/* Hướng dẫn */}
      <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", marginBottom: 16, fontSize: "0.82rem", color: "#78350f" }}>
        📋 <strong>Định dạng Excel:</strong> Mỗi Sheet = 1 danh mục. Các cột: <em>Tên dịch vụ | Đơn giá | Đơn vị tính | Ghi chú</em>
      </div>

      {/* Categories accordion */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {categories.map(cat => {
          const svcs = svcByCategory(cat.id);
          const isOpen = expanded[cat.id] !== false;
          return (
            <div key={cat.id} className="card" style={{ overflow: "hidden", padding: 0 }}>
              <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", cursor: "pointer", background: "var(--bg-secondary)", borderBottom: isOpen ? "1px solid var(--border)" : "none" }} onClick={() => toggle(cat.id)}>
                {isOpen ? <ChevronDown size={16} style={{ color: "var(--primary)", marginRight: 8, flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: "var(--text-muted)", marginRight: 8, flexShrink: 0 }} />}
                <span style={{ fontWeight: 700, flex: 1 }}>{cat.name}</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: 12 }}>{svcs.length} dịch vụ</span>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4 }} onClick={() => openAddSvc(cat.id)}>
                    <Plus size={12} /> Thêm
                  </button>
                </div>
              </div>
              {isOpen && (
                svcs.length === 0
                  ? <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>Chưa có dịch vụ nào</div>
                  : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--bg)", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          <th style={{ textAlign: "left", padding: "7px 16px", fontWeight: 600 }}>Tên dịch vụ</th>
                          <th style={{ textAlign: "right", padding: "7px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>Đơn giá</th>
                          <th style={{ padding: "7px 8px", fontWeight: 600 }}>ĐVT</th>
                          <th style={{ padding: "7px 8px", fontWeight: 600 }}>Ghi chú</th>
                          <th style={{ width: 60 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {svcs.map(svc => (
                          <tr key={svc.id} style={{ borderTop: "1px solid var(--border)", fontSize: "0.88rem" }}>
                            <td style={{ padding: "9px 16px" }}>{svc.name}</td>
                            <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "var(--primary)", whiteSpace: "nowrap" }}>{formatPrice(svc.price)}</td>
                            <td style={{ padding: "9px 8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>{svc.unit}</td>
                            <td style={{ padding: "9px 8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>{svc.note}</td>
                            <td style={{ padding: "9px 8px" }}>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 3 }} onClick={() => openEditSvc(svc)}><Pencil size={13} /></button>
                                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 3 }} onClick={() => deleteSvc(svc)}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
              )}
            </div>
          );
        })}
      </div>

      {/* Service Modal */}
      {showSvcForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSvcForm(false)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: "90%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontWeight: 700 }}>{editSvc ? "Sửa dịch vụ" : "Thêm dịch vụ"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "0.9rem" }}>Danh mục</label>
                <select className="form-input" value={svcForm.categoryId} onChange={e => setSvcForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "0.9rem" }}>Tên dịch vụ <span style={{ color: "red" }}>*</span></label>
                <input className="form-input" value={svcForm.name} onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Xét nghiệm máu tổng quát" />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "0.9rem" }}>Đơn giá (VNĐ) <span style={{ color: "red" }}>*</span></label>
                  <input className="form-input" type="number" value={svcForm.price} onChange={e => setSvcForm(f => ({ ...f, price: e.target.value }))} placeholder="150000" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "0.9rem" }}>ĐVT</label>
                  <select className="form-input" value={svcForm.unit} onChange={e => setSvcForm(f => ({ ...f, unit: e.target.value }))}>
                    <option>lần</option>
                    <option>mẫu</option>
                    <option>ca</option>
                    <option>người</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: "0.9rem" }}>Ghi chú</label>
                <input className="form-input" value={svcForm.note} onChange={e => setSvcForm(f => ({ ...f, note: e.target.value }))} placeholder="Tùy chọn..." />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSvcForm(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSvc} disabled={savingSvc}>{savingSvc ? "Đang lưu..." : "Lưu dịch vụ"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowImportModal(false)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: "90%", maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            {importing ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 40, height: 40, border: "4px solid #e5e7eb", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ color: "var(--text-muted)" }}>Đang xử lý file Excel...</p>
              </div>
            ) : importResult?.success ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <CheckCircle size={24} color="#16a34a" />
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Import thành công!</h3>
                </div>
                <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                  <p style={{ margin: "0 0 4px", color: "#166534" }}>✅ Đã thêm <strong>{importResult.totalCreated}</strong> dịch vụ</p>
                  {importResult.totalSkipped > 0 && <p style={{ margin: 0, color: "#92400e" }}>⚠️ Bỏ qua <strong>{importResult.totalSkipped}</strong> dòng không hợp lệ</p>}
                </div>
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setShowImportModal(false)}>Đóng</button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <AlertCircle size={24} color="#dc2626" />
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Import thất bại</h3>
                </div>
                <p style={{ color: "#dc2626", background: "#fef2f2", padding: 12, borderRadius: 8 }}>{importResult?.error || "Lỗi không xác định"}</p>
                <button className="btn btn-outline" style={{ width: "100%" }} onClick={() => setShowImportModal(false)}>Đóng</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function ServiceManagementPage() {
  const [activeTab, setActiveTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, svcRes] = await Promise.all([
        fetch("/api/service-categories"),
        fetch("/api/service-prices?limit=500"),
      ]);
      const catJson = await catRes.json();
      const svcJson = await svcRes.json();
      if (catJson.success) setCategories(catJson.data);
      if (svcJson.success) setServices(svcJson.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const tabs = [
    { id: "categories", label: "Danh mục dịch vụ", icon: <LayoutGrid size={15} /> },
    { id: "prices", label: "Bảng giá", icon: <Tag size={15} /> },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>Quản lý Dịch vụ</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
          {categories.length} danh mục • {services.length} dịch vụ
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 24, gap: 4 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 20px",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -2,
              fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? "var(--primary)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: "0.95rem",
              transition: "all 0.15s",
            }}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Đang tải...</div>
      ) : activeTab === "categories" ? (
        <CategoriesTab categories={categories} fetchData={fetchData} />
      ) : (
        <PricesTab categories={categories} services={services} fetchData={fetchData} />
      )}
    </div>
  );
}
