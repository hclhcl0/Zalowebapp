"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BottomNav from "./BottomNav";

export default function DashboardShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on page changes (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Register PWA Service Worker
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(
        (registration) => console.log("Service Worker registered with scope:", registration.scope),
        (error) => console.error("Service Worker registration failed:", error)
      );
    }
  }, []);

  const isNoLayoutPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/patient-register" ||
    pathname.startsWith("/news/view/");

  if (isNoLayoutPage) {
    return <main>{children}</main>;
  }

  return (
    <div className={`app-container ${sidebarOpen ? "sidebar-open" : ""}`}>
      {/* Overlay để đóng sidebar khi tap ngoài trên mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main className="page-content">{children}</main>
      </div>

      {/* Bottom Navigation — chỉ hiển thị trên mobile qua CSS */}
      <BottomNav onMenuOpen={() => setSidebarOpen((prev) => !prev)} />
    </div>
  );
}
