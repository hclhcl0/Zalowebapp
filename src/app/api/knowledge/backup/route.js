import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdmin(session.user.role)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const knowledgeList = await prisma.aiKnowledge.findMany({
      orderBy: { createdAt: "desc" },
    });

    const backupData = JSON.stringify(knowledgeList, null, 2);

    const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const fileName = `cdc-ai-knowledge-backup-${dateStr}.json`;

    return new Response(backupData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Lỗi khi backup kho tri thức:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
