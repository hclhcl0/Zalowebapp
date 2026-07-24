const { PrismaClient } = require('@prisma/client');
async function run() {
  const prisma = new PrismaClient();
  const tokenRecord = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token'} });
  if (!tokenRecord) { console.log('no token'); process.exit(1); }
  const token = tokenRecord.value;
  
  const testCover = async (cover) => {
    const articlePayload = {
      type: 'normal',
      title: 'Test Zalo Article Cover ' + Date.now(),
      description: 'Kiem tra tao bai viet Zalo OA',
      author: 'CDC Da Nang',
      body: [{ type: 'text', content: '<p>Test</p>' }],
      cover: cover,
      status: 'hide'
    };
    const r = await fetch('https://openapi.zalo.me/v2.0/article/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: token },
      body: JSON.stringify(articlePayload)
    });
    const d = await r.json();
    console.log('Cover:', JSON.stringify(cover), '->', JSON.stringify(d));
  };

  await testCover({ cover_type: 0, photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' });
  await testCover({ cover_type: 1, photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' });
  await testCover({ cover_type: 1, cover_view: 'show', photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png' });
  await testCover({ photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' });
  await testCover({ cover_type: 0, cover_view: 'show', photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png' });
  await testCover({ cover_type: 'photo', photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' });

  await prisma.$disconnect();
}
run().catch(console.error);
