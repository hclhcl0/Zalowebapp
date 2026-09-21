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
    
    // Find column indexes prioritizing specific matches
    const findCol = (keywords, excludeKeywords = []) => {
      for (let i = 0; i < headerRow.length; i++) {
        const title = normalizeName(headerRow[i]);
        if (excludeKeywords.some(ex => title.includes(normalizeName(ex)))) continue;
        if (keywords.some(kw => title.includes(normalizeName(kw)))) return i;
      }
      return -1;
    };

    const idxName = findCol(["họ và tên", "họ tên", "tennhanvien", "tên"]);
    const idxPhone = findCol(["điện thoại", "sdt", "phone", "sđt"]);
    // Cột Zalo User ID: tìm 'zalo user id', 'zalouserid', 'zalo id', 'user id' và loại trừ cột 'tên zalo'
    const idxZaloId = findCol(["zalo user id", "zalouserid", "zalo id", "id zalo", "user id", "userid"], ["tên zalo", "ten zalo", "display"]);
    // Cột Tên hiển thị Zalo (nếu có)
    const idxZaloName = findCol(["tên zalo", "ten zalo", "display name", "zalo name"]);
    const idxDept = findCol(["phòng", "khoa", "bộ phận", "đơn vị", "don vi"]);

    if (idxName === -1) {
      return NextResponse.json({ error: "Không tìm thấy cột Họ và Tên trong file Excel." }, { status: 400 });
    }

    let successCount = 0;
    let notFoundCount = 0;
    const errors = [];

    // Pre-fetch all followers to map them in memory if needed
    const allFollowers = await prisma.follower.findMany();

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !row[idxName]) continue;

      const rawName = String(row[idxName]).trim();
      const normName = normalizeName(rawName);
      if (!normName) continue;

      const phone = idxPhone !== -1 ? cleanPhone(row[idxPhone]) : null;
      const dept = idxDept !== -1 ? String(row[idxDept]).trim() : null;
      const zaloDisplayName = idxZaloName !== -1 ? String(row[idxZaloName]).trim() : null;

      let targetZaloId = null;
      if (idxZaloId !== -1) {
        let rawZalo = String(row[idxZaloId]).trim();
        if (rawZalo.startsWith("'")) rawZalo = rawZalo.substring(1);
        // Zalo User ID hợp lệ là chuỗi số có từ 10 chữ số trở lên
        if (/^\d{10,}$/.test(rawZalo)) {
          targetZaloId = rawZalo;
        }
      }

      // Nếu file Excel không có cột Zalo User ID, thử tìm trong hệ thống qua SĐT hoặc Tên
      if (!targetZaloId) {
        let match = null;
        if (phone) {
          match = allFollowers.find(f => cleanPhone(f.phone) === phone);
        }
        if (!match) {
          match = allFollowers.find(f => normalizeName(f.displayName) === normName);
        }
        
        if (match) {
          targetZaloId = match.zaloUserId;
        }
      }

      if (targetZaloId) {
        try {
          // 1. Upsert StaffZaloLink
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
          
          // 2. Upsert Follower (đảm bảo tồn tại bản ghi follower là staff)
          await prisma.follower.upsert({
            where: { zaloUserId: targetZaloId },
            update: {
              userType: "staff",
              ...(phone && { phone }),
              ...(dept && { department: dept }),
              ...(zaloDisplayName && { displayName: zaloDisplayName }),
            },
            create: {
              zaloUserId: targetZaloId,
              displayName: zaloDisplayName || rawName,
              phone: phone,
              department: dept,
              userType: "staff",
            }
          });
          
          successCount++;
        } catch (err) {
          errors.push(`Lỗi dòng ${i + 1} (${rawName}): ${err.message}`);
        }
      } else {
        notFoundCount++;
        errors.push(`Dòng ${i + 1}: Không tìm thấy ID Zalo hoặc thông tin khớp cho nhân viên "${rawName}"${phone ? ` (SĐT ${phone})` : ""}.`);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      notFoundCount,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("Import Excel error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống: " + err.message }, { status: 500 });
  }
}
