import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/knowledge
export async function GET() {
  try {
    const docs = await prisma.aiKnowledge.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: docs });
  } catch (error) {
    console.error("[GET /api/knowledge] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/knowledge
// Nhận FormData chứa file (pdf, txt) và category
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const category = formData.get("category");
    const title = formData.get("title") || file?.name || "Tài liệu không tên";

    if (!file || !category) {
      return NextResponse.json({ success: false, error: "Thiếu file hoặc chuyên mục" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let content = "";
    
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (ext === "pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      content = data.text;
    } else if (ext === "txt" || ext === "md") {
      content = buffer.toString("utf-8");
    } else {
      return NextResponse.json({ success: false, error: "Định dạng file không hỗ trợ. Chỉ hỗ trợ .pdf, .txt, .md" }, { status: 400 });
    }
    
    if (!content || content.trim() === "") {
       return NextResponse.json({ success: false, error: "Không thể trích xuất nội dung từ file hoặc file rỗng." }, { status: 400 });
    }

    const doc = await prisma.aiKnowledge.create({
      data: {
        title: title,
        category: category,
        content: content.trim(),
      },
    });

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("[POST /api/knowledge] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
