"use client";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";

export default function Header({ onMenuToggle }) {
  const { data: session } = useSession();
  const now = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <header className="header">
      <div style={{ display: "flex", alignItems: "center" }}>
        {/* Nút 3 gạch chỉ hiển thị trên Mobile nhờ CSS class menu-toggle-btn */}
        <button 
          className="menu-toggle-btn" 
          onClick={onMenuToggle}
          title="Mở menu"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text)" }}
        >
          <Menu size={20} />
        </button>
      </div>
      <div className="header-right">
        <span className="header-time">{now}</span>
      </div>
    </header>
  );
}

