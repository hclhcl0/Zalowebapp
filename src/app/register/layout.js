/**
 * Layout riêng cho trang /register
 * Trang này là CÔNG KHAI — không cần đăng nhập, không có sidebar.
 * Next.js cho phép nested layout: layout.js trong thư mục con
 * sẽ override layout cha cho tất cả trang trong thư mục đó.
 */
import "@/app/globals.css";

export const metadata = {
  title: "Đăng Ký Nhân Viên CDC | Liên Kết Zalo",
  description: "Đăng ký liên kết tài khoản Zalo với danh sách nhân viên CDC Đà Nẵng",
  icons: {
    icon: "/cdc-logo.png",
    shortcut: "/cdc-logo.png",
    apple: "/cdc-logo.png",
  }
};

export default function RegisterLayout({ children }) {
  return children;
}
