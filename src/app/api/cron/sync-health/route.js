import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // Xác thực Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized cron request blocked.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Bắt đầu đồng bộ dữ liệu Khám Sức Khỏe vào AI...");
    
    // Yêu cầu thiết lập biến môi trường HEALTH_APP_API_URL trong Vercel
    const healthAppUrl = process.env.HEALTH_APP_API_URL || "http://localhost:3000";
    const apiUrl = `${healthAppUrl}/api/export/zalo-oa`;
    
    const reportRes = await fetch(apiUrl);
    
    if (!reportRes.ok) {
        throw new Error(`HTTP Error: ${reportRes.status}`);
    }

    const reportData = await reportRes.json();

    if (!reportData.success || !reportData.data?.markdown_knowledge) {
      throw new Error("Dữ liệu trả về không hợp lệ hoặc thiếu markdown_knowledge");
    }

    const markdownText = reportData.data.markdown_knowledge;
    const title = "Báo cáo Khám Sức Khỏe Toàn Dân (Số liệu cập nhật hằng ngày)";

    const existingDoc = await prisma.aiKnowledge.findFirst({
      where: { title: title }
    });

    let action = "CREATED";
    if (existingDoc) {
      await prisma.aiKnowledge.update({
        where: { id: existingDoc.id },
        data: { 
          content: markdownText,
          updatedAt: new Date()
        }
      });
      action = "UPDATED";
    } else {
      await prisma.aiKnowledge.create({
        data: {
          title: title,
          category: "Thống kê Y tế",
          content: markdownText,
          sourceExt: "md",
        }
      });
    }

    // Clear Gemini cache
    try {
      const { clearKnowledgeCache } = await import("@/lib/gemini");
      clearKnowledgeCache();
    } catch (e) {}

    console.log(`[Cron] Đồng bộ thành công (${action})`);
    return NextResponse.json({ success: true, action, message: "Đồng bộ thành công" });

  } catch (err) {
    console.error("[Cron] Lỗi đồng bộ AI:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
