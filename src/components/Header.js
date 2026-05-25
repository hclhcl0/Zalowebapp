"use client";
import { useSession } from "next-auth/react";
import { Menu } from "lucide-react";

export default function Header({ title = "Dashboard", breadcrumb = "Tổng quan", onMenuToggle }) {
  const { data: session } = useSession();
  const now = new Date().toLocaleDateString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <header className="header">
      <div style={{ display: "flex", alignItems: "center" }}>
        {/* Empty left side for premium minimal look */}
      </div>
      <div className="header-right">
        <span className="header-time">{now}</span>
      </div>
    </header>
  );
}

