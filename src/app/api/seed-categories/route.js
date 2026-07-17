import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const DEFAULT_CATEGORIES = [
  { name: 'Bảng giá và Tình trạng Vắc xin', order: 1 },
  { name: 'Gói vắc xin', order: 2 },
  { name: 'Bảng giá dịch vụ Xét nghiệm, Khám chữa bệnh', order: 3 },
  { name: 'Bảng giá khám, tư vấn sức khoẻ', order: 4 },
  { name: 'Bảng giá quầy thuốc', order: 5 },
  { name: 'Bảng giá khám, tư vấn, điều trị phơi nhiễm HIV', order: 6 },
  { name: 'Bảng giá thu phí hoạt động Kiểm dịch Y tế quốc tế', order: 7 },
  { name: 'Bảng giá dịch vụ quan trắc môi trường lao động', order: 8 },
  { name: 'Bảng giá khám bệnh nghề nghiệp', order: 9 },
  { name: 'Bảng giá dịch vụ xét nghiệm mẫu nước', order: 10 },
];

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let created = 0;
  let skipped = 0;
  const results = [];

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      results.push({ name: cat.name, status: 'skipped' });
      skipped++;
    } else {
      await prisma.serviceCategory.create({
        data: { name: cat.name, order: cat.order, isActive: true },
      });
      results.push({ name: cat.name, status: 'created' });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Tạo mới: ${created}, Bỏ qua (đã tồn tại): ${skipped}`,
    created,
    skipped,
    results,
  });
}
