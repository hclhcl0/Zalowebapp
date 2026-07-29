"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, Mail, Users, Menu } from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Mail,            label: "Nội Bộ",       href: "/salary-email" },
  { icon: Users,           label: "Quan Tâm",     href: "/followers" },
];

export default function BottomNav({ onMenuOpen }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
        <Link
          key={href}
          href={href}
          className={`bottom-nav-item ${isActive(href) ? "active" : ""}`}
        >
          <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
          <span>{label}</span>
        </Link>
      ))}
      {/* Nút Thêm mở Sidebar */}
      <button className="bottom-nav-item" onClick={onMenuOpen}>
        <Menu size={22} strokeWidth={1.8} />
        <span>Thêm</span>
      </button>
    </nav>
  );
}
