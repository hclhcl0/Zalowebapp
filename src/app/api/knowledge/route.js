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
// Nhận FormData chứa file (pdf, docx, pptx, txt, xlsx, csv) và category
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    let category = formData.get("category");

    if (session.user.role === "staff") {
      if (!session.user.department) {
        return NextResponse.json({ success: false, error: "Bạn chưa được phân phòng ban" }, { status: 403 });
      }
      category = session.user.department; // Cưỡng ép dùng department của staff
    }

    if (!category) {
      return NextResponse.json({ success: false, error: "Thiếu chuyên mục" }, { status: 400 });
    }

    let buffer;
    let title = formData.get("title");
    let ext = "";

    const file = formData.get("file");
    const driveUrl = formData.get("driveUrl");

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      title = title || file.name;
      ext = file.name.split(".").pop().toLowerCase();
    } else if (driveUrl) {
      const match = driveUrl.match(/[-\w]{25,}/);
      if (!match) {
        return NextResponse.json({ success: false, error: "Link Google Drive không hợp lệ" }, { status: 400 });
      }
      const fileId = match[0];
      let fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
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
        return NextResponse.json({ success: false, error: "Không thể tải file từ Drive. Đảm bảo file đã bật 'Bất kỳ ai có liên kết'." }, { status: 400 });
      }
      
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);

      // Cố gắng lấy tên file và đuôi từ header
      const disposition = res.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const filenameMatch = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^'";]+)['"]?/i);
        if (filenameMatch) {
          const originalName = decodeURIComponent(filenameMatch[1]);
          ext = originalName.split(".").pop().toLowerCase();
          if (!title) title = originalName;
        }
      }
      
      // Fallback cho đuôi file nếu Drive ko trả về
      if (!ext) {
        ext = formData.get("driveExt") || "pdf";
      }
      if (!title) {
        title = "Tài liệu từ Drive";
      }
    } else {
      return NextResponse.json({ success: false, error: "Vui lòng chọn file hoặc nhập link Google Drive" }, { status: 400 });
    }

    let content = "";
    
    if (ext === "pdf") {
      // Dùng Gemini Vision để OCR trực tiếp – đọc được cả PDF scan hình ảnh
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
