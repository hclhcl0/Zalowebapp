export default function Vaccination() {
  return (
    <div>
      <div className="card">
        <h1 className="card-title">Quản lý Đặt lịch Tiêm chủng</h1>
        <p style={{ color: 'var(--text-muted)' }}>Xem danh sách, duyệt hoặc hủy các yêu cầu đặt lịch tiêm chủng từ người dân.</p>
        
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <input type="text" placeholder="Tìm kiếm theo tên/SĐT..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', width: '300px' }} />
          <button className="btn-primary">Tìm kiếm</button>
          <button className="btn-primary" style={{ backgroundColor: '#10b981' }}>Xuất danh sách (Excel)</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="desktop-only" style={{ overflowX: "auto" }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 14px' }}>Họ tên</th>
                <th style={{ padding: '12px 14px' }}>Số điện thoại</th>
                <th style={{ padding: '12px 14px' }}>Loại vắc xin</th>
                <th style={{ padding: '12px 14px' }}>Ngày đăng ký</th>
                <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                <th style={{ padding: '12px 14px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 14px' }}>Nguyễn Văn A</td>
                <td style={{ padding: '12px 14px' }}>0912345678</td>
                <td style={{ padding: '12px 14px' }}>Cúm mùa</td>
                <td style={{ padding: '12px 14px' }}>20/05/2026</td>
                <td style={{ padding: '12px 14px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '0.8rem', fontWeight: 'bold' }}>Chờ duyệt</span></td>
                <td style={{ padding: '12px 14px' }}><a href="#" style={{ color: 'var(--primary)' }}>Sửa</a></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 14px' }}>Trần Thị B</td>
                <td style={{ padding: '12px 14px' }}>0987654321</td>
                <td style={{ padding: '12px 14px' }}>Viêm gan B</td>
                <td style={{ padding: '12px 14px' }}>19/05/2026</td>
                <td style={{ padding: '12px 14px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#d1fae5', color: '#059669', fontSize: '0.8rem', fontWeight: 'bold' }}>Đã duyệt</span></td>
                <td style={{ padding: '12px 14px' }}><a href="#" style={{ color: 'var(--primary)' }}>Sửa</a></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mobile-card-list mobile-only" style={{ flexDirection: "column" }}>
          {[
            { id: 1, name: "Nguyễn Văn A", phone: "0912345678", vaccine: "Cúm mùa", date: "20/05/2026", status: "Chờ duyệt" },
            { id: 2, name: "Trần Thị B", phone: "0987654321", vaccine: "Viêm gan B", date: "19/05/2026", status: "Đã duyệt" }
          ].map(u => (
            <div key={u.id} className="mobile-card-item">
              <div className="mobile-card-main">
                <div className="mobile-card-avatar" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                  {u.name.charAt(0)}
                </div>
                <div className="mobile-card-body">
                  <div className="mobile-card-name">{u.name}</div>
                  <div className="mobile-card-meta">
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.phone}</span>
                    <span style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: "10px", fontWeight: "bold", background: u.status === "Đã duyệt" ? "#d1fae5" : "#fef3c7", color: u.status === "Đã duyệt" ? "#059669" : "#d97706" }}>
                      {u.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    💉 {u.vaccine} · 📅 {u.date}
                  </div>
                </div>
              </div>
              <div className="mobile-card-actions">
                <button className="mobile-card-action-btn primary" style={{ width: "100%" }}>Sửa</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
