import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.messageLog.findMany({
    where: { type: 'send_zalo' },
    orderBy: { receivedAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(logs, null, 2));
}
run().finally(() => prisma.$disconnect());
