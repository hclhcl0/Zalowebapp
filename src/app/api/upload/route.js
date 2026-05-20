import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy tệp tin tải lên" }, { status: 400 });
    }

    // Validate file type (images and videos)
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Chỉ cho phép tải lên tệp tin hình ảnh hoặc video" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Đảm bảo thư mục upload tồn tại trong public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Tạo tên tệp độc nhất
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Lưu tệp
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`,
    });
  } catch (err) {
    console.error("[Upload API Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
