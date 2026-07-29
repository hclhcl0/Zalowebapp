const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const logs = await prisma.messageLog.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 10
  });
  
  for (const log of logs) {
    if (log.content && log.content.includes("Video")) {
      console.log("----");
      console.log("Date:", log.receivedAt);
      console.log("Content:", log.content);
    }
  }
  await prisma.$disconnect();
}
run();
