const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const link = await prisma.staffZaloLink.findMany({ where: { staffName: { contains: 'nguyen thi yen' } } });
  console.log('StaffZaloLink:', link);

  const follower = await prisma.follower.findMany({ where: { phone: { contains: '0349823597' } } });
  console.log('Follower by phone:', follower);

  const followerName = await prisma.follower.findMany({ where: { displayName: { contains: 'yên' } } });
  console.log('Follower by name:', followerName);
}

main().finally(() => prisma.$disconnect());
