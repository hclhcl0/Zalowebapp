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

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '12px 8px' }}>Họ tên</th>
              <th style={{ padding: '12px 8px' }}>Số điện thoại</th>
              <th style={{ padding: '12px 8px' }}>Loại vắc xin</th>
              <th style={{ padding: '12px 8px' }}>Ngày đăng ký</th>
              <th style={{ padding: '12px 8px' }}>Trạng thái</th>
              <th style={{ padding: '12px 8px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 8px' }}>Nguyễn Văn A</td>
              <td style={{ padding: '12px 8px' }}>0912345678</td>
              <td style={{ padding: '12px 8px' }}>Cúm mùa</td>
              <td style={{ padding: '12px 8px' }}>20/05/2026</td>
              <td style={{ padding: '12px 8px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '0.8rem', fontWeight: 'bold' }}>Chờ duyệt</span></td>
              <td style={{ padding: '12px 8px' }}><a href="#" style={{ color: 'var(--primary)' }}>Sửa</a></td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px 8px' }}>Trần Thị B</td>
              <td style={{ padding: '12px 8px' }}>0987654321</td>
              <td style={{ padding: '12px 8px' }}>Viêm gan B</td>
              <td style={{ padding: '12px 8px' }}>19/05/2026</td>
              <td style={{ padding: '12px 8px' }}><span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#d1fae5', color: '#059669', fontSize: '0.8rem', fontWeight: 'bold' }}>Đã duyệt</span></td>
              <td style={{ padding: '12px 8px' }}><a href="#" style={{ color: 'var(--primary)' }}>Sửa</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
