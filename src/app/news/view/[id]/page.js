import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

// Tắt hoàn toàn cache tĩnh cho các bài viết, luôn tải mới nhất từ DB
export const revalidate = 0;

export default async function PublicArticlePage({ params }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  
  if (isNaN(id)) {
    notFound();
  }

  const article = await prisma.newsArticle.findUnique({
    where: { id },
  });

  if (!article) {
    notFound();
  }

  // Chia nội dung thành các đoạn dựa trên dòng mới để hiển thị dễ đọc
  const paragraphs = article.content.split("\n").map(p => p.trim()).filter(p => p.length > 0);

  // Định dạng danh mục hiển thị
  const categoryLabels = {
    daily_news: "Tin tức dịch bệnh",
    vac_schedule: "Lịch tiêm chủng",
    alert: "Thông báo khẩn cấp",
  };
  const categoryLabel = categoryLabels[article.category] || "Tin tức y tế";

  return (
    <div style={{
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      backgroundColor: "#f8fafc",
      color: "#1e293b",
      margin: 0,
      padding: 0,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Header y tế CDC */}
      <header style={{
        background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
        color: "#ffffff",
        padding: "16px 20px",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.5rem" }}>🛡️</span>
          <div style={{ textAlign: "left" }}>
            <h1 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              CDC Đà Nẵng
            </h1>
            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.9 }}>
              Trang Thông Tin Sức Khỏe Cộng Đồng
            </p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        maxWidth: "720px",
        width: "100%",
        margin: "24px auto",
        padding: "0 20px",
        boxSizing: "border-box"
      }}>
        {/* Article Wrapper Card */}
        <article style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "24px 20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
          border: "1px solid #e2e8f0"
        }}>
          {/* Category Badge & Date */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{
              backgroundColor: article.category === "alert" ? "#fef2f2" : "#f0f9ff",
              color: article.category === "alert" ? "#dc2626" : "#0284c7",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase"
            }}>
              {categoryLabel}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {new Date(article.createdAt).toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: "1.4rem",
            lineHeight: 1.4,
            fontWeight: 800,
            margin: "0 0 16px 0",
            color: "#0f172a"
          }}>
            {article.title}
          </h2>

          {/* Author info */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderTop: "1px solid #f1f5f9",
            borderBottom: "1px solid #f1f5f9",
            padding: "10px 0",
            marginBottom: "20px",
            fontSize: "0.85rem",
            color: "#64748b"
          }}>
            <span style={{ fontSize: "1.2rem" }}>👤</span>
            <span>Nguồn phát hành: <strong>Trung tâm Kiểm soát bệnh tật (CDC)</strong></span>
          </div>

          {/* Cover Image */}
          {article.coverUrl && (
            <div style={{ margin: "20px 0", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.04)" }}>
              <img
                src={article.coverUrl}
                alt={article.title}
                style={{
                  width: "100%",
                  maxHeight: "380px",
                  objectFit: "cover",
                  display: "block"
                }}
              />
            </div>
          )}

          {/* Summary / Lead Paragraph */}
          {article.summary && (
            <div style={{
              fontSize: "1.05rem",
              fontWeight: 600,
              lineHeight: 1.5,
              color: "#334155",
              backgroundColor: "#f8fafc",
              padding: "16px",
              borderRadius: "8px",
              borderLeft: "4px solid #0284c7",
              marginBottom: "24px"
            }}>
              {article.summary}
            </div>
          )}

          {/* Article Body Content */}
          <div style={{
            fontSize: "1.05rem",
            lineHeight: 1.7,
            color: "#334155"
          }}>
            {paragraphs.map((para, index) => (
              <p key={index} style={{ margin: "0 0 16px 0" }}>
                {para}
              </p>
            ))}
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: "#0f172a",
        color: "#94a3b8",
        padding: "32px 20px",
        textAlign: "center",
        fontSize: "0.8rem",
        borderTop: "1px solid #1e293b",
        marginTop: "40px"
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <p style={{ color: "#ffffff", fontWeight: 700, margin: "0 0 8px 0", fontSize: "0.85rem", textTransform: "uppercase" }}>
            Trung tâm Kiểm soát bệnh tật Thành phố Đà Nẵng
          </p>
          <p style={{ margin: "4px 0" }}>📍 Địa chỉ: 315 Phan Châu Trinh, Hải Châu, Đà Nẵng</p>
          <p style={{ margin: "4px 0" }}>📞 Điện thoại: (0236) 3821 469 | Email: cdc@danang.gov.vn</p>
          <p style={{ margin: "20px 0 0 0", fontSize: "0.75rem", opacity: 0.7 }}>
            © {new Date().getFullYear()} Hệ thống thông tin Zalo OA - Bản quyền thuộc CDC Đà Nẵng.
          </p>
        </div>
      </footer>
    </div>
  );
}
