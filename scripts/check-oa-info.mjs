import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const token = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token' } });
if (!token?.value) {
  console.log('❌ Không tìm thấy access token trong DB');
  process.exit(1);
}

console.log('✅ Tìm thấy access token, đang gọi Zalo OA API...\n');

// Lấy thông tin OA
const r = await fetch('https://openapi.zalo.me/v2.0/oa/getoa', {
  headers: { access_token: token.value }
});
const data = await r.json();
console.log('=== Thông tin Zalo OA ===');
console.log(JSON.stringify(data, null, 2));

// Thử tạo bài viết test (không có cover) để xem lỗi gì
console.log('\n=== Test tạo Article (không có ảnh) ===');
const articlePayload = {
  type: "normal",
  title: "Test API Article Permission Check",
  description: "Kiem tra quyen tao bai viet",
  author: "CDC Da Nang",
  body: [{ type: "text", content: "<p>Test</p>" }],
  status: "show"
};
const r2 = await fetch('https://openapi.zalo.me/v2.0/article/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', access_token: token.value },
  body: JSON.stringify(articlePayload)
});
const data2 = await r2.json();
console.log(JSON.stringify(data2, null, 2));

await prisma.$disconnect();
