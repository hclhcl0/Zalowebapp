import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Filter,
  Search,
  MessageSquare,
  UserCheck,
  UserMinus,
  Megaphone,
  Phone,
  RefreshCw,
  Send,
  Inbox,
  Clock,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatRelativeTime(date) {
  if (!date) return "—";
  const diffMs = new Date() - new Date(date);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHr < 24) return `${diffHr} giờ trước`;
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(date));
}

function formatDateFull(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(date));
}

export default async function LogsPage({ searchParams }) {
  // Next.js 15/16: searchParams là Promise, phải await
  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams?.page || "1", 10));
  const typeFilter = resolvedParams?.type || "";
  const directionFilter = resolvedParams?.direction || "";
  const searchQuery = (resolvedParams?.search || "").trim();
  const limit = 20;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện lọc
  const whereCondition = {};

  // Lọc theo Loại hoạt động
  if (typeFilter === "text") {
    whereCondition.type = { in: ["text", "user_send_text"] };
  } else if (typeFilter === "follow") {
    whereCondition.type = "follow";
  } else if (typeFilter === "unfollow") {
    whereCondition.type = "unfollow";
  } else if (typeFilter === "broadcast") {
    whereCondition.type = "broadcast";
  } else if (typeFilter) {
    whereCondition.type = typeFilter;
  }

  // Lọc theo Chiều tương tác (Inbound / Outbound)
  if (directionFilter) {
    whereCondition.direction = directionFilter;
  }

  // Tìm kiếm theo từ khóa nội dung hoặc Zalo User ID
  if (searchQuery) {
    whereCondition.OR = [
      { content: { contains: searchQuery, mode: "insensitive" } },
      { zaloUserId: { contains: searchQuery } },
    ];
  }

  // Đếm thống kê tổng quan
  const [totalLogs, filteredTotal, inboundCount, outboundCount, followCount] = await Promise.all([
    prisma.messageLog.count(),
    prisma.messageLog.count({ where: whereCondition }),
    prisma.messageLog.count({ where: { direction: "inbound" } }),
    prisma.messageLog.count({ where: { direction: "outbound" } }),
    prisma.messageLog.count({ where: { type: "follow" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / limit));

  // Lấy danh sách log
  const logs = await prisma.messageLog.findMany({
    where: whereCondition,
    orderBy: { receivedAt: "desc" },
    skip,
    take: limit,
  });

  // Tìm nạp thông tin người dùng từ Follower & StaffZaloLink
  const userIds = [...new Set(logs.map((l) => l.zaloUserId).filter(Boolean))];

  const [followersList, staffLinks] = await Promise.all([
    prisma.follower.findMany({
      where: { zaloUserId: { in: userIds } },
      select: {
        zaloUserId: true,
        displayName: true,
        fullName: true,
        avatarUrl: true,
        phone: true,
        userType: true,
      },
    }),
    prisma.staffZaloLink.findMany({
      where: { zaloUserId: { in: userIds } },
      select: { zaloUserId: true, staffNameRaw: true, department: true },
    }),
  ]);

  const followerMap = {};
  followersList.forEach((f) => {
    followerMap[f.zaloUserId] = f;
  });

  const staffMap = {};
  staffLinks.forEach((link) => {
    staffMap[link.zaloUserId] = link;
  });

  const specialNames = {
    __broadcast_staff__: "Tất cả cán bộ nhân viên CDC",
    __registration_campaign__: "Chiến dịch gửi link đăng ký",
  };

  // Định dạng các bản ghi hiển thị
  const formattedLogs = logs.map((log) => {
    const follower = followerMap[log.zaloUserId];
    const staff = staffMap[log.zaloUserId];

    const isStaff = follower?.userType === "staff" || !!staff;
    const displayName =
      staff?.staffNameRaw ||
      follower?.fullName ||
      follower?.displayName ||
      specialNames[log.zaloUserId] ||
      log.zaloUserId ||
      "Người dùng Zalo";

    const phone = follower?.phone;
    const avatarUrl = follower?.avatarUrl;

    // Phân tích loại sự kiện & màu sắc nhãn
    let badgeLabel = "Hoạt động";
    let badgeBg = "#f1f5f9";
    let badgeColor = "#475569";
    let icon = "activity";

    if (log.type === "follow") {
      badgeLabel = "Quan tâm (Follow)";
      badgeBg = "#d1fae5";
      badgeColor = "#065f46";
      icon = "follow";
    } else if (log.type === "unfollow") {
      badgeLabel = "Hủy quan tâm";
      badgeBg = "#fee2e2";
      badgeColor = "#991b1b";
      icon = "unfollow";
    } else if (log.type === "broadcast") {
      badgeLabel = "Chiến dịch Zalo";
      badgeBg = "#fef3c7";
      badgeColor = "#92400e";
      icon = "broadcast";
    } else if (log.direction === "inbound") {
      badgeLabel = "📥 Người dân nhắn";
      badgeBg = "#dbeafe";
      badgeColor = "#1e40af";
      icon = "inbound";
    } else if (log.direction === "outbound") {
      // Nhận diện nguồn tin nhắn gửi đi
      let isAi = true;
      try {
        if (log.rawPayload) {
          const payload = JSON.parse(log.rawPayload);
          if (payload?.source === "staff_reply" || payload?.source === "inquiry_escalation") {
            isAi = false;
          }
        }
      } catch (e) {}

      badgeLabel = isAi ? "🤖 AI phản hồi" : "👨‍⚕️ Cán bộ gửi";
      badgeBg = isAi ? "#e0e7ff" : "#f3e8ff";
      badgeColor = isAi ? "#3730a3" : "#6b21a8";
      icon = "outbound";
    }

    return {
      id: log.id,
      zaloUserId: log.zaloUserId,
      displayName,
      isStaff,
      phone,
      avatarUrl,
      department: staff?.department || null,
      content: log.content || "(Không có nội dung văn bản)",
      badgeLabel,
      badgeBg,
      badgeColor,
      icon,
      direction: log.direction,
      type: log.type,
      timeRelative: formatRelativeTime(log.receivedAt),
      timeFull: formatDateFull(log.receivedAt),
    };
  });

  // Tạo URL phân trang & lọc
  const buildFilterUrl = (newParams) => {
    const params = new URLSearchParams();
    const current = {
      type: typeFilter,
      direction: directionFilter,
      search: searchQuery,
      page: "1",
      ...newParams,
    };
    Object.entries(current).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/logs?${params.toString()}`;
  };

  return (
    <div className="page-container" style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px" }}>
      {/* Tiêu đề & Giới thiệu */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <Activity size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                Nhật Ký Hoạt Động Zalo OA
              </h1>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: "3px 0 0" }}>
                Toàn bộ lịch sử tin nhắn người dân, tương tác AI, phân phối câu hỏi và lượt quan tâm OA theo thời gian thực
              </p>
            </div>
          </div>

          <Link
            href="/logs"
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
          >
            <RefreshCw size={15} />
            Làm mới
          </Link>
        </div>
      </div>

      {/* Metric Cards KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <Link href="/logs" style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "16px", borderLeft: "4px solid #2563eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Tổng Lượt Tương Tác
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--text)", marginTop: "4px" }}>
                  {totalLogs.toLocaleString("vi-VN")}
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <Activity size={20} />
              </div>
            </div>
          </div>
        </Link>

        <Link href={buildFilterUrl({ direction: "inbound", type: "text" })} style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "16px", borderLeft: "4px solid #0284c7" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0369a1", textTransform: "uppercase" }}>
                  Tin Người Dân Gửi
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#0284c7", marginTop: "4px" }}>
                  {inboundCount.toLocaleString("vi-VN")}
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7" }}>
                <Inbox size={20} />
              </div>
            </div>
          </div>
        </Link>

        <Link href={buildFilterUrl({ direction: "outbound", type: "text" })} style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "16px", borderLeft: "4px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#047857", textTransform: "uppercase" }}>
                  Tin Đã Phản Hồi
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#059669", marginTop: "4px" }}>
                  {outboundCount.toLocaleString("vi-VN")}
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", color: "#059669" }}>
                <Send size={20} />
              </div>
            </div>
          </div>
        </Link>

        <Link href={buildFilterUrl({ type: "follow", direction: "" })} style={{ textDecoration: "none" }}>
          <div className="card" style={{ padding: "16px", borderLeft: "4px solid #8b5cf6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6d28d9", textTransform: "uppercase" }}>
                  Lượt Quan Tâm (Follow)
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#7c3aed", marginTop: "4px" }}>
                  {followCount.toLocaleString("vi-VN")}
                </div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed" }}>
                <UserCheck size={20} />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Thanh Tìm Kiếm & Bộ Lọc Nhanh */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between" }}>
          {/* Pills lọc loại hoạt động */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--text-muted)", marginRight: 4 }}>
              Loại:
            </span>
            {[
              { key: "", label: "Tất cả" },
              { key: "text", label: "💬 Tin nhắn" },
              { key: "follow", label: "🟢 Quan tâm" },
              { key: "unfollow", label: "🔴 Hủy quan tâm" },
              { key: "broadcast", label: "📢 Chiến dịch" },
            ].map((pill) => {
              const isActive = typeFilter === pill.key;
              return (
                <Link
                  key={pill.key}
                  href={buildFilterUrl({ type: pill.key, page: "1" })}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "16px",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 700 : 500,
                    textDecoration: "none",
                    border: isActive ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                    background: isActive ? "var(--primary-light)" : "var(--bg)",
                    color: isActive ? "var(--primary)" : "var(--text)",
                  }}
                >
                  {pill.label}
                </Link>
              );
            })}
          </div>

          {/* Form tìm kiếm */}
          <form method="GET" action="/logs" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            {directionFilter && <input type="hidden" name="direction" value={directionFilter} />}
            <div style={{ position: "relative", minWidth: 260 }}>
              <input
                type="text"
                name="search"
                defaultValue={searchQuery}
                placeholder="🔍 Tìm nội dung, Zalo ID..."
                className="form-input"
                style={{ fontSize: "0.85rem", padding: "7px 12px 7px 32px", height: "36px", width: "100%" }}
              />
              <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-light)" }} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: "36px", padding: "0 14px" }}>
              Tìm
            </button>
            {searchQuery && (
              <Link href={buildFilterUrl({ search: "", page: "1" })} className="btn btn-outline btn-sm" style={{ height: "36px", padding: "0 10px" }}>
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        {/* Lọc chiều tương tác phụ */}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed var(--border)", alignItems: "center", fontSize: "0.82rem" }}>
          <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>Chiều tương tác:</span>
          <Link
            href={buildFilterUrl({ direction: "", page: "1" })}
            style={{
              padding: "3px 10px",
              borderRadius: "12px",
              textDecoration: "none",
              background: !directionFilter ? "#e2e8f0" : "transparent",
              color: !directionFilter ? "#1e293b" : "var(--text-muted)",
              fontWeight: !directionFilter ? 700 : 500,
            }}
          >
            Tất cả chiều
          </Link>
          <Link
            href={buildFilterUrl({ direction: "inbound", page: "1" })}
            style={{
              padding: "3px 10px",
              borderRadius: "12px",
              textDecoration: "none",
              background: directionFilter === "inbound" ? "#dbeafe" : "transparent",
              color: directionFilter === "inbound" ? "#1e40af" : "var(--text-muted)",
              fontWeight: directionFilter === "inbound" ? 700 : 500,
            }}
          >
            📥 Nhận vào (Người dân gửi)
          </Link>
          <Link
            href={buildFilterUrl({ direction: "outbound", page: "1" })}
            style={{
              padding: "3px 10px",
              borderRadius: "12px",
              textDecoration: "none",
              background: directionFilter === "outbound" ? "#d1fae5" : "transparent",
              color: directionFilter === "outbound" ? "#065f46" : "var(--text-muted)",
              fontWeight: directionFilter === "outbound" ? 700 : 500,
            }}
          >
            📤 Gửi ra (AI & Cán bộ trả lời)
          </Link>
        </div>
      </div>

      {/* Bảng Danh Sách Hoạt Động */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table" style={{ width: "100%", margin: 0 }}>
            <thead style={{ background: "var(--bg-secondary)" }}>
              <tr>
                <th style={{ width: "18%", padding: "12px 16px" }}>Thời gian</th>
                <th style={{ width: "22%", padding: "12px 16px" }}>Người thực hiện</th>
                <th style={{ width: "16%", padding: "12px 16px" }}>Loại sự kiện</th>
                <th style={{ width: "44%", padding: "12px 16px" }}>Chi tiết nội dung / Tương tác</th>
              </tr>
            </thead>
            <tbody>
              {formattedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "48px 24px" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📭</div>
                    <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                      Không tìm thấy bản ghi hoạt động nào
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {searchQuery || typeFilter || directionFilter
                        ? "Thử xóa bớt bộ lọc hoặc từ khóa tìm kiếm để xem thêm."
                        : "Hệ thống chưa ghi nhận sự kiện tương tác nào."}
                    </div>
                  </td>
                </tr>
              ) : (
                formattedLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    {/* Cột 1: Thời gian */}
                    <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.88rem" }}>
                        {log.timeRelative}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-light)", marginTop: "2px" }}>
                        {log.timeFull}
                      </div>
                    </td>

                    {/* Cột 2: Định danh Người dùng */}
                    <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {log.avatarUrl ? (
                          <img
                            src={log.avatarUrl}
                            alt={log.displayName}
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "1px solid var(--border)",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: log.isStaff ? "#f3e8ff" : "#e2e8f0",
                              color: log.isStaff ? "#7c3aed" : "#475569",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              flexShrink: 0,
                            }}
                          >
                            {log.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text)", display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                            <span>{log.displayName}</span>
                            {log.isStaff && (
                              <span style={{ fontSize: "0.68rem", padding: "1px 6px", background: "#f3e8ff", color: "#7c3aed", borderRadius: "10px", fontWeight: 700 }}>
                                Cán bộ
                              </span>
                            )}
                          </div>
                          {log.phone ? (
                            <div style={{ fontSize: "0.78rem", color: "var(--primary)", marginTop: "1px" }}>
                              📞 {log.phone}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-light)", marginTop: "1px", fontFamily: "monospace" }}>
                              ID: {log.zaloUserId.length > 15 ? log.zaloUserId.substring(0, 14) + "..." : log.zaloUserId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Loại sự kiện Badge */}
                    <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "14px",
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          background: log.badgeBg,
                          color: log.badgeColor,
                        }}
                      >
                        {log.badgeLabel}
                      </span>
                    </td>

                    {/* Cột 4: Nội dung tin nhắn / hoạt động */}
                    <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          color: "var(--text)",
                          lineHeight: "1.5",
                          wordBreak: "break-word",
                          background: log.direction === "inbound" ? "#f8fafc" : "#ffffff",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {log.content}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderTop: "1px solid var(--border)",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Hiển thị {skip + 1} - {Math.min(skip + limit, filteredTotal)} trong tổng số{" "}
              <strong>{filteredTotal.toLocaleString("vi-VN")}</strong> bản ghi (Trang {page}/{totalPages})
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Link
                href={buildFilterUrl({ page: (page - 1).toString() })}
                className={`btn btn-outline btn-sm ${page <= 1 ? "disabled" : ""}`}
                style={page <= 1 ? { pointerEvents: "none", opacity: 0.4 } : {}}
              >
                <ArrowLeft size={15} /> Trước
              </Link>
              <Link
                href={buildFilterUrl({ page: (page + 1).toString() })}
                className={`btn btn-outline btn-sm ${page >= totalPages ? "disabled" : ""}`}
                style={page >= totalPages ? { pointerEvents: "none", opacity: 0.4 } : {}}
              >
                Sau <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
