/**
 * db-sync.mjs — Chỉ tạo các bảng còn thiếu trong DB production.
 * KHÔNG drop bảng nào. An toàn để chạy nhiều lần.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const statements = [
  `CREATE TABLE IF NOT EXISTS "Admin" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username")`,

  `CREATE TABLE IF NOT EXISTS "Follower" (
    "id" SERIAL NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "followedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userType" TEXT NOT NULL DEFAULT 'citizen',
    "accessLevel" TEXT NOT NULL DEFAULT 'basic',
    "department" TEXT,
    "notes" TEXT,
    "fullName" TEXT,
    "dob" TEXT,
    "cccd" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "miniAppVersion" TEXT,
    CONSTRAINT "Follower_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Follower_zaloUserId_key" ON "Follower"("zaloUserId")`,

  `CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dob" TEXT,
    "vaccineType" TEXT NOT NULL,
    "appointedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerId" INTEGER,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "TestResult" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "resultCode" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerId" INTEGER,
    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TestResult_resultCode_key" ON "TestResult"("resultCode")`,

  `CREATE TABLE IF NOT EXISTS "MiniAppSession" (
    "id" SERIAL NOT NULL,
    "followerId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MiniAppSession_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "MiniAppSession_followerId_idx" ON "MiniAppSession"("followerId")`,
  `CREATE INDEX IF NOT EXISTS "MiniAppSession_action_idx" ON "MiniAppSession"("action")`,
  `CREATE INDEX IF NOT EXISTS "MiniAppSession_createdAt_idx" ON "MiniAppSession"("createdAt")`,

  `CREATE TABLE IF NOT EXISTS "ServiceCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "ServicePrice" (
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
    CONSTRAINT "ServicePrice_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "NewsArticle" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "coverUrl" TEXT,
    "summary" TEXT,
    "author" TEXT DEFAULT 'CDC Đà Nẵng',
    "zaloArticleId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key")`,

  `CREATE TABLE IF NOT EXISTS "MessageLog" (
    "id" SERIAL NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "rawPayload" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "StaffZaloLink" (
    "id" SERIAL NOT NULL,
    "staffNameRaw" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "department" TEXT,
    "phone" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffZaloLink_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StaffZaloLink_zaloUserId_key" ON "StaffZaloLink"("zaloUserId")`,

  `CREATE TABLE IF NOT EXISTS "AiKnowledge" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceExt" TEXT,
    "allowedDepartment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiKnowledge_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "GeminiApiKey" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageTokens" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeminiApiKey_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "GroqApiKey" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageTokens" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroqApiKey_pkey" PRIMARY KEY ("id")
  )`,

  // Thêm cột mới vào Follower nếu chưa có (ALTER TABLE IF NOT EXISTS column)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='lastSeenAt') THEN
      ALTER TABLE "Follower" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='totalVisits') THEN
      ALTER TABLE "Follower" ADD COLUMN "totalVisits" INTEGER NOT NULL DEFAULT 0;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='miniAppVersion') THEN
      ALTER TABLE "Follower" ADD COLUMN "miniAppVersion" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='notes') THEN
      ALTER TABLE "Follower" ADD COLUMN "notes" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='fullName') THEN
      ALTER TABLE "Follower" ADD COLUMN "fullName" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='dob') THEN
      ALTER TABLE "Follower" ADD COLUMN "dob" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='cccd') THEN
      ALTER TABLE "Follower" ADD COLUMN "cccd" TEXT;
    END IF;
  END $$`,

  // Sửa lỗi ServicePrice thiếu cột (do schema cũ)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServicePrice' AND column_name='categoryId') THEN
      ALTER TABLE "ServicePrice" ADD COLUMN "categoryId" INTEGER;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServicePrice' AND column_name='note') THEN
      ALTER TABLE "ServicePrice" ADD COLUMN "note" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServicePrice' AND column_name='unit') THEN
      ALTER TABLE "ServicePrice" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'lần';
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServicePrice' AND column_name='order') THEN
      ALTER TABLE "ServicePrice" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServicePrice' AND column_name='updatedAt') THEN
      ALTER TABLE "ServicePrice" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServicePrice' AND column_name='isActive') THEN
      ALTER TABLE "ServicePrice" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
    END IF;
  END $$`,

  // Thêm missing columns cho ServiceCategory
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCategory' AND column_name='description') THEN
      ALTER TABLE "ServiceCategory" ADD COLUMN "description" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCategory' AND column_name='imageUrl') THEN
      ALTER TABLE "ServiceCategory" ADD COLUMN "imageUrl" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCategory' AND column_name='order') THEN
      ALTER TABLE "ServiceCategory" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCategory' AND column_name='isActive') THEN
      ALTER TABLE "ServiceCategory" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCategory' AND column_name='rawTable') THEN
      ALTER TABLE "ServiceCategory" ADD COLUMN "rawTable" JSONB;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCategory' AND column_name='pdfUrl') THEN
      ALTER TABLE "ServiceCategory" ADD COLUMN "pdfUrl" TEXT;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ServiceCategory' AND column_name='priceImages') THEN
      ALTER TABLE "ServiceCategory" ADD COLUMN "priceImages" JSONB;
    END IF;
  END $$`,

  // Foreign keys (nếu chưa có)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_followerId_fkey') THEN
      ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_followerId_fkey"
        FOREIGN KEY ("followerId") REFERENCES "Follower"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestResult_followerId_fkey') THEN
      ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_followerId_fkey"
        FOREIGN KEY ("followerId") REFERENCES "Follower"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MiniAppSession_followerId_fkey') THEN
      ALTER TABLE "MiniAppSession" ADD CONSTRAINT "MiniAppSession_followerId_fkey"
        FOREIGN KEY ("followerId") REFERENCES "Follower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServicePrice_categoryId_fkey') THEN
      ALTER TABLE "ServicePrice" ADD CONSTRAINT "ServicePrice_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
  END $$`,
];

console.log('🔄 DB Sync: Đang tạo các bảng còn thiếu...');
let ok = 0;
let fail = 0;

for (const sql of statements) {
  try {
    await prisma.$executeRawUnsafe(sql);
    ok++;
  } catch (err) {
    // Bỏ qua lỗi "already exists"
    if (!err.message.includes('already exists')) {
      console.log('❌ ERROR SQL:', sql.substring(0, 50));
      console.log('❌ DETAIL:', err.message);
      fail++;
    }
  }
}

await prisma.$disconnect();
console.log(`✅ DB Sync xong: ${ok} thành công, ${fail} lỗi`);
