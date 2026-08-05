const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const links = await prisma.staffZaloLink.findMany();
  
  const ids = links.map(l => l.zaloUserId);
  const followers = await prisma.follower.findMany({
    where: { zaloUserId: { in: ids } }
  });
  
  const followerMap = {};
  followers.forEach(f => { followerMap[f.zaloUserId] = f; });
  
  const missingZaloName = links.filter(l => !followerMap[l.zaloUserId] || !followerMap[l.zaloUserId].displayName);
  console.log(`Total links: ${links.length}`);
  console.log(`Missing Zalo Name: ${missingZaloName.length}`);
  if(missingZaloName.length > 0) {
    console.log('Sample missing:', missingZaloName.slice(0, 5));
  }
}

main().finally(() => prisma.$disconnect());
