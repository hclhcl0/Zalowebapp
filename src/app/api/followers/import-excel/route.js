import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanPhone(p) {
  if (!p) return null;
  const s = String(p).replace(/\D/g, "");
  if (s.startsWith("84")) return "0" + s.slice(2);
  if (s.startsWith("0")) return s;
  return "0" + s;
}

function normalizeName(n) {
  return String(n || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "Không tìm thấy file tải lên." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON array of arrays
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (rawData.length < 2) {
      return NextResponse.json({ error: "File Excel không có dữ liệu." }, { status: 400 });
    }

    // Find header row (usually first row)
    const headerRow = rawData[0].map(h => String(h).trim().toLowerCase());
    
    // Find column indexes
    const findCol = (keywords) => {
      for (let i = 0; i < headerRow.length; i++) {
        const title = normalizeName(headerRow[i]);
        if (keywords.some(kw => title.includes(normalizeName(kw)))) return i;
      }
      return -1;
    };

    const idxName = findCol(["Họ và tên", "TenNhanVien", "Tên"]);
    const idxPhone = findCol(["Điện thoại", "SDT", "Phone", "SĐT"]);
    const idxZalo = findCol(["Zalo", "zalo id"]);
    const idxDept = findCol(["Phòng", "Khoa", "Bộ phận"]);

    if (idxName === -1) {
      return NextResponse.json({ error: "Không tìm thấy cột Họ và Tên trong file Excel." }, { status: 400 });
    }

    let successCount = 0;
    let notFoundCount = 0;
    const errors = [];

    // Pre-fetch all followers to map them in memory
    const allFollowers = await prisma.follower.findMany();

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !row[idxName]) continue;

      const rawName = String(row[idxName]).trim();
      const normName = normalizeName(rawName);
      if (!normName) continue;

      const phone = idxPhone !== -1 ? cleanPhone(row[idxPhone]) : null;
      const dept = idxDept !== -1 ? String(row[idxDept]).trim() : null;
      let targetZaloId = null;
      if (idxZalo !== -1) {
        let rawZalo = String(row[idxZalo]).trim();
        if (rawZalo.startsWith("'")) rawZalo = rawZalo.substring(1);
        if (rawZalo) targetZaloId = rawZalo;
      }

      // Logic tìm Zalo ID từ Followers
      // Bỏ qua targetZaloId nếu nó bị Excel làm tròn (hỏng số) và không tồn tại trong Follower
      if (targetZaloId) {
        const exists = allFollowers.some(f => f.zaloUserId === targetZaloId);
        if (!exists) targetZaloId = null;
      }

      if (!targetZaloId) {
        let match = null;
        if (phone) {
          // Đầu tiên tìm theo SĐT
          match = allFollowers.find(f => cleanPhone(f.phone) === phone);
        }
        if (!match) {
          // Fallback tìm theo Tên Zalo
          match = allFollowers.find(f => normalizeName(f.displayName) === normName);
        }
        
        if (match) {
          targetZaloId = match.zaloUserId;
        }
      }

      if (targetZaloId) {
        // Upsert liên kết vào StaffZaloLink
        try {
          await prisma.staffZaloLink.upsert({
            where: { zaloUserId: targetZaloId },
            update: {
              staffNameRaw: rawName,
              staffName: normName,
              ...(dept && { department: dept }),
              ...(phone && { phone }),
            },
            create: {
              staffNameRaw: rawName,
              staffName: normName,
              zaloUserId: targetZaloId,
              department: dept,
              phone: phone,
            }
          });
          
          // Đảm bảo follower cũng được update userType = 'staff'
          await prisma.follower.update({
            where: { zaloUserId: targetZaloId },
            data: { userType: "staff" }
          });
          
          successCount++;
        } catch (err) {
          errors.push(`Lỗi dòng ${i + 1} (${rawName}): ${err.message}`);
        }
      } else {
        notFoundCount++;
        errors.push(`Dòng ${i + 1}: Không tìm thấy nhân viên "${rawName}"${phone ? ` hoặc SĐT ${phone}` : ""} trong hệ thống Zalo OA.`);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      notFoundCount,
      errors: errors.slice(0, 10), // Trả về tối đa 10 lỗi để hiển thị
    });
  } catch (err) {
    console.error("Import Excel error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống: " + err.message }, { status: 500 });
  }
}
