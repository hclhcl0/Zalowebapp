"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      setLoading(false);

      if (result?.error) {
        setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      } else if (result?.status === 200 || result?.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Đăng nhập thất bại. Trạng thái: " + (result?.status || "Không xác định"));
      }
    } catch (err) {
      setLoading(false);
      setError("Lỗi kết nối: " + (err.message || "Không thể kết nối đến máy chủ"));
    }
  }

  return (
    <div className="login-page">
      {/* Phần bên trái - Banner */}
      <div className="login-banner">
        <div className="login-banner-content">
          <div className="login-logo">
            <div className="login-logo-icon" style={{ background: "#ffffff", padding: "6px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.8)" }}>
              <img src="/cdc-logo.png" alt="CDC Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>
          <h1 className="login-banner-title">CDC Đà Nẵng</h1>
          <p className="login-banner-subtitle">
            Trung tâm Kiểm soát bệnh tật<br />Thành phố Đà Nẵng
          </p>
          <div className="login-banner-divider" />
          <p className="login-banner-desc">
            Hệ thống quản lý Zalo OA tập trung — Theo dõi lịch hẹn, gửi thông báo
            và chăm sóc sức khỏe cộng đồng hiệu quả hơn.
          </p>
          <div className="login-stats">
            <div className="login-stat">
              <span className="login-stat-number">12K+</span>
              <span className="login-stat-label">Người theo dõi</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-number">500+</span>
              <span className="login-stat-label">Lịch hẹn/tháng</span>
            </div>
            <div className="login-stat">
              <span className="login-stat-number">99%</span>
              <span className="login-stat-label">Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Phần bên phải - Form đăng nhập */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2 className="login-form-title">Đăng nhập</h2>
            <p className="login-form-subtitle">
              Vui lòng nhập thông tin tài khoản quản trị
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                Tên đăng nhập
              </label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  className="form-input"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Mật khẩu
              </label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-btn-loading">
                  <span className="spinner" /> Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          <p className="login-footer">
            Hệ thống dành riêng cho nhân viên CDC Đà Nẵng.<br />
            Liên hệ IT nếu quên mật khẩu.
          </p>
        </div>
      </div>
    </div>
  );
}
