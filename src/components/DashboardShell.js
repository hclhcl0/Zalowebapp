"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function DashboardShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on page changes (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const isNoLayoutPage = pathname === "/login" || pathname.startsWith("/news/view/");

  if (isNoLayoutPage) {
    return <main>{children}</main>;
  }

  return (
    <div className={`app-container ${sidebarOpen ? "sidebar-open" : ""}`}>
      {/* Overlay to dismiss sidebar on mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <Sidebar />
      
      <div className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
