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
    const categoryId = formData.get('categoryId');

    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: 'Thiếu categoryId' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Lấy sheet đầu tiên
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Đọc dạng mảng 2D
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!aoa || aoa.length < 2) {
      return NextResponse.json({ error: 'File Excel trống hoặc không có dữ liệu' }, { status: 400 });
    }

    // Lọc bỏ hàng trống hoàn toàn
    const cleaned = aoa.filter(row =>
      Array.isArray(row) && row.some(cell => String(cell).trim() !== '')
    );

    if (cleaned.length < 2) {
      return NextResponse.json({ error: 'Không đủ dữ liệu (cần ít nhất 1 hàng tiêu đề + 1 hàng dữ liệu)' }, { status: 400 });
    }

    // Hàng đầu tiên = headers
    const headers = cleaned[0].map(h => String(h).trim());
    const rows = cleaned.slice(1).map(row =>
      headers.map((_, i) => String(row[i] ?? '').trim())
    );

    const rawTable = { headers, rows };

    // Kiểm tra danh mục tồn tại
    const category = await prisma.serviceCategory.findUnique({
      where: { id: parseInt(categoryId) },
    });
    if (!category) {
      return NextResponse.json({ error: 'Không tìm thấy danh mục' }, { status: 404 });
    }

    // Cập nhật rawTable cho danh mục đó
    await prisma.serviceCategory.update({
      where: { id: parseInt(categoryId) },
      data: { rawTable },
    });

    return NextResponse.json({
      success: true,
      message: `Import thành công: ${rows.length} dòng, ${headers.length} cột`,
      rows: rows.length,
      cols: headers.length,
      headers,
    });
  } catch (err) {
    console.error('[import-single]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
