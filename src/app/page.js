import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Hàm tính thời gian tương đối thân thiện
function formatRelativeTime(date) {
  const diffMs = new Date() - new Date(date);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;
  return `${diffDay} ngày trước`;
}

export default async function Dashboard() {
  // 1. Truy vấn số liệu thực tế từ cơ sở dữ liệu qua Prisma
  const totalFollowers = await prisma.follower.count();
  const totalStaff = await prisma.staffZaloLink.count();
  const totalCitizens = await prisma.follower.count({
    where: {
      userType: "citizen",
      NOT: { fullName: null }
    }
  });
  const totalMessages = await prisma.messageLog.count();

  // 2. Truy vấn 5 tương tác/hoạt động gần đây từ MessageLog
  const logs = await prisma.messageLog.findMany({
    orderBy: { receivedAt: "desc" },
    take: 5,
  });

  // Tìm nạp thông tin tên Zalo hiển thị tương ứng để thân thiện hơn
  const userIds = [...new Set(logs.map(l => l.zaloUserId).filter(Boolean))];
  const followersList = await prisma.follower.findMany({
    where: { zaloUserId: { in: userIds } },
    select: { zaloUserId: true, displayName: true }
  });

  const userMap = {};
  followersList.forEach(f => {
    userMap[f.zaloUserId] = f.displayName;
  });

  const formattedActivities = logs.map(log => {
    const name = userMap[log.zaloUserId] || log.zaloUserId || "Người dùng ẩn danh";
    let text = "";
    let dotColor = ""; // green, yellow, red, blue

    if (log.type === "follow") {
      text = `Người dùng Zalo <strong>${name}</strong> vừa nhấn <strong>Quan tâm</strong> trang OA.`;
      dotColor = "green";
    } else if (log.type === "unfollow") {
      text = `Người dùng Zalo <strong>${name}</strong> đã <strong>Hủy quan tâm</strong> trang OA.`;
      dotColor = "red";
    } else if (log.direction === "outbound") {
      text = `Hệ thống gửi tin nhắn đến <strong>${name}</strong>: <em>"${log.content || 'Gửi liên kết định danh'}"</em>`;
      dotColor = "blue";
    } else if (log.direction === "inbound") {
      text = `Nhận tin phản hồi từ <strong>${name}</strong>: <em>"${log.content}"</em>`;
      dotColor = "yellow";
    } else {
      text = `Hoạt động <strong>${log.type}</strong> từ <strong>${name}</strong>: ${log.content || ''}`;
      dotColor = "blue";
    }

    return {
      id: log.id,
      text,
      dotColor,
      time: formatRelativeTime(log.receivedAt)
    };
  });

  const hasActivities = formattedActivities.length > 0;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan hệ thống</h1>
          <p className="page-desc">Hệ thống quản trị Zalo OA & Quản lý thông tin gửi lương tự động CDC Đà Nẵng.</p>
        </div>
        <Link href="/broadcast" className="btn btn-primary">📢 Gửi Tin Truyền Thông</Link>
      </div>
      
      {/* Real-time Stat cards */}
      <div className="stat-grid">
        {/* Card 1: Followers */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Tổng người quan tâm Zalo</div>
            <div className="stat-value">{totalFollowers.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--text-muted)" }}>Người dùng quan tâm OA</div>
          </div>
          <div className="stat-icon blue">👥</div>
        </div>

        {/* Card 2: Staff links */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Cán bộ đã liên kết Zalo</div>
            <div className="stat-value">{totalStaff.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--success)" }}>Đã xác thực nhận lương &amp; thuế</div>
          </div>
          <div className="stat-icon green">💼</div>
        </div>

        {/* Card 3: Registered citizens */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Khách hàng đăng ký</div>
            <div className="stat-value">{totalCitizens.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--warning)" }}>Đăng ký nhận kết quả y tế</div>
          </div>
          <div className="stat-icon yellow">🩺</div>
        </div>

        {/* Card 4: Total logs */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Tin nhắn/Giao dịch hệ thống</div>
            <div className="stat-value">{totalMessages.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "#7c3aed" }}>Nhật ký hoạt động tự động</div>
          </div>
          <div className="stat-icon purple">📨</div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="dashboard-grid">
        {/* Recent activity (Live from Prisma) */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Hoạt động gần đây</div>
              <div className="card-subtitle">Cập nhật tương tác trực tiếp từ Zalo OA Webhook</div>
            </div>
            <Link href="/followers" className="btn btn-outline btn-sm">Quản lý người dùng</Link>
          </div>
          
          {!hasActivities ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
              <span style={{ fontSize: "2.2rem", marginBottom: "8px", display: "block" }}>🤖</span>
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Hệ thống đang chạy ổn định</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-light)", marginTop: "4px" }}>
                Chưa ghi nhận hoạt động tương tác hay tin nhắn nào hôm nay.
              </div>
            </div>
          ) : (
            <div className="activity-list">
              {formattedActivities.map((act) => (
                <div key={act.id} className="activity-item">
                  <div className={`activity-dot ${act.dotColor}`} />
                  <div>
                    <div className="activity-text" dangerouslySetInnerHTML={{ __html: act.text }} />
                    <div className="activity-time">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optimized Quick actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Thao tác nhanh hệ thống</div>
          </div>
          <div className="quick-actions">
            <Link href="/broadcast" className="quick-action-btn">
              <span className="quick-action-icon">📢</span>
              <strong>Gửi Tin Broadcast</strong>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>Tin truyền thông hàng loạt</span>
            </Link>
            <Link href="/salary-email" className="quick-action-btn">
              <span className="quick-action-icon">📧</span>
              <strong>Gửi Lương &amp; Thuế</strong>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>Báo lương tự động qua Email</span>
            </Link>
            <Link href="/followers" className="quick-action-btn">
              <span className="quick-action-icon">👥</span>
              <strong>Quản Lý Đăng Ký</strong>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>Xem liên kết Zalo nhân sự</span>
            </Link>
            <Link href="/settings" className="quick-action-btn">
              <span className="quick-action-icon">⚙️</span>
              <strong>Cài Đặt Hệ Thống</strong>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>Cấu hình Zalo API &amp; Webhook</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
