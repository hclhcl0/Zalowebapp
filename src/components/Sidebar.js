"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { CDC_LOGO_BASE64 } from "@/lib/logo";
import { 
  LayoutDashboard, Users, Megaphone, Mail, 
  Newspaper, CalendarDays, AlertTriangle, 
  Settings, UserCog, LogOut, ChevronRight, Download
} from "lucide-react";

// Helper to map string/emoji to Lucide icon component
const IconMapper = ({ iconName, size = 18 }) => {
  switch (iconName) {
    case "LayoutDashboard": return <LayoutDashboard size={size} />;
    case "Users": return <Users size={size} />;
    case "Megaphone": return <Megaphone size={size} />;
    case "Mail": return <Mail size={size} />;
    case "📰":
    case "Newspaper": return <Newspaper size={size} />;
    case "📅":
    case "CalendarDays": return <CalendarDays size={size} />;
    case "🚨":
    case "AlertTriangle": return <AlertTriangle size={size} />;
    case "Settings": return <Settings size={size} />;
    case "UserCog": return <UserCog size={size} />;
    default: return <ChevronRight size={size} />; // fallback
  }
};

const menuGroups = [
  {
    title: "Tổng quan",
    items: [
      { icon: "LayoutDashboard", label: "Dashboard", href: "/" },
      { icon: "Users", label: "Người quan tâm Zalo", href: "/followers" },
      { icon: "Megaphone", label: "Gửi Tin Truyền Thông", href: "/broadcast" },
      { icon: "Mail", label: "Gửi Cập Nhật Thông Tin Nội Bộ", href: "/salary-email" },
    ],
  },
  {
    title: "Tin tức & Cảnh báo",
    items: [
      { icon: "Newspaper", label: "Tin vắn dịch bệnh", href: "/news/daily" },
      { icon: "CalendarDays", label: "Lịch tiêm chủng", href: "/news/vaccination-schedule" },
      { icon: "AlertTriangle", label: "Thông báo khẩn", href: "/news/alerts" },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { icon: "Settings", label: "Cài đặt & Zalo API", href: "/settings" },
      { icon: "UserCog", label: "Quản lý tài khoản", href: "/settings/users" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [categories, setCategories] = useState([
    { id: "daily_news", name: "Tin vắn dịch bệnh", icon: "Newspaper" },
    { id: "vac_schedule", name: "Lịch tiêm chủng", icon: "CalendarDays" },
    { id: "alert", name: "Thông báo khẩn", icon: "AlertTriangle" }
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

  const [activeTabParam, setActiveTabParam] = useState("");
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect standalone mode (already installed)
    const isStandAloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(!!isStandAloneMode);

    // Capture install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTabParam(params.get("tab") || "");
    };
    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    const interval = setInterval(handleUrlChange, 200);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("Tính năng cài đặt tự động đang bị khóa bởi trình duyệt (thường do chưa dùng đường dẫn bảo mật HTTPS hoặc đang dùng trình duyệt nhúng của Zalo).\n\nTuy nhiên, bạn có thể TỰ CÀI ĐẶT bằng cách:\n1. Mở trang web này bằng Chrome/Safari.\n2. Bấm vào biểu tượng 3 chấm (⋮) ở góc trên bên phải.\n3. Chọn 'Thêm vào màn hình chính' (Add to Home screen) hoặc 'Cài đặt ứng dụng' (Install app).");
    }
  };

  const isActive = (item) => {
    if (item.href.includes("?")) {
      const [path, query] = item.href.split("?");
      if (pathname !== path) return false;
      const params = new URLSearchParams(query);
      const tabVal = params.get("tab");
      return activeTabParam === tabVal;
    }
    if (pathname === item.href) {
      if (pathname === "/settings" && activeTabParam) {
        return false;
      }
      return true;
    }
    return false;
  };

  const initials = session?.user?.name
    ?.split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("") ?? "A";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <img src={CDC_LOGO_BASE64} alt="CDC Logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6, flexShrink: 0 }} />
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
                  className={`menu-item ${isActive(item) ? "active" : ""}`}
                >
                  <span className="menu-item-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconMapper iconName={item.icon} />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          
        {/* PWA Install Button */}
        {!isStandalone && (
          <div className="menu-group" style={{ marginTop: "1rem" }}>
            <button 
              onClick={handleInstallClick}
              className="menu-item" 
              style={{ background: "var(--primary-light)", color: "var(--primary)", border: "1px solid var(--border-focus)", width: "100%", textAlign: "left", cursor: "pointer", fontWeight: 600, padding: "10px 12px" }}
            >
              <span className="menu-item-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={18} />
              </span>
              Cài đặt App (Lưu ĐT)
            </button>
          </div>
        )}
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
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* iOS Install Instruction Modal */}
      {showIOSModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 99999,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          backdropFilter: "blur(2px)"
        }} onClick={() => setShowIOSModal(false)}>
          <div style={{
            background: "white", padding: "24px", borderRadius: "20px 20px 0 0",
            width: "100%", maxWidth: "450px", textAlign: "center",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
            animation: "slideUp 0.3s ease-out"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: "40px", height: "5px", background: "#e2e8f0", borderRadius: "10px", margin: "0 auto 20px" }}></div>
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.2rem", color: "var(--text)" }}>Cài đặt ZCDC vào iPhone</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.95rem", color: "var(--text-muted)" }}>
              Để lưu ứng dụng ra màn hình chính, vui lòng làm theo hướng dẫn:
            </p>
            <div style={{ textAlign: "left", fontSize: "0.95rem", lineHeight: 1.6, background: "var(--bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <div style={{display: "flex", gap: "10px", marginBottom: "12px"}}>
                <span style={{fontSize: "1.2rem"}}>1️⃣</span>
                <span>Chạm vào biểu tượng <strong>Chia sẻ (Share)</strong> <span style={{fontSize:"1.1rem"}}>⍐</span> ở thanh công cụ Safari dưới cùng.</span>
              </div>
              <div style={{display: "flex", gap: "10px", marginBottom: "12px"}}>
                <span style={{fontSize: "1.2rem"}}>2️⃣</span>
                <span>Cuộn xuống và chọn <strong>"Thêm vào MH chính"</strong> (Add to Home Screen) <span style={{fontSize:"1.1rem"}}>➕</span>.</span>
              </div>
              <div style={{display: "flex", gap: "10px"}}>
                <span style={{fontSize: "1.2rem"}}>3️⃣</span>
                <span>Nhấn <strong>Thêm</strong> ở góc trên bên phải màn hình.</span>
              </div>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: "100%", marginTop: "24px", padding: "12px", fontSize: "1rem", borderRadius: "10px" }}
              onClick={() => setShowIOSModal(false)}
            >
              Đã hiểu
            </button>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}} />
        </div>
      )}
    </aside>
  );
}
