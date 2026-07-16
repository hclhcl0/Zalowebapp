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

    let totalCreated = 0;
    let totalSkipped = 0;
    const errors = [];

    // Lấy danh mục hiện có
    const existingCats = await prisma.serviceCategory.findMany();
    const catMap = new Map(existingCats.map(c => [c.name.trim().toLowerCase(), c]));

    // Xử lý từng sheet = 1 danh mục
    for (let sheetIdx = 0; sheetIdx < workbook.SheetNames.length; sheetIdx++) {
      const sheetName = workbook.SheetNames[sheetIdx];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) continue;

      // Tìm hoặc tạo danh mục từ tên sheet
      const catKey = sheetName.trim().toLowerCase();
      let category = catMap.get(catKey);
      if (!category) {
        category = await prisma.serviceCategory.create({
          data: { name: sheetName.trim(), order: sheetIdx },
        });
        catMap.set(catKey, category);
      }

      // Xử lý từng hàng
      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        
        // Tìm cột tên dịch vụ (cột đầu tiên có giá trị)
        const keys = Object.keys(row);
        const nameKey = keys.find(k => 
          k.toLowerCase().includes('tên') || 
          k.toLowerCase().includes('ten') || 
          k.toLowerCase().includes('dịch vụ') ||
          k.toLowerCase().includes('dich vu') ||
          k === keys[0]
        );
        const priceKey = keys.find(k => 
          k.toLowerCase().includes('giá') || 
          k.toLowerCase().includes('gia') || 
          k.toLowerCase().includes('đơn giá') ||
          k.toLowerCase().includes('price')
        );
        const unitKey = keys.find(k => 
          k.toLowerCase().includes('đơn vị') || 
          k.toLowerCase().includes('don vi') || 
          k.toLowerCase().includes('dvt') || 
          k.toLowerCase().includes('unit')
        );
        const noteKey = keys.find(k => 
          k.toLowerCase().includes('ghi chú') || 
          k.toLowerCase().includes('ghi chu') || 
          k.toLowerCase().includes('note')
        );

        const name = nameKey ? String(row[nameKey] || '').trim() : '';
        const rawPrice = priceKey ? row[priceKey] : '';
        const unit = unitKey ? String(row[unitKey] || 'lần').trim() : 'lần';
        const note = noteKey ? String(row[noteKey] || '').trim() : '';

        if (!name || name === '') { totalSkipped++; continue; }

        // Parse giá: bỏ dấu chấm/phẩy, chỉ lấy số
        const priceStr = String(rawPrice).replace(/[.,\s]/g, '').replace(/[^\d]/g, '');
        const price = parseInt(priceStr || '0');

        if (price <= 0) { 
          errors.push(`Dòng ${rowIdx + 2} (${name}): giá không hợp lệ`);
          totalSkipped++; 
          continue; 
        }

        try {
          await prisma.servicePrice.create({
            data: {
              name,
              price: BigInt(price),
              unit: unit || 'lần',
              note: note || null,
              categoryId: category.id,
              order: rowIdx,
            },
          });
          totalCreated++;
        } catch (e) {
          errors.push(`Dòng ${rowIdx + 2}: ${e.message}`);
          totalSkipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import thành công ${totalCreated} dịch vụ, bỏ qua ${totalSkipped} dòng`,
      totalCreated,
      totalSkipped,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    console.error('[import-services]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
