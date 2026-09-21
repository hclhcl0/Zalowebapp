import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function cleanPhone(p) {
  if (!p) return null;
  const s = String(p).replace(/\D/g, "");
  if (!s) return null;
  if (s.startsWith("84")) return "0" + s.slice(2);
  if (s.startsWith("0")) return s;
  if (s.length === 9) return "0" + s;
  return s;
}

function normalizeName(n) {
  return String(n || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
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

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (rawData.length < 2) {
      return NextResponse.json({ error: "File Excel không có dữ liệu." }, { status: 400 });
    }

    const headerRow = rawData[0].map(h => String(h).trim().toLowerCase());

    const findCol = (keywords, excludeKeywords = []) => {
      for (let i = 0; i < headerRow.length; i++) {
        const title = normalizeName(headerRow[i]);
        if (excludeKeywords.some(ex => title.includes(normalizeName(ex)))) continue;
        if (keywords.some(kw => title.includes(normalizeName(kw)))) return i;
      }
      return -1;
    };

    const idxName = findCol(["họ và tên", "họ tên", "fullname", "tên"]);
    const idxPhone = findCol(["điện thoại", "sdt", "phone", "sđt"]);
    const idxCccd = findCol(["cccd", "cmnd", "căn cước"]);
    const idxDob = findCol(["ngày sinh", "ngaysinh", "dob", "năm sinh"]);
    const idxZaloId = findCol(["zalo user id", "zalouserid", "zalo id", "id zalo", "user id", "userid"], ["tên zalo", "ten zalo", "display"]);
    const idxZaloName = findCol(["tên zalo", "ten zalo", "display name", "zalo name"]);

    let successCount = 0;
    let updatedCount = 0;
    const errors = [];

    const allFollowers = await prisma.follower.findMany();

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row) continue;

      const rawFullName = idxName !== -1 && row[idxName] ? String(row[idxName]).trim() : null;
      const phone = idxPhone !== -1 ? cleanPhone(row[idxPhone]) : null;
      const cccd = idxCccd !== -1 && row[idxCccd] ? String(row[idxCccd]).trim() : null;
      const dob = idxDob !== -1 && row[idxDob] ? String(row[idxDob]).trim() : null;
      const zaloDisplayName = idxZaloName !== -1 && row[idxZaloName] ? String(row[idxZaloName]).trim() : null;

      let targetZaloId = null;
      if (idxZaloId !== -1) {
        let rawZalo = String(row[idxZaloId]).trim();
        if (rawZalo.startsWith("'")) rawZalo = rawZalo.substring(1);
        if (/^\d{10,}$/.test(rawZalo)) targetZaloId = rawZalo;
      }

      // Nếu không có Zalo ID, thử khớp theo SĐT trong danh sách Followers
      if (!targetZaloId && phone) {
        const matched = allFollowers.find(f => cleanPhone(f.phone) === phone);
        if (matched) targetZaloId = matched.zaloUserId;
      }

      if (targetZaloId) {
        try {
          await prisma.follower.upsert({
            where: { zaloUserId: targetZaloId },
            update: {
              userType: "citizen",
              ...(rawFullName && { fullName: rawFullName }),
              ...(phone && { phone }),
              ...(cccd && { cccd }),
              ...(dob && { dob }),
              ...(zaloDisplayName && { displayName: zaloDisplayName }),
            },
            create: {
              zaloUserId: targetZaloId,
              displayName: zaloDisplayName || rawFullName || "Khách hàng",
              fullName: rawFullName,
              phone,
              cccd,
              dob,
              userType: "citizen",
            },
          });
          successCount++;
        } catch (err) {
          errors.push(`Dòng ${i + 1}: ${err.message}`);
        }
      } else if (rawFullName || phone) {
        errors.push(`Dòng ${i + 1}: Không tìm thấy Zalo ID hoặc SĐT khớp trong hệ thống cho "${rawFullName || phone}".`);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error("Import Citizens error:", err);
    return NextResponse.json({ error: "Lỗi hệ thống: " + err.message }, { status: 500 });
  }
}
