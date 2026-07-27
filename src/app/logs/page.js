import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Activity, ArrowLeft, ArrowRight, Filter } from "lucide-react";

export const dynamic = "force-dynamic";

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

function formatDateFull(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function LogsPage({ searchParams }) {
  const page = parseInt(searchParams.page || "1", 10);
  const typeFilter = searchParams.type || "";
  const limit = 20;
  const skip = (page - 1) * limit;

  const whereCondition = typeFilter ? { type: typeFilter } : {};

  const totalLogs = await prisma.messageLog.count({ where: whereCondition });
  const totalPages = Math.ceil(totalLogs / limit);

  const logs = await prisma.messageLog.findMany({
    where: whereCondition,
    orderBy: { receivedAt: "desc" },
    skip,
    take: limit,
  });

  const userIds = [...new Set(logs.map((l) => l.zaloUserId).filter(Boolean))];

  const followersList = await prisma.follower.findMany({
    where: { zaloUserId: { in: userIds } },
    select: { zaloUserId: true, displayName: true },
  });

  const staffLinks = await prisma.staffZaloLink.findMany({
    where: { zaloUserId: { in: userIds } },
    select: { zaloUserId: true, staffNameRaw: true },
  });

  const userMap = {};
  followersList.forEach((f) => {
    userMap[f.zaloUserId] = f.displayName;
  });

  const staffMap = {};
  staffLinks.forEach((link) => {
    staffMap[link.zaloUserId] = link.staffNameRaw;
  });

  const specialNames = {
    __broadcast_staff__: "Tất cả cán bộ nhân viên",
    __registration_campaign__: "Chiến dịch gửi link đăng ký",
  };

  const formattedLogs = logs.map((log) => {
    const staffName = staffMap[log.zaloUserId];
    const zaloName =
      userMap[log.zaloUserId] ||
      specialNames[log.zaloUserId] ||
      log.zaloUserId ||
      "Người dùng ẩn danh";
    const name = staffName ? `${staffName} (Zalo: ${zaloName})` : zaloName;

    let text = "";
    let dotColor = "gray";

    if (log.type === "follow") {
      text = `Người dùng <strong>${name}</strong> vừa nhấn <strong>Quan tâm</strong> OA.`;
      dotColor = "green";
    } else if (log.type === "unfollow") {
      text = `Người dùng <strong>${name}</strong> đã <strong>Hủy quan tâm</strong> OA.`;
      dotColor = "red";
    } else if (log.direction === "outbound") {
      text = `Hệ thống gửi đến <strong>${name}</strong>: <em>"${
        log.content || "Nội dung đa phương tiện"
      }"</em>`;
      dotColor = "blue";
    } else if (log.direction === "inbound") {
      text = `Nhận từ <strong>${name}</strong>: <em>"${
        log.content || "Nội dung đa phương tiện"
      }"</em>`;
      dotColor = "yellow";
    } else {
      text = `Hoạt động <strong>${log.type}</strong> từ <strong>${name}</strong>: ${
        log.content || ""
      }`;
      dotColor = "gray";
    }

    return {
      id: log.id,
      text,
      dotColor,
      timeRelative: formatRelativeTime(log.receivedAt),
      timeFull: formatDateFull(log.receivedAt),
      type: log.type,
      direction: log.direction,
    };
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <Activity size={24} style={{ marginRight: 8 }} color="var(--primary)" />
          Nhật ký Hoạt động (Logs)
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Lịch sử tương tác, tin nhắn, follow/unfollow của tất cả người dùng Zalo OA
        </p>
      </div>

      <div className="card" style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <Filter size={18} color="var(--text-muted)" />
        <span style={{ fontWeight: 600 }}>Lọc theo:</span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link href="/logs" className={`btn ${!typeFilter ? 'btn-primary' : 'btn-outline'} btn-sm`}>Tất cả</Link>
          <Link href="/logs?type=text" className={`btn ${typeFilter === 'text' ? 'btn-primary' : 'btn-outline'} btn-sm`}>Tin nhắn</Link>
          <Link href="/logs?type=follow" className={`btn ${typeFilter === 'follow' ? 'btn-primary' : 'btn-outline'} btn-sm`}>Quan tâm (Follow)</Link>
          <Link href="/logs?type=unfollow" className={`btn ${typeFilter === 'unfollow' ? 'btn-primary' : 'btn-outline'} btn-sm`}>Hủy quan tâm</Link>
          <Link href="/logs?type=broadcast" className={`btn ${typeFilter === 'broadcast' ? 'btn-primary' : 'btn-outline'} btn-sm`}>Chiến dịch Truyền thông</Link>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table" style={{ minWidth: "700px" }}>
            <thead>
              <tr>
                <th style={{ width: "20%" }}>Thời gian</th>
                <th style={{ width: "10%" }}>Loại</th>
                <th style={{ width: "70%" }}>Chi tiết hoạt động</th>
              </tr>
            </thead>
            <tbody>
              {formattedLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", padding: "40px" }}>
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                formattedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{log.timeRelative}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>{log.timeFull}</div>
                    </td>
                    <td>
                      <span className={`badge`} style={{
                        background: log.dotColor === 'green' ? '#d1fae5' : log.dotColor === 'red' ? '#fee2e2' : log.dotColor === 'yellow' ? '#fef3c7' : '#e0e7ff',
                        color: log.dotColor === 'green' ? '#065f46' : log.dotColor === 'red' ? '#991b1b' : log.dotColor === 'yellow' ? '#92400e' : '#3730a3',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                      }}>
                        {log.type === "text" ? (log.direction === "inbound" ? "Nhận tin" : "Gửi tin") : log.type.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div dangerouslySetInnerHTML={{ __html: log.text }} style={{ lineHeight: 1.5 }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Trang {page} / {totalPages} (Tổng số: {totalLogs} bản ghi)
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Link 
                href={`/logs?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ''}`} 
                className={`btn btn-outline btn-sm ${page <= 1 ? 'disabled' : ''}`}
                style={page <= 1 ? { pointerEvents: "none", opacity: 0.5 } : {}}
              >
                <ArrowLeft size={16} /> Trước
              </Link>
              <Link 
                href={`/logs?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ''}`} 
                className={`btn btn-outline btn-sm ${page >= totalPages ? 'disabled' : ''}`}
                style={page >= totalPages ? { pointerEvents: "none", opacity: 0.5 } : {}}
              >
                Sau <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
