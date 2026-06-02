const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.systemConfig.update({ where: { key: 'google_api_key' }, data: { value: '' } });
  console.log('cleared google_api_key');
}

main().catch(console.error).finally(() => prisma.$disconnect());
