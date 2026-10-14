/**
 * API: Thống kê & Phân tích Chủ đề hay hỏi nhất (Top FAQs & Xu hướng Dịch tễ)
 * GET /api/inquiries/analytics
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 1. Tổng số câu hỏi
    const total = await prisma.citizenInquiry.count();

    // 2. Phân bố theo trạng thái
    const statusCounts = await prisma.citizenInquiry.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusMap = {
      pending_staff: 0,
      staff_replied: 0,
      ai_resolved: 0,
      closed: 0,
    };
    statusCounts.forEach((s) => {
      statusMap[s.status] = s._count.id;
    });

    // 3. Phân bố theo chủ đề (Top FAQs)
    const topicCounts = await prisma.citizenInquiry.groupBy({
      by: ["topic"],
      _count: { id: true },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Lấy label của các chủ đề từ TopicAssignment
    const allTopics = await prisma.topicAssignment.findMany();
    const topicLabelMap = {};
    allTopics.forEach((t) => {
      topicLabelMap[t.topicCode] = t.topicLabel;
    });

    const topicDistribution = topicCounts.map((tc) => ({
      topicCode: tc.topicCode,
      topicLabel: topicLabelMap[tc.topic] || tc.topic,
      count: tc._count.id,
      percentage: total > 0 ? Math.round((tc._count.id / total) * 100) : 0,
    }));

    // 4. Xu hướng 14 ngày gần nhất
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentInquiries = await prisma.citizenInquiry.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true, status: true, topic: true },
    });

    const dailyTrend = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      dailyTrend[dateKey] = { date: dateKey, total: 0, pending: 0, resolved: 0 };
    }

    recentInquiries.forEach((item) => {
      const dateKey = item.createdAt.toISOString().split("T")[0];
      if (dailyTrend[dateKey]) {
        dailyTrend[dateKey].total++;
        if (item.status === "pending_staff") {
          dailyTrend[dateKey].pending++;
        } else {
          dailyTrend[dateKey].resolved++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        total,
        statusBreakdown: statusMap,
        resolutionRate: {
          aiResolvedPct: total > 0 ? Math.round((statusMap.ai_resolved / total) * 100) : 0,
          staffRepliedPct: total > 0 ? Math.round((statusMap.staff_replied / total) * 100) : 0,
          pendingStaffPct: total > 0 ? Math.round((statusMap.pending_staff / total) * 100) : 0,
        },
        topicDistribution,
        dailyTrend: Object.values(dailyTrend),
      },
    });
  } catch (error) {
    console.error("[GET /api/inquiries/analytics Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
