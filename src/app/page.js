import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Users, UserCheck, Stethoscope, Clock, Megaphone, Mail, UserCog, Settings, Activity, BrainCircuit, Send } from "lucide-react";

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

  // Cán bộ liên kết: lấy từ bảng StaffZaloLink (chính xác hơn userType)
  const totalStaff = await prisma.staffZaloLink.count();

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

  const classificationStatsRaw = await prisma.follower.groupBy({
    by: ['interestGroup'],
    where: { userType: "citizen", interestGroup: { not: null } },
    _count: {
      _all: true,
    },
  });
  const classificationStats = classificationStatsRaw.sort((a, b) => b._count._all - a._count._all);

  // Tổng số lượng tài liệu trong Kho tri thức AI
  const totalAiDocs = await prisma.aiKnowledge.count();

  // Thống kê broadcast từ MessageLog
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const broadcastToday = await prisma.messageLog.count({
    where: {
      type: "broadcast",
      direction: "outbound",
      receivedAt: { gte: startOfToday },
    }
  });
  const broadcastThisMonth = await prisma.messageLog.count({
    where: {
      type: "broadcast",
      direction: "outbound",
      receivedAt: { gte: startOfMonth },
    }
  });

  // Truy vấn 10 tương tác/hoạt động gần đây từ MessageLog
  const logs = await prisma.messageLog.findMany({
    orderBy: { receivedAt: "desc" },
    take: 10,
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
      text = `Nhận tin phản hồi từ <strong>${name}</strong>: <em>"${log.content || '[Hình ảnh/Tệp đính kèm]'}"</em>`;
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
      {/* Dashboard Banner */}
      <div style={{ marginBottom: "16px", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)", background: "white", display: "flex", justifyContent: "center" }}>
        <img 
          src="/images/banner-zcdc-new.png" 
          alt="ZCDC Quản lý Zalo CDC" 
          style={{ width: "100%", maxWidth: "800px", height: "auto", display: "block", objectFit: "contain" }} 
        />
      </div>

      {/* Action Buttons Below Banner */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/broadcast" className="btn btn-primary" style={{ flex: "1", maxWidth: "300px", justifyContent: "center", padding: "12px" }}>
          <Megaphone size={20} /> Gửi Tin Truyền Thông
        </Link>
        <Link href="/salary-email" className="btn btn-primary" style={{ flex: "1", maxWidth: "300px", justifyContent: "center", padding: "12px", background: "linear-gradient(135deg, #059669, #10b981)" }}>
          <Mail size={20} /> Gửi Tin Nội Bộ
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

        {/* Card 5: AI Knowledge */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Kho tri thức AI</div>
            <div className="stat-value">{totalAiDocs.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--primary)" }}>Tài liệu chuyên môn</div>
          </div>
          <div className="stat-icon blue" style={{ background: "#e0e7ff" }}>
            <BrainCircuit size={24} color="#4338ca" />
          </div>
        </div>

        {/* Card 6: Broadcast stats */}
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Tin đã gửi tháng này</div>
            <div className="stat-value">{broadcastThisMonth.toLocaleString("vi-VN")}</div>
            <div className="stat-change" style={{ color: "var(--success)" }}>
              Hôm nay: <strong>{broadcastToday}</strong> tin
            </div>
          </div>
          <div className="stat-icon green" style={{ background: "#d1fae5" }}>
            <Send size={24} color="#059669" />
          </div>
        </div>
      </div>

      {/* Bottom section: Recent Activity & Classification */}
      <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "24px", alignItems: "start" }} className="dashboard-bottom-grid">
        <style>{`
          @media (max-width: 900px) {
            .dashboard-bottom-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
        
        {/* Left Column: Recent activity (Live from Prisma) */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Hoạt động gần đây</div>
              <div className="card-subtitle">10 tương tác mới nhất từ Zalo OA Webhook</div>
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
          )}
        </div>

        {/* Right Column: Customer Classification */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "12px" }}>
            <div>
              <div className="card-title">Phân loại Khách hàng</div>
              <div className="card-subtitle">Thống kê theo mức độ quan tâm</div>
            </div>
            <div className="stat-icon purple" style={{ background: "#f3e8ff", width: 36, height: 36 }}><Users size={18} color="#9333ea" /></div>
          </div>
          
          {classificationStats.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Chưa có dữ liệu phân loại.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {classificationStats.map(stat => (
                <div key={stat.interestGroup} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }}></div>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>{stat.interestGroup}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: "#1d4ed8", fontSize: "0.9rem", background: "#eff6ff", padding: "2px 8px", borderRadius: "12px" }}>
                    {stat._count._all}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
