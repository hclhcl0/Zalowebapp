const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.systemConfig.findMany();
  console.log(configs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
