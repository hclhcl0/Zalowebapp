"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Search, X, Check, FolderPlus } from "lucide-react";
import { useSession } from "next-auth/react";

const formatPrice = (p) =>
  Number(p).toLocaleString("vi-VN") + " đ";

export default function ServicePricePage() {
  const { data: session } = useSession();

  // Data
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Expanded categories
  const [expanded, setExpanded] = useState({});

  // Category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [editCat, setEditCat] = useState(null);
  const [savingCat, setSavingCat] = useState(false);

  // Service form
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editSvc, setEditSvc] = useState(null);
  const [svcForm, setSvcForm] = useState({ name: "", price: "", unit: "lần", note: "", categoryId: "", order: 0 });
  const [savingSvc, setSavingSvc] = useState(false);

  const fetchData = async (searchStr = search) => {
    setLoading(true);
    try {
      const [catRes, svcRes] = await Promise.all([
        fetch("/api/service-categories"),
        fetch(`/api/service-prices?limit=500&search=${encodeURIComponent(searchStr)}`),
      ]);
      const catJson = await catRes.json();
      const svcJson = await svcRes.json();
      if (catJson.success) setCategories(catJson.data);
      if (svcJson.success) setServices(svcJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // --- Category CRUD ---
  const openAddCat = () => { setEditCat(null); setCatName(""); setShowCatForm(true); };
  const openEditCat = (cat) => { setEditCat(cat); setCatName(cat.name); setShowCatForm(true); };

  const saveCat = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    try {
      const url = editCat ? `/api/service-categories/${editCat.id}` : "/api/service-categories";
      const method = editCat ? "PUT" : "POST";
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: catName }) });
      setShowCatForm(false);
      fetchData();
    } finally { setSavingCat(false); }
  };

  const deleteCat = async (cat) => {
    if (!confirm(`Xóa danh mục "${cat.name}"? Tất cả dịch vụ trong danh mục này cũng sẽ bị xóa.`)) return;
    await fetch(`/api/service-categories/${cat.id}`, { method: "DELETE" });
    fetchData();
  };

  // --- Service CRUD ---
  const openAddSvc = (categoryId) => {
    setEditSvc(null);
    setSvcForm({ name: "", price: "", unit: "lần", note: "", categoryId: String(categoryId), order: 0 });
    setShowSvcForm(true);
  };
  const openEditSvc = (svc) => {
    setEditSvc(svc);
    setSvcForm({ name: svc.name, price: svc.price, unit: svc.unit, note: svc.note || "", categoryId: String(svc.categoryId), order: svc.order });
    setShowSvcForm(true);
  };

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

  const svcByCategory = (catId) => services.filter(s => s.categoryId === catId);

  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>Bảng giá dịch vụ</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {services.length} dịch vụ • {categories.length} danh mục
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={openAddCat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FolderPlus size={16} /> Thêm danh mục
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          className="form-input"
          style={{ paddingLeft: 36, paddingRight: searchInput ? 36 : 12 }}
          placeholder="Tìm kiếm dịch vụ..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setSearch(searchInput); }}
        />
        {searchInput && (
          <button onClick={() => { setSearchInput(""); setSearch(""); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Categories list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Đang tải...</div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <FolderPlus size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>Chưa có danh mục nào. Nhấn "Thêm danh mục" để bắt đầu.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {categories.map(cat => {
            const svcs = svcByCategory(cat.id);
            const isOpen = expanded[cat.id] !== false; // default open
            return (
              <div key={cat.id} className="card" style={{ overflow: "hidden", padding: 0 }}>
                {/* Category header */}
                <div
                  style={{ display: "flex", alignItems: "center", padding: "14px 16px", cursor: "pointer", borderBottom: isOpen ? "1px solid var(--border)" : "none", background: "var(--bg-secondary)" }}
                  onClick={() => toggleExpand(cat.id)}
                >
                  {isOpen ? <ChevronDown size={18} style={{ color: "var(--primary)", marginRight: 8, flexShrink: 0 }} /> : <ChevronRight size={18} style={{ color: "var(--text-muted)", marginRight: 8, flexShrink: 0 }} />}
                  <span style={{ fontWeight: 700, fontSize: "1rem", flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: 12 }}>{svcs.length} dịch vụ</span>
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn-primary" style={{ padding: "5px 10px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }} onClick={() => openAddSvc(cat.id)}>
                      <Plus size={13} /> Thêm
                    </button>
                    <button className="btn btn-outline" style={{ padding: "5px 8px" }} onClick={() => openEditCat(cat)}><Pencil size={13} /></button>
                    <button className="btn" style={{ padding: "5px 8px", color: "var(--danger)", border: "1px solid var(--danger)", background: "transparent", borderRadius: 6 }} onClick={() => deleteCat(cat)}><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Services table */}
                {isOpen && (
                  <div>
                    {svcs.length === 0 ? (
                      <div style={{ padding: "20px 16px", color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center" }}>
                        Chưa có dịch vụ nào trong danh mục này
                      </div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ fontSize: "0.8rem", color: "var(--text-muted)", background: "var(--bg)" }}>
                            <th style={{ textAlign: "left", padding: "8px 16px", fontWeight: 600 }}>Tên dịch vụ</th>
                            <th style={{ textAlign: "right", padding: "8px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>Đơn giá</th>
                            <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600 }}>ĐVT</th>
                            <th style={{ textAlign: "left", padding: "8px 8px", fontWeight: 600 }}>Ghi chú</th>
                            <th style={{ width: 70 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {svcs.map(svc => (
                            <tr key={svc.id} style={{ borderTop: "1px solid var(--border)", fontSize: "0.9rem" }}>
                              <td style={{ padding: "10px 16px" }}>{svc.name}</td>
                              <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "var(--primary)", whiteSpace: "nowrap" }}>{formatPrice(svc.price)}</td>
                              <td style={{ padding: "10px 8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>{svc.unit}</td>
                              <td style={{ padding: "10px 8px", color: "var(--text-muted)", fontSize: "0.8rem" }}>{svc.note || ""}</td>
                              <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }} onClick={() => openEditSvc(svc)}><Pencil size={14} /></button>
                                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }} onClick={() => deleteSvc(svc)}><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      {showCatForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCatForm(false)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: "90%", maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700 }}>{editCat ? "Sửa danh mục" : "Thêm danh mục"}</h3>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.9rem" }}>Tên danh mục</label>
              <input className="form-input" value={catName} onChange={e => setCatName(e.target.value)} placeholder="VD: Xét nghiệm, Siêu âm..." onKeyDown={e => e.key === "Enter" && saveCat()} autoFocus />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCatForm(false)}>Hủy</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveCat} disabled={savingCat}>{savingCat ? "Đang lưu..." : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {showSvcForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSvcForm(false)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: "90%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700 }}>{editSvc ? "Sửa dịch vụ" : "Thêm dịch vụ"}</h3>
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
                  <input className="form-input" type="number" value={svcForm.price} onChange={e => setSvcForm(f => ({ ...f, price: e.target.value }))} placeholder="VD: 150000" />
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
    </div>
  );
}
