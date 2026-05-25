"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CDC_LOGO_BASE64 } from "@/lib/logo";

// ============================================================
// SVG LOGO CDC
// ============================================================
function CDCLogo() {
  return (
    <div style={{
      width: 72, height: 72, borderRadius: "50%",
      background: "#ffffff",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 32px rgba(15,118,110,0.15)",
      border: "1px solid #0f766e",
      margin: "0 auto 20px",
      padding: "6px",
      flexShrink: 0,
    }}>
      <img src={CDC_LOGO_BASE64} alt="CDC Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{
        width: 48, height: 48, border: "4px solid #ccfbf1",
        borderTop: "4px solid #0f766e", borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
      }} />
      <p style={{ color: "#64748b", fontSize: "0.95rem" }}>Đang tải thông tin...</p>
    </div>
  );
}

function InvalidLinkState() {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
      <h2 style={{ color: "#0f172a", fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>
        Đường dẫn không hợp lệ
      </h2>
      <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
        Vui lòng sử dụng đường dẫn được gửi từ Zalo OA của CDC Đà Nẵng.
      </p>
    </div>
  );
}

function SuccessState({ fullName, displayName }) {
  return (
    <div style={{ textAlign: "center", padding: "20px 0" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "linear-gradient(135deg, #10b981, #059669)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px",
        boxShadow: "0 8px 32px rgba(16,185,129,0.35)",
        animation: "popIn 0.4s ease",
      }}>
        <span style={{ fontSize: 40 }}>✓</span>
      </div>
      <h2 style={{ color: "#065f46", fontSize: "1.4rem", fontWeight: 700, marginBottom: 8 }}>
        Đăng ký thành công!
      </h2>
      <p style={{ color: "#047857", fontSize: "0.95rem", marginBottom: 20, lineHeight: 1.6 }}>
        Xin chào <strong>{fullName}</strong>!<br />
        Tài khoản Zalo <em>"{displayName}"</em> đã được liên kết thông tin.
      </p>
      <div style={{
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 12, padding: "16px 20px", textAlign: "left",
      }}>
        <p style={{ color: "#166534", fontSize: "0.85rem", lineHeight: 1.7, margin: 0 }}>
          📩 Từ nay bạn sẽ nhận được thông báo kết quả xét nghiệm, khám bệnh trực tiếp qua Zalo một cách nhanh chóng và bảo mật.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT CHÍNH
// ============================================================
function PatientRegisterForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  const [phase, setPhase] = useState("loading"); // loading | invalid | form | already | submitting | success | error
  const [follower, setFollower] = useState(null);
  const [formData, setFormData] = useState({ fullName: "", dob: "", cccd: "", phone: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState(null);

  // Tải thông tin follower theo uid
  useEffect(() => {
    if (!uid) { setPhase("invalid"); return; }
    fetch(`/api/followers/patient-register?uid=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then(json => {
        if (json.error || !json.follower) { setPhase("invalid"); return; }
        setFollower(json.follower);
        if (json.follower.userType === "staff") {
          setPhase("is_staff");
          return;
        }
        if (json.existing) {
          setFormData({
            fullName: json.existing.fullName || "",
            dob: json.existing.dob || "",
            cccd: json.existing.cccd || "",
            phone: json.existing.phone || "",
          });
          setPhase("already");
        } else {
          setPhase("form");
        }
      })
      .catch(() => setPhase("invalid"));
  }, [uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.phone.trim()) { 
      setErrorMsg("Vui lòng nhập Họ Tên và Số điện thoại."); 
      return; 
    }
    setPhase("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/followers/patient-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, ...formData }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErrorMsg(json.error || "Đã xảy ra lỗi. Vui lòng thử lại.");
        setPhase("form");
      } else {
        setSuccessData({ fullName: formData.fullName, displayName: follower?.displayName });
        setPhase("success");
      }
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
      setPhase("form");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #022c22 0%, #0f766e 50%, #14b8a6 100%);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .card {
          background: white;
          border-radius: 20px;
          padding: 40px 36px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05);
          animation: fadeUp 0.5s ease;
        }
        .form-input {
          width: 100%; padding: 12px 16px;
          border: 1px solid #e2e8f0; border-radius: 10px;
          font-size: 0.95rem; font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none; color: #0f172a;
          background: #f8fafc;
        }
        .form-input:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
          background: white;
        }
        .form-input::placeholder { color: #94a3b8; }
        .btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #0f766e, #14b8a6);
          color: white; border: none; border-radius: 10px;
          font-size: 1rem; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 15px rgba(15, 118, 110, 0.4);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(15, 118, 110, 0.5);
        }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .required { color: #ef4444; }
        @media (max-width: 480px) { .card { padding: 28px 20px; } }
      `}</style>

      <div className="card">
        <CDCLogo />

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
            Đăng Ký Nhận Kết Quả
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: 6 }}>
            CDC Đà Nẵng - Khách hàng & Bệnh nhân
          </p>
        </div>

        {phase === "loading" && <LoadingState />}
        {phase === "invalid" && <InvalidLinkState />}
        {phase === "success" && <SuccessState {...successData} />}

        {phase === "is_staff" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16, animation: "popIn 0.4s ease" }}>⚠️</div>
            <h2 style={{ color: "#b45309", fontSize: "1.3rem", fontWeight: 700, marginBottom: 12 }}>
              Tài Khoản Nhân Viên
            </h2>
            <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: 20 }}>
              Tài khoản Zalo này hiện đang liên kết với hồ sơ **Cán bộ/Nhân viên CDC**. Bạn không cần đăng ký tài khoản Khách hàng.
            </p>
            <div style={{
              background: "#fffbeb", border: "1px solid #fef3c7",
              borderRadius: 12, padding: "16px 20px", textAlign: "left",
            }}>
              <p style={{ color: "#b45309", fontSize: "0.82rem", lineHeight: 1.7, margin: 0 }}>
                💡 Nếu đây là nhầm lẫn hoặc bạn muốn cập nhật, vui lòng liên hệ **Phòng Kế Hoạch - Nghiệp vụ** để được hỗ trợ điều chỉnh.
              </p>
            </div>
          </div>
        )}

        {(phase === "form" || phase === "already" || phase === "submitting") && (
          <>
            {follower && (
              <div style={{
                background: "#f0fdfa", border: "1px solid #ccfbf1",
                borderRadius: 12, padding: "14px 16px", marginBottom: 24,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                {follower.avatarUrl ? (
                  <img src={follower.avatarUrl} alt="" style={{
                    width: 44, height: 44, borderRadius: "50%",
                    border: "1px solid #14b8a6", flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#14b8a6", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 20, flexShrink: 0,
                  }}>👤</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#115e59", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {follower.displayName || "Người dùng Zalo"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#0f766e" }}>
                    Tài khoản Zalo của bạn
                  </div>
                </div>
              </div>
            )}

            {phase === "already" && (
              <div style={{
                background: "#fefce8", border: "1px solid #fde68a",
                borderRadius: 10, padding: "10px 14px", marginBottom: 20,
                fontSize: "0.82rem", color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ flexShrink: 0 }}>✏️</span>
                <span>Bạn đã khai báo trước đó. Bạn có thể <strong>cập nhật lại</strong> thông tin bên dưới.</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label>Họ và Tên <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Nguyễn Văn An"
                    value={formData.fullName}
                    onChange={e => setFormData(p => ({ ...p, fullName: e.target.value }))}
                    required
                    disabled={phase === "submitting"}
                  />
                </div>

                <div>
                  <label>Số điện thoại <span className="required">*</span></label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="VD: 0901234567"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    required
                    disabled={phase === "submitting"}
                  />
                </div>
                
                <div>
                  <label>Số CCCD / Mã Bệnh Nhân</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Giúp đối chiếu kết quả chính xác hơn"
                    value={formData.cccd}
                    onChange={e => setFormData(p => ({ ...p, cccd: e.target.value }))}
                    disabled={phase === "submitting"}
                  />
                </div>

                <div>
                  <label>Ngày sinh</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dob}
                    onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))}
                    disabled={phase === "submitting"}
                  />
                </div>

                {errorMsg && (
                  <div style={{
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 8, padding: "10px 14px",
                    fontSize: "0.85rem", color: "#dc2626",
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    <span>⚠️</span> {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={phase === "submitting"}
                >
                  {phase === "submitting" ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{
                        width: 18, height: 18, border: "2px solid rgba(255,255,255,0.4)",
                        borderTop: "2px solid white", borderRadius: "50%",
                        animation: "spin 0.8s linear infinite", display: "inline-block",
                      }} />
                      Đang xử lý...
                    </span>
                  ) : phase === "already" ? "✏️ Cập Nhật Thông Tin" : "✅ Hoàn Tất Đăng Ký"}
                </button>
              </div>
            </form>
          </>
        )}

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.6 }}>
            🔒 Thông tin cá nhân của bạn được bảo mật hoàn toàn.<br />
            Chỉ sử dụng cho mục đích trả kết quả y tế tại CDC Đà Nẵng.
          </p>
        </div>
      </div>
    </>
  );
}

export default function PatientRegisterPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #022c22 0%, #0f766e 50%, #14b8a6 100%)",
      }}>
        <div style={{
          width: 48, height: 48, border: "4px solid rgba(255,255,255,0.2)",
          borderTop: "4px solid white", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <PatientRegisterForm />
    </Suspense>
  );
}
