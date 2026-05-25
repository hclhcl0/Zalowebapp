"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ============================================================
// DANH SÁCH PHÒNG BAN CDC ĐÀ NẴNG
// ============================================================
const DEPARTMENTS = [
  "Phòng chống bệnh truyền nhiễm",
  "Kiểm dịch Y tế quốc tế",
  "Ký sinh trùng - Côn trùng",
  "Phòng chống bệnh không lây nhiễm",
  "Sức khoẻ môi trường - YTTH",
  "Sức khoẻ sinh sản",
  "Dinh dưỡng",
  "Phòng chống HIV/AIDS - ĐTNC",
  "Truyền thông giáo dục sức khoẻ",
  "Phòng khám đa khoa",
  "Bệnh nghề nghiệp",
  "Xét nghiệm – CĐHA - TDCN",
  "Dược – VTYT",
  "Tổ chức - Hành chính",
  "Tài chính - Kế toán",
  "Kế hoạch - Nghiệp vụ"
];

// ============================================================
// SVG LOGO CDC
// ============================================================
function CDCLogo() {
  return (
    <div style={{
      width: 72, height: 72, borderRadius: "50%",
      background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 32px rgba(29,78,216,0.35)",
      margin: "0 auto 20px",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 32, lineHeight: 1 }}>🏥</span>
    </div>
  );
}

// ============================================================
// TRẠNG THÁI: ĐANG TẢI
// ============================================================
function LoadingState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{
        width: 48, height: 48, border: "4px solid #e0f2fe",
        borderTop: "4px solid #1d4ed8", borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
      }} />
      <p style={{ color: "#64748b", fontSize: "0.95rem" }}>Đang tải thông tin...</p>
    </div>
  );
}

// ============================================================
// TRẠNG THÁI: LỖI (không có uid)
// ============================================================
function InvalidLinkState() {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
      <h2 style={{ color: "#0f172a", fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>
        Đường dẫn không hợp lệ
      </h2>
      <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
        Vui lòng sử dụng đường dẫn được gửi từ Zalo OA của CDC Đà Nẵng.
        <br />Liên hệ Phòng TCHC nếu bạn cần hỗ trợ.
      </p>
    </div>
  );
}

// ============================================================
// TRẠNG THÁI: ĐÃ ĐĂNG KÝ THÀNH CÔNG
// ============================================================
function SuccessState({ staffNameRaw, displayName }) {
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
        Xin chào <strong>{staffNameRaw}</strong>!<br />
        Tài khoản Zalo <em>"{displayName}"</em> đã được liên kết với hệ thống CDC.
      </p>
      <div style={{
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 12, padding: "16px 20px", textAlign: "left",
      }}>
        <p style={{ color: "#166534", fontSize: "0.85rem", lineHeight: 1.7, margin: 0 }}>
          📩 Từ nay bạn sẽ nhận được thông báo lương, thuế TNCN và các thông tin quan trọng
          trực tiếp qua Zalo. Không cần thực hiện thêm bước nào.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT CHÍNH (dùng useSearchParams)
// ============================================================
function RegisterForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  const [phase, setPhase] = useState("loading"); // loading | invalid | form | already | submitting | success | error
  const [follower, setFollower] = useState(null);
  const [existingLink, setExistingLink] = useState(null);
  const [formData, setFormData] = useState({ staffNameRaw: "", department: "", phone: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState(null);

  // Tải thông tin follower theo uid
  useEffect(() => {
    if (!uid) { setPhase("invalid"); return; }
    fetch(`/api/followers/register?uid=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then(json => {
        if (json.error || !json.follower) { setPhase("invalid"); return; }
        setFollower(json.follower);
        if (json.existing) {
          setExistingLink(json.existing);
          setFormData({
            staffNameRaw: json.existing.staffNameRaw || "",
            department: json.existing.department || "",
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
    if (!formData.staffNameRaw.trim()) { setErrorMsg("Vui lòng nhập họ và tên đầy đủ."); return; }
    setPhase("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/followers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, ...formData }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErrorMsg(json.error || "Đã xảy ra lỗi. Vui lòng thử lại.");
        setPhase("form");
      } else {
        setSuccessData({ staffNameRaw: formData.staffNameRaw, displayName: follower?.displayName });
        setPhase("success");
      }
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
      setPhase("form");
    }
  };

  // ── Render ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%);
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
          border: 2px solid #e2e8f0; border-radius: 10px;
          font-size: 0.95rem; font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none; color: #0f172a;
          background: #f8fafc;
        }
        .form-input:focus {
          border-color: #1d4ed8;
          box-shadow: 0 0 0 3px rgba(29,78,216,0.12);
          background: white;
        }
        .form-input::placeholder { color: #94a3b8; }
        .btn-primary {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #1d4ed8, #0369a1);
          color: white; border: none; border-radius: 10px;
          font-size: 1rem; font-weight: 700; font-family: inherit;
          cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 15px rgba(29,78,216,0.4);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(29,78,216,0.5);
        }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .btn-outline {
          width: 100%; padding: 12px;
          background: transparent; color: #1d4ed8;
          border: 2px solid #1d4ed8; border-radius: 10px;
          font-size: 0.9rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.15s;
        }
        .btn-outline:hover { background: #eff6ff; }
        label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px; }
        .required { color: #ef4444; }
        @media (max-width: 480px) { .card { padding: 28px 20px; } }
      `}</style>

      <div className="card">
        <CDCLogo />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
            Đăng Ký Nhân Viên CDC
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: 6 }}>
            Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng
          </p>
        </div>

        {/* Nội dung theo phase */}
        {phase === "loading" && <LoadingState />}
        {phase === "invalid" && <InvalidLinkState />}
        {phase === "success" && <SuccessState {...successData} />}

        {(phase === "form" || phase === "already" || phase === "submitting") && (
          <>
            {/* Thông tin Zalo hiện tại */}
            {follower && (
              <div style={{
                background: "#f0f9ff", border: "1px solid #bae6fd",
                borderRadius: 12, padding: "14px 16px", marginBottom: 24,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                {follower.avatarUrl ? (
                  <img src={follower.avatarUrl} alt="" style={{
                    width: 44, height: 44, borderRadius: "50%",
                    border: "2px solid #0ea5e9", flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#0ea5e9", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 20, flexShrink: 0,
                  }}>👤</div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#0c4a6e", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {follower.displayName || "Người dùng Zalo"}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#0369a1" }}>
                    Tài khoản Zalo của bạn
                  </div>
                </div>
                <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                  <span style={{
                    background: "#0ea5e9", color: "white",
                    fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px",
                    borderRadius: 20,
                  }}>Zalo</span>
                </div>
              </div>
            )}

            {/* Banner đã đăng ký */}
            {phase === "already" && (
              <div style={{
                background: "#fefce8", border: "1px solid #fde68a",
                borderRadius: 10, padding: "10px 14px", marginBottom: 20,
                fontSize: "0.82rem", color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ flexShrink: 0 }}>✏️</span>
                <span>Bạn đã đăng ký trước đó. Bạn có thể <strong>cập nhật lại</strong> thông tin bên dưới.</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Họ và tên */}
                <div>
                  <label>Họ và Tên đầy đủ <span className="required">*</span></label>
                  <input
                    id="staffNameRaw"
                    type="text"
                    className="form-input"
                    placeholder="VD: Nguyễn Văn An"
                    value={formData.staffNameRaw}
                    onChange={e => setFormData(p => ({ ...p, staffNameRaw: e.target.value }))}
                    autoComplete="name"
                    required
                    disabled={phase === "submitting"}
                  />
                  <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 5 }}>
                    Nhập đúng tên trong danh sách nhân viên (có dấu, đầy đủ họ tên đệm)
                  </p>
                </div>

                {/* Phòng ban */}
                <div>
                  <label>Phòng / Khoa / Bộ phận</label>
                  <select
                    id="department"
                    className="form-input"
                    value={formData.department}
                    onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                    disabled={phase === "submitting"}
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">-- Chọn đơn vị công tác --</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Số điện thoại */}
                <div>
                  <label>Số điện thoại (xác nhận)</label>
                  <input
                    id="phone"
                    type="tel"
                    className="form-input"
                    placeholder="VD: 0901234567"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                    autoComplete="tel"
                    disabled={phase === "submitting"}
                  />
                </div>

                {/* Lỗi */}
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

                {/* Nút submit */}
                <button
                  type="submit"
                  id="submit-btn"
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
                  ) : phase === "already" ? "✏️ Cập Nhật Thông Tin" : "✅ Đăng Ký Liên Kết Zalo"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.6 }}>
            🔒 Thông tin của bạn được bảo mật và chỉ dùng để gửi thông báo nội bộ.<br />
            Mọi thắc mắc liên hệ Phòng Kế Hoạch - Nghiệp vụ – CDC Đà Nẵng.
          </p>
        </div>
      </div>
    </>
  );
}

// ============================================================
// PAGE (bọc trong Suspense vì dùng useSearchParams)
// ============================================================
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%)",
      }}>
        <div style={{
          width: 48, height: 48, border: "4px solid rgba(255,255,255,0.2)",
          borderTop: "4px solid white", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
