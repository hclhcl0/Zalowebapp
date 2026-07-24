const { PrismaClient } = require('@prisma/client');
async function run() {
  const prisma = new PrismaClient();
  const tokenRecord = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token'} });
  console.log('Token updated at:', tokenRecord.updatedAt);
  
  // also, let's just make sure the value starts with something
  console.log('Token starts with:', tokenRecord.value.substring(0, 10));

  await prisma.$disconnect();
}
run();
