"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const menuGroups = [
  {
    title: "Tổng quan",
    items: [
      { icon: "📊", label: "Dashboard", href: "/" },
      { icon: "👤", label: "Người quan tâm Zalo", href: "/followers" },
      { icon: "📣", label: "Gửi Tin Truyền Thông", href: "/broadcast" },
      { icon: "📧", label: "Gửi Email Báo Lương", href: "/salary-email" },
    ],
  },

  {
    title: "Hệ thống",
    items: [
      { icon: "⚙️", label: "Cài đặt & Zalo API", href: "/settings" },
      { icon: "👥", label: "Quản lý tài khoản", href: "/settings/users" },
    ],
  },
  {
    title: "Dịch vụ Y tế",
    items: [
      { icon: "💉", label: "Đặt lịch tiêm chủng", href: "/services/vaccination" },
      { icon: "🔬", label: "Kết quả xét nghiệm", href: "/services/test-results" },
      { icon: "💰", label: "Bảng giá dịch vụ", href: "/services/pricing" },
    ],
  },
  {
    title: "Tin tức & Cảnh báo",
    items: [
      { icon: "📰", label: "Tin vắn dịch bệnh", href: "/news/daily" },
      { icon: "📅", label: "Lịch tiêm chủng", href: "/news/vaccination-schedule" },
      { icon: "🚨", label: "Thông báo khẩn", href: "/news/alerts" },
    ],
  },
  {
    title: "Hỗ trợ & Liên hệ",
    items: [
      { icon: "📞", label: "Cấu hình Hotline", href: "/support/hotline" },
      { icon: "🤖", label: "Kịch bản Chatbot", href: "/support/chatbot" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [categories, setCategories] = useState([
    { id: "daily_news", name: "Tin vắn dịch bệnh", icon: "📰" },
    { id: "vac_schedule", name: "Lịch tiêm chủng", icon: "📅" },
    { id: "alert", name: "Thông báo khẩn", icon: "🚨" }
  ]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.data && json.data.news_categories) {
          const parsed = JSON.parse(json.data.news_categories.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load news categories:", e);
      }
    }
    loadCategories();
  }, []);

  const getCategoryHref = (id) => {
    if (id === "daily_news") return "/news/daily";
    if (id === "vac_schedule") return "/news/vaccination-schedule";
    if (id === "alert") return "/news/alerts";
    return `/news/${id}`;
  };

  const dynamicMenuGroups = menuGroups.map(group => {
    if (group.title === "Tin tức & Cảnh báo") {
      return {
        ...group,
        items: categories.map(cat => ({
          icon: cat.icon,
          label: cat.name,
          href: getCategoryHref(cat.id)
        }))
      };
    }
    return group;
  });

  const initials = session?.user?.name
    ?.split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("") ?? "A";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">🏥</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-main">CDC Đà Nẵng</span>
          <span className="sidebar-logo-sub">Quản trị Zalo OA</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="sidebar-menu">
        {dynamicMenuGroups
          .filter(group => {
            // Chỉ hiển thị nhóm "Hệ thống" cho tài khoản Quản trị viên (admin)
            if (group.title === "Hệ thống" && session?.user?.role !== "admin") {
              return false;
            }
            return true;
          })
          .map((group) => (
            <div key={group.title} className="menu-group">
              <div className="menu-title">{group.title}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`menu-item ${pathname === item.href ? "active" : ""}`}
                >
                  <span className="menu-item-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
      </nav>

      {/* User info & logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {session?.user?.name ?? "Admin"}
            </div>
            <div className="sidebar-user-role">
              {session?.user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
            </div>
          </div>
          <button
            className="logout-btn"
            title="Đăng xuất"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  );
}
