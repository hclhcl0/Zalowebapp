import "./globals.css";
import Providers from "@/components/Providers";
import DashboardShell from "@/components/DashboardShell";

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: "CDC Đà Nẵng | Zalo OA Admin",
  description: "Hệ thống quản trị Zalo OA - Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZCDC",
  },
  icons: {
    icon: "/cdc-logo.png",
    shortcut: "/cdc-logo.png",
    apple: "/cdc-logo.png",
  },
  verification: {
    other: {
      "zalo-platform-site-verification": "GTcnSB_B2MPytA1gfzecS7_abawJaaCMDJas",
    },
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          <DashboardShell>{children}</DashboardShell>
        </Providers>
      </body>
    </html>
  );
}
