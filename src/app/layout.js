import "./globals.css";
import Providers from "@/components/Providers";
import DashboardShell from "@/components/DashboardShell";

export const metadata = {
  title: "CDC Đà Nẵng | Zalo OA Admin",
  description: "Hệ thống quản trị Zalo OA - Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng",
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
