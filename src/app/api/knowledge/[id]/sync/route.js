import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: "ID không hợp lệ" }, { status: 400 });
    }

    const doc = await prisma.aiKnowledge.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json({ success: false, error: "Tài liệu không tồn tại" }, { status: 404 });
    }

    if (session.user.role === "staff") {
      if (doc.category !== session.user.department) {
        return NextResponse.json({ success: false, error: "Không có quyền đồng bộ tài liệu của phòng ban khác" }, { status: 403 });
      }
    }

    if (!doc.sourceUrl) {
      return NextResponse.json({ success: false, error: "Tài liệu này không được nạp từ Google Drive" }, { status: 400 });
    }

    // Logic tải lại file từ Drive
    const driveUrl = doc.sourceUrl;
    const match = driveUrl.match(/[-\w]{25,}/);
    if (!match) {
      return NextResponse.json({ success: false, error: "Link Google Drive không hợp lệ" }, { status: 400 });
    }
    const fileId = match[0];
    let fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    let ext = doc.sourceExt || "pdf";
    
    if (driveUrl.includes("spreadsheets")) {
      fetchUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
      ext = "xlsx";
    } else if (driveUrl.includes("document")) {
      fetchUrl = `https://docs.google.com/document/d/${fileId}/export?format=docx`;
      ext = "docx";
    } else if (driveUrl.includes("presentation")) {
      fetchUrl = `https://docs.google.com/presentation/d/${fileId}/export/pptx`;
      ext = "pptx";
    }

    const res = await fetch(fetchUrl);
    
    if (!res.ok) {
      return NextResponse.json({ success: false, error: "Không thể tải file từ Drive. Đảm bảo file vẫn đang bật chia sẻ public." }, { status: 400 });
    }
    
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let content = "";
    
    if (ext === "pdf") {
      const { GoogleGenAI } = await import("@google/genai");
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64 = buffer.toString("base64");
      const result = await genai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64,
                },
              },
              {
                text: `Đây là tài liệu PDF có thể chứa font chữ bị mã hóa sai hoặc PDF scan.
Nhiệm vụ của bạn: Nhìn VÀO HÌNH ẢNH thực tế của từng trang PDF (KHÔNG dùng text layer có sẵn) và thực hiện OCR thị giác.

Yêu cầu cụ thể:
1. Đọc văn bản trực tiếp từ hình ảnh trang PDF như con người đọc
2. Tự động sửa lỗi font chữ tiếng Việt bị mã hóa sai (ví dụ: "xiri" → "xử lý", "hành chính" có thể bị viết sai)
3. Xuất ra văn bản tiếng Việt chuẩn Unicode UTF-8 với đầy đủ dấu thanh điệu
4. Giữ nguyên cấu trúc: tiêu đề, đoạn văn, danh sách, bảng biểu, số thứ tự
5. Chỉ trả về nội dung văn bản thuần, KHÔNG thêm ghi chú hay giải thích thêm`,
              },
            ],
          },
        ],
      });
      content = result.text ?? "";
    } else if (ext === "docx") {
      const mammoth = (await import("mammoth")).default;
      const data = await mammoth.extractRawText({ buffer });
      content = data.value;
    } else if (ext === "pptx") {
      const officeParser = require("officeparser");
      const parsedRes = await officeParser.parseOffice(buffer, { fileType: "pptx" });
      content = parsedRes.toText();
    } else if (ext === "txt" || ext === "md") {
      content = buffer.toString("utf-8");
    } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length === 0) continue;
        
        content += `\n--- Bảng dữ liệu: ${sheetName} ---\n`;
        for (const row of rows) {
          if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === "")) continue;
          const rowStr = row.map(cell => {
            if (cell === null || cell === undefined || cell === "") return " ";
            return String(cell).replace(/\r?\n|\r/g, " ").trim();
          }).join(" | ");
          content += `| ${rowStr} |\n`;
        }
      }
    } else {
      return NextResponse.json({ success: false, error: "Định dạng file không hỗ trợ." }, { status: 400 });
    }
    
    if (!content || content.trim() === "") {
       return NextResponse.json({ success: false, error: "File rỗng hoặc không thể trích xuất text." }, { status: 400 });
    }

    const updatedDoc = await prisma.aiKnowledge.update({
      where: { id },
      data: {
        content: content.trim(),
      },
    });

    try {
      const { clearKnowledgeCache } = await import("@/lib/gemini");
      clearKnowledgeCache();
    } catch (e) {}

    return NextResponse.json({ success: true, data: updatedDoc });
  } catch (error) {
    console.error("[POST /api/knowledge/[id]/sync] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
