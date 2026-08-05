const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pham = await prisma.staffZaloLink.findMany();
  console.log('Pham:', pham);
}

main().finally(() => prisma.$disconnect());
