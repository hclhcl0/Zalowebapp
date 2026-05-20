export default function Dashboard() {
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan hệ thống</h1>
          <p className="page-desc">Chào mừng trở lại! Đây là tóm tắt hoạt động hôm nay.</p>
        </div>
        <button className="btn btn-primary">📢 Gửi thông báo khẩn</button>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Tổng người theo dõi</div>
            <div className="stat-value">12,450</div>
            <div className="stat-change">↑ +120 tuần này</div>
          </div>
          <div className="stat-icon blue">👥</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Lịch hẹn tiêm (tháng)</div>
            <div className="stat-value">342</div>
            <div className="stat-change">↑ +18 so với tháng trước</div>
          </div>
          <div className="stat-icon green">💉</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Tin nhắn ZNS đã gửi</div>
            <div className="stat-value">8,912</div>
            <div className="stat-change">↑ +1.2K tuần này</div>
          </div>
          <div className="stat-icon yellow">📨</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Lượt tra cứu kết quả</div>
            <div className="stat-value">1,120</div>
            <div className="stat-change down">↓ -40 so với tuần trước</div>
          </div>
          <div className="stat-icon purple">🔬</div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="dashboard-grid">
        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Hoạt động gần đây</div>
              <div className="card-subtitle">Cập nhật theo thời gian thực</div>
            </div>
            <button className="btn btn-outline btn-sm">Xem tất cả</button>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-dot green" />
              <div>
                <div className="activity-text">
                  <strong>Nguyễn Văn A</strong> đăng ký lịch tiêm vắc xin <strong>Cúm mùa</strong> ngày 22/05
                </div>
                <div className="activity-time">10 phút trước</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot" />
              <div>
                <div className="activity-text">
                  <strong>Admin</strong> đã gửi broadcast "Cảnh báo dịch sốt xuất huyết" đến 4,500 người
                </div>
                <div className="activity-time">2 giờ trước</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot yellow" />
              <div>
                <div className="activity-text">
                  <strong>Trần Thị B</strong> tra cứu kết quả xét nghiệm mã <strong>XN00231</strong>
                </div>
                <div className="activity-time">3 giờ trước</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot green" />
              <div>
                <div className="activity-text">
                  Lịch hẹn #342 của <strong>Lê Hoàng C</strong> đã được <strong>duyệt</strong> — ZNS đã gửi
                </div>
                <div className="activity-time">5 giờ trước</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot red" />
              <div>
                <div className="activity-text">
                  <strong>Phạm Thị D</strong> hủy đăng ký lịch tiêm ngày 20/05
                </div>
                <div className="activity-time">Hôm qua</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Thao tác nhanh</div>
          </div>
          <div className="quick-actions">
            <button className="quick-action-btn">
              <span className="quick-action-icon">📢</span>
              Gửi broadcast
            </button>
            <button className="quick-action-btn">
              <span className="quick-action-icon">📝</span>
              Đăng tin tức
            </button>
            <button className="quick-action-btn">
              <span className="quick-action-icon">💉</span>
              Duyệt lịch hẹn
            </button>
            <button className="quick-action-btn">
              <span className="quick-action-icon">🔬</span>
              Nhập KQ xét nghiệm
            </button>
            <button className="quick-action-btn">
              <span className="quick-action-icon">📞</span>
              Cập nhật hotline
            </button>
            <button className="quick-action-btn">
              <span className="quick-action-icon">📊</span>
              Xuất báo cáo
            </button>
          </div>

          {/* Lịch hẹn chờ duyệt */}
          <div style={{ marginTop: "24px" }}>
            <div className="card-title" style={{ marginBottom: "12px" }}>
              ⏳ Lịch hẹn chờ duyệt
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { name: "Nguyễn V. A", type: "Cúm mùa", date: "22/05" },
                { name: "Trần T. B",   type: "Viêm gan B", date: "23/05" },
                { name: "Lê H. C",     type: "Sởi - Quai bị", date: "24/05" },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "var(--bg)",
                    borderRadius: "var(--radius)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ color: "var(--text-muted)" }}>
                      {item.type} · {item.date}
                    </div>
                  </div>
                  <span className="badge badge-pending">Chờ duyệt</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
