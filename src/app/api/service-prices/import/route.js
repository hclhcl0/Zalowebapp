import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    let totalSheets = 0;
    const errors = [];

    // Lấy danh mục hiện có
    const existingCats = await prisma.serviceCategory.findMany();
    const catMap = new Map(existingCats.map(c => [c.name.trim().toLowerCase(), c]));

    // Xử lý từng sheet = 1 danh mục
    for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
      const sheetName = workbook.SheetNames[sheetIdx];
      const sheet = workbook.Sheets[sheetName];

      // Đọc dạng mảng 2D (bao gồm header)
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (!aoa || aoa.length < 2) continue;

      // Lọc bỏ hàng trống hoàn toàn
      const cleaned = aoa.filter(row =>
        Array.isArray(row) && row.some(cell => String(cell).trim() !== '')
      );

      if (cleaned.length < 2) continue;

      // Hàng đầu tiên không trống = headers
      const headers = cleaned[0].map(h => String(h).trim());
      const rows = cleaned.slice(1).map(row =>
        headers.map((_, i) => String(row[i] ?? '').trim())
      );

      // Lưu rawTable: { headers, rows }
      const rawTable = { headers, rows };

      // Tìm hoặc tạo danh mục
      const catKey = sheetName.trim().toLowerCase();
      let category = catMap.get(catKey);
      if (!category) {
        category = await prisma.serviceCategory.create({
          data: { name: sheetName.trim(), order: sheetIdx, rawTable },
        });
        catMap.set(catKey, category);
      } else {
        await prisma.serviceCategory.update({
          where: { id: category.id },
          data: { rawTable },
        });
      }

      totalSheets++;
    }

    return NextResponse.json({
      success: true,
      message: `Import thành công ${totalSheets} bảng giá từ ${totalSheets} sheet`,
      totalSheets,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    console.error('[import-services]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
