import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Users, UserCheck, Stethoscope, Clock, Megaphone, Mail, UserCog, Settings, Activity } from "lucide-react";

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
  const totalFollowers = await prisma.follower.count();
  const totalStaff = await prisma.follower.count({
    where: { userType: "staff" }
  });
  const totalCitizens = await prisma.follower.count({
    where: {
      userType: "citizen",
      NOT: { fullName: null }
    }
  });
  // Số lượng Followers chưa khai báo thông tin
  const totalUnregistered = await prisma.follower.count({
    where: {
      userType: "citizen",
      fullName: null
    }
  });

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

  // Lấy danh sách liên kết cán bộ cơ quan để hiển thị tên thật
  const staffLinks = await prisma.staffZaloLink.findMany({
    where: { zaloUserId: { in: userIds } },
    select: { zaloUserId: true, staffNameRaw: true }
  });

  const staffMap = {};
  staffLinks.forEach(link => {
    staffMap[link.zaloUserId] = link.staffNameRaw;
  });

  const specialNames = {
    "__broadcast_staff__": "Tất cả cán bộ nhân viên",
    "__registration_campaign__": "Chiến dịch gửi link đăng ký"
  };

  const formattedActivities = logs.map(log => {
    const staffName = staffMap[log.zaloUserId];
    const zaloName = userMap[log.zaloUserId] || specialNames[log.zaloUserId] || log.zaloUserId || "Người dùng ẩn danh";
    const name = staffName ? `${staffName} (Zalo: ${zaloName})` : zaloName;
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
          <p className="page-desc">Hệ thống quản trị Zalo OA & Quản lý thông tin gửi thông tin nội bộ tự động CDC Đà Nẵng.</p>
        </div>
        <Link href="/broadcast" className="btn btn-primary">
          <Megaphone size={18} /> Gửi Tin Truyền Thông
        </Link>
      </div>
      
      {/* Real-time Stat cards */}
      <div className="stat-grid">
        {/* Card 1: Followers */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Tổng người quan tâm</div>
            <div className="stat-value">{totalFollowers.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--text-muted)" }}>Số lượng Follower Zalo OA</div>
          </div>
          <div className="stat-icon blue"><Users size={24} color="#2563eb" /></div>
        </div>

        {/* Card 2: Staff links */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Cán bộ đã liên kết</div>
            <div className="stat-value">{totalStaff.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--success)" }}>Đã xác thực nhận thông tin nội bộ</div>
          </div>
          <div className="stat-icon green"><UserCheck size={24} color="#10b981" /></div>
        </div>

        {/* Card 3: Registered citizens */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Khách hàng đăng ký</div>
            <div className="stat-value">{totalCitizens.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "#3b82f6" }}>Đăng ký nhận kết quả y tế</div>
          </div>
          <div className="stat-icon purple" style={{ background: "#eff6ff" }}><Stethoscope size={24} color="#3b82f6" /></div>
        </div>

        {/* Card 4: Unregistered */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Chưa phân loại</div>
            <div className="stat-value">{totalUnregistered.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--warning)" }}>Chưa khai báo thông tin</div>
          </div>
          <div className="stat-icon yellow"><Clock size={24} color="#d97706" /></div>
        </div>
      </div>

      {/* Bottom grid: 60/40 Split */}
      <div className="dashboard-grid">
        
        {/* Left Column: Recent activity (Live from Prisma) */}
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
              <Activity size={48} color="var(--text-light)" style={{ marginBottom: "12px", opacity: 0.5 }} />
              <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>Hệ thống đang chạy ổn định</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-light)", marginTop: "4px" }}>
                Chưa ghi nhận hoạt động tương tác hay tin nhắn nào gần đây.
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

        {/* Right Column: Quick actions */}
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="card-header">
            <div className="card-title">Thao tác nhanh</div>
          </div>
          <div className="quick-actions" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <Link href="/broadcast" className="quick-action-btn">
              <Megaphone size={28} strokeWidth={1.5} color="var(--primary)" />
              <strong>Gửi Tin Truyền Thông</strong>
            </Link>
            <Link href="/salary-email" className="quick-action-btn">
              <Mail size={28} strokeWidth={1.5} color="var(--success)" />
              <strong>Cập Nhật Thông Tin Cơ Quan</strong>
            </Link>
            <Link href="/followers" className="quick-action-btn">
              <Users size={28} strokeWidth={1.5} color="#3b82f6" />
              <strong>Quản Lý Đăng Ký</strong>
            </Link>
            <Link href="/settings" className="quick-action-btn">
              <Settings size={28} strokeWidth={1.5} color="var(--text-muted)" />
              <strong>Cài Đặt Hệ Thống</strong>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
