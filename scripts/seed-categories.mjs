// scripts/seed-categories.mjs
// Chạy: node scripts/seed-categories.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
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

async function main() {
  console.log('🌱 Đang tạo danh mục dịch vụ...\n');

  let created = 0;
  let skipped = 0;

  for (const cat of CATEGORIES) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      console.log(`⏭️  Đã tồn tại: ${cat.name}`);
      skipped++;
    } else {
      await prisma.serviceCategory.create({
        data: {
          name: cat.name,
          order: cat.order,
          isActive: true,
        },
      });
      console.log(`✅ Đã tạo: ${cat.name}`);
      created++;
    }
  }

  console.log(`\n✔ Hoàn tất! Tạo mới: ${created}, Bỏ qua: ${skipped}`);
}

main()
  .catch(e => { console.error('❌ Lỗi:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
