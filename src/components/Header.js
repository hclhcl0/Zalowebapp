"use client";
import { useSession } from "next-auth/react";

export default function Header({ title = "Dashboard", breadcrumb = "Tổng quan", onMenuToggle }) {
  const { data: session } = useSession();
  const now = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <header className="header">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button 
          className="menu-toggle-btn" 
          onClick={onMenuToggle}
          title="Mở menu"
        >
          ☰
        </button>
        <div className="header-left">
          <span className="header-title">{title}</span>
          <span className="header-breadcrumb">CDC Đà Nẵng · {breadcrumb}</span>
        </div>
      </div>
      <div className="header-right">
        <span className="header-time">{now}</span>
        <div className="header-badge" title="Thông báo">
          🔔
          <span className="badge-dot" />
        </div>
        <div className="header-badge" title="Cài đặt">⚙️</div>
      </div>
    </header>
  );
}
