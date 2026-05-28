import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/knowledge
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let whereClause = {};
    if (session.user.role === "staff") {
      if (!session.user.department) {
        return NextResponse.json({ success: true, data: [] }); // Staff chưa có phòng ban ko xem đc gì
      }
      whereClause = { category: session.user.department };
    }

    const docs = await prisma.aiKnowledge.findMany({
      where: whereClause,
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    let category = formData.get("category");
    const title = formData.get("title") || file?.name || "Tài liệu không tên";

    if (session.user.role === "staff") {
      if (!session.user.department) {
        return NextResponse.json({ success: false, error: "Bạn chưa được phân phòng ban" }, { status: 403 });
      }
      category = session.user.department; // Cưỡng ép dùng department của staff
    }

    if (!file || !category) {
      return NextResponse.json({ success: false, error: "Thiếu file hoặc chuyên mục" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let content = "";
    
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (ext === "pdf") {
      const PDFParser = require("pdf2json");
      content = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);
        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.parseBuffer(buffer);
      });
    } else if (ext === "docx") {
      const mammoth = (await import("mammoth")).default;
      const data = await mammoth.extractRawText({ buffer });
      content = data.value;
    } else if (ext === "pptx") {
      const officeParser = require("officeparser");
      const res = await officeParser.parseOffice(buffer, { fileType: "pptx" });
      content = res.toText();
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
          // Bỏ qua các dòng rỗng hoàn toàn
          if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === "")) continue;
          
          // Nối các ô bằng dấu | và thay khoảng trống bằng chuỗi rỗng
          const rowStr = row.map(cell => {
            if (cell === null || cell === undefined || cell === "") return " ";
            // Xóa dấu xuống dòng trong ô để không làm hỏng bảng
            return String(cell).replace(/\r?\n|\r/g, " ").trim();
          }).join(" | ");
          
          content += `| ${rowStr} |\n`;
        }
      }
    } else {
      return NextResponse.json({ success: false, error: "Định dạng file không hỗ trợ. Chỉ hỗ trợ .pdf, .docx, .pptx, .txt, .md, .xlsx, .csv" }, { status: 400 });
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
