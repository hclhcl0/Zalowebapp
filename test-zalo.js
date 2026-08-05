require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const config = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token' } });
  const fetch = (await import('node-fetch')).default;
  const url = 'https://openapi.zalo.me/v2.0/oa/getprofile?data=' + encodeURIComponent(JSON.stringify({ user_id: '4463357893270406831' }));
  const response = await fetch(url, { headers: { access_token: config.value } });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
