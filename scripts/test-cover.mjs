import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const token = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token' } });
  if (!token?.value) {
    console.log('Khong tim thay access token');
    process.exit(1);
  }

  // 1. Test with cover_type: 0
  const articlePayload = {
    type: 'normal',
    title: 'Test Article with cover_type 0',
    description: 'Kiem tra tao bai viet Zalo OA',
    author: 'CDC Da Nang',
    body: [{ type: 'text', content: '<p>Test</p>' }],
    cover: {
      cover_type: 0,
      photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png',
      status: 'show'
    },
    status: 'show'
  };
  
  const r2 = await fetch('https://openapi.zalo.me/v2.0/article/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', access_token: token.value },
    body: JSON.stringify(articlePayload)
  });
  const data2 = await r2.json();
  console.log('Result for cover_type: 0 ->', JSON.stringify(data2, null, 2));

  await prisma.$disconnect();
}
main().catch(console.error);
