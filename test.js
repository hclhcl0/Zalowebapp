const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TestServiceCategory" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "imageUrl" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TestServiceCategory_pkey" PRIMARY KEY ("id")
    )`);
    console.log('TestServiceCategory OK');

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "TestServicePrice" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "price" BIGINT NOT NULL,
      "unit" TEXT NOT NULL DEFAULT 'lần',
      "note" TEXT,
      "categoryId" INTEGER NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TestServicePrice_pkey" PRIMARY KEY ("id")
    )`);
    console.log('TestServicePrice OK');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
