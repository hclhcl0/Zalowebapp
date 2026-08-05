const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const pham_follower = await prisma.follower.findMany({
    where: { phone: { contains: '0783304549' } }
  });
  console.log('Follower Pham:', pham_follower);
}
main().finally(() => prisma.$disconnect());
