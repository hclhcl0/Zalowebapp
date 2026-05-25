import Link from "next/link";

export default function Dashboard() {
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan hệ thống</h1>
          <p className="page-desc">Chào mừng trở lại! Đây là tóm tắt hoạt động hôm nay.</p>
        </div>
        <Link href="/news/alerts" className="btn btn-primary">📢 Gửi thông báo khẩn</Link>
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
            <div className="stat-label">Tin nhắn ZNS đã gửi</div>
            <div className="stat-value">8,912</div>
            <div className="stat-change">↑ +1.2K tuần này</div>
          </div>
          <div className="stat-icon yellow">📨</div>
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
            <Link href="/followers" className="btn btn-outline btn-sm">Xem tất cả</Link>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-dot green" />
              <div>
                <div className="activity-text">
                  <strong>Nguyễn Văn A</strong> đã nhấn quan tâm trang Zalo Official Account
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
                  <strong>Trần Thị B</strong> đã gửi tin nhắn phản hồi qua Zalo OA Chat
                </div>
                <div className="activity-time">3 giờ trước</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot green" />
              <div>
                <div className="activity-text">
                  Hệ thống tự động đồng bộ thành công 18 bài viết từ Zalo OA về database
                </div>
                <div className="activity-time">5 giờ trước</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot red" />
              <div>
                <div className="activity-text">
                  <strong>Nhân viên Admin</strong> cập nhật cấu hình tốc độ gửi email báo lương trong Cài đặt
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
            <Link href="/broadcast" className="quick-action-btn">
              <span className="quick-action-icon">📢</span>
              Gửi broadcast
            </Link>
            <Link href="/news/daily" className="quick-action-btn">
              <span className="quick-action-icon">📝</span>
              Đăng tin tức
            </Link>
            <Link href="/settings?tab=contact" className="quick-action-btn">
              <span className="quick-action-icon">📞</span>
              Cập nhật hotline
            </Link>
            <Link href="/salary-email" className="quick-action-btn">
              <span className="quick-action-icon">📧</span>
              Gửi email báo lương
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
