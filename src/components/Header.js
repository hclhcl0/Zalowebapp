"use client";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

// Map pathname → tên trang hiển thị trên header mobile
const PAGE_TITLES = {
  "/":                    "Dashboard",
  "/followers":           "Người quan tâm OA",
  "/broadcast":           "Gửi Tin Truyền Thông",
  "/salary-email":        "Gửi Tin Nội Bộ",
  "/miniapp-settings":    "Cấu hình Mini App",
  "/miniapp-users":       "Người dùng Mini App",
  "/services":            "Dịch vụ & Bảng giá",
  "/miniapp-hotlines":    "Tổng đài tư vấn",
  "/miniapp-schedules":   "Lịch làm việc",
  "/miniapp-knowledge":   "Bộ não AI Mini App",
  "/settings":            "Cài đặt & Zalo API",
  "/ai-knowledge":        "Kho tri thức AI",
  "/settings/users":      "Quản lý tài khoản",
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // fallback cho các sub-routes
  const parent = Object.keys(PAGE_TITLES)
    .filter((k) => k !== "/" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return parent ? PAGE_TITLES[parent] : "ZCDC";
}

export default function Header({ onMenuToggle }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  const initials = session?.user?.name
    ?.split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("") ?? "A";

  const now = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <header className="header">
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Nút hamburger — chỉ hiện trên mobile */}
        <button
          className="menu-toggle-btn"
          onClick={onMenuToggle}
          title="Mở menu"
          style={{
            background: "transparent", border: "none",
            cursor: "pointer", color: "var(--text)",
            padding: "6px", borderRadius: "8px",
            display: "flex", alignItems: "center",
          }}
        >
          <Menu size={22} />
        </button>

        {/* Tên trang hiện tại — hiện trên mobile */}
        <span className="header-page-title">{pageTitle}</span>
      </div>

      <div className="header-right">
        {/* Ngày giờ — ẩn trên mobile */}
        <span className="header-time">{now}</span>

        {/* Avatar user — hiện trên mobile */}
        <div
          className="header-avatar"
          title={session?.user?.name ?? "Admin"}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
