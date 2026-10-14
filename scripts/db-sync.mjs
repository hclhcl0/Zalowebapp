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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Follower' AND column_name='interestGroup') THEN
      ALTER TABLE "Follower" ADD COLUMN "interestGroup" TEXT;
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

  // ─── CitizenInquiry & TopicAssignment (Tiếp nhận & Phân công câu hỏi) ───────
  `CREATE TABLE IF NOT EXISTS "CitizenInquiry" (
    "id" SERIAL NOT NULL,
    "zaloUserId" TEXT NOT NULL,
    "citizenName" TEXT,
    "question" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT 'KHAC',
    "topicLabel" TEXT DEFAULT 'Khác',
    "status" TEXT NOT NULL DEFAULT 'pending_staff',
    "aiDraftReply" TEXT,
    "staffReply" TEXT,
    "assignedDept" TEXT,
    "assignedStaffId" TEXT,
    "assignedStaffName" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CitizenInquiry_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "CitizenInquiry_status_idx" ON "CitizenInquiry"("status")`,
  `CREATE INDEX IF NOT EXISTS "CitizenInquiry_topic_idx" ON "CitizenInquiry"("topic")`,
  `CREATE INDEX IF NOT EXISTS "CitizenInquiry_zaloUserId_idx" ON "CitizenInquiry"("zaloUserId")`,
  `CREATE INDEX IF NOT EXISTS "CitizenInquiry_createdAt_idx" ON "CitizenInquiry"("createdAt")`,

  `CREATE TABLE IF NOT EXISTS "TopicAssignment" (
    "id" SERIAL NOT NULL,
    "topicCode" TEXT NOT NULL,
    "topicLabel" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "staffZaloUserId" TEXT,
    "staffName" TEXT,
    "notifyZalo" BOOLEAN NOT NULL DEFAULT true,
    "keywords" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicAssignment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "TopicAssignment_topicCode_key" ON "TopicAssignment"("topicCode")`,
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

console.log(`✅ DB Sync xong: ${ok} thành công, ${fail} lỗi`);

// ─── Seed cấu hình Webhook Payload CMS → Zalo OA ───────────────────────────
const webhookConfigs = [
  { key: 'payload_webhook_secret', value: 'cdc-webhook-secret-2025', label: 'Webhook Secret tu Payload CMS' },
  { key: 'payload_cms_url', value: 'https://ecdc.vnos.org', label: 'URL goc Payload CMS' },
  { key: 'payload_article_url_pattern', value: 'https://ecdc.vnos.org/bai-viet/{slug}', label: 'URL pattern bai viet CMS' },
];
for (const cfg of webhookConfigs) {
  try {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { label: cfg.label },   // Không ghi đè value nếu đã tồn tại (tránh reset sau khi admin đổi)
      create: { key: cfg.key, value: cfg.value, label: cfg.label },
    });
  } catch (e) {
    // Bảng chưa tồn tại hoặc lỗi khác — bỏ qua
  }
}
// ────────────────────────────────────────────────────────────────────────────

// ─── Seed 8 nhóm chủ đề phân công cán bộ mặc định ─────────────────────────
const defaultTopics = [
  { topicCode: 'DAI', topicLabel: 'Bệnh dại & Động vật cắn', department: 'Phòng chống bệnh truyền nhiễm', staffZaloUserId: '2999287519307234497', staffName: 'Đoàn Cẩm Trúc', keywords: 'chó cắn, mèo cắn, dại, bệnh dại, vắc xin dại, huyết thanh kháng dại, sar, verorab, vaxirab, abhayrab, động vật cắn, rách da, cắn chảy máu, súc vật cắn' },
  { topicCode: 'TIEM_CHUNG', topicLabel: 'Tiêm chủng & Vắc xin', department: 'Phòng khám đa khoa', staffZaloUserId: '5816798253612901351', staffName: 'Trần Hà Thái', keywords: 'tiêm, tiêm chủng, vắc xin, vacxin, tiêm phòng, lịch tiêm, mũi tiêm, tcmr, tiêm mở rộng, phản ứng sau tiêm, sốt sau tiêm, 6 trong 1, phế cầu, sởi, quai bị, rubella, hpv, ung thư cổ tử cung, viêm não nhật bản, thủy đậu, cúm mùa, rota' },
  { topicCode: 'BENH_TRUYEN_NHIEM', topicLabel: 'Bệnh truyền nhiễm & Dịch mùa', department: 'Phòng chống bệnh truyền nhiễm', staffZaloUserId: '2999287519307234497', staffName: 'Đoàn Cẩm Trúc', keywords: 'sốt xuất huyết, sxh, sốt dengue, tay chân miệng, tcm, cúm, cúm a, cúm b, thủy đậu, ho gà, whitmore, đậu mùa khỉ, lăng quăng, bọ gậy, muỗi vằn, phát ban, dịch bệnh, lây nhiễm, cách ly' },
  { topicCode: 'XET_NGHIEM', topicLabel: 'Xét nghiệm Y tế & Nước / Thực phẩm', department: 'Xét nghiệm – CĐHA - TDCN', staffZaloUserId: '4558633248955938333', staffName: 'Lê Mai Hoàng Thông', keywords: 'xét nghiệm, xn máu, xét nghiệm máu, vi sinh, pcr, hiv, viêm gan, test nhanh, xét nghiệm nước, nước ăn uống, nước sinh hoạt, mẫu nước, kiểm nghiệm thực phẩm, kết quả xét nghiệm, kqxn, chụp xquang, siêu âm' },
  { topicCode: 'KHAM_BENH', topicLabel: 'Khám bệnh & Khám sức khỏe', department: 'Phòng khám đa khoa', staffZaloUserId: '5816798253612901351', staffName: 'Trần Hà Thái', keywords: 'khám bệnh, khám sức khỏe, ksk, khám lái xe, khám đi học, khám đi làm, giấy khám sức khỏe, bhyt, giờ khám, lịch khám, bác sĩ khám, phòng khám, kiểm tra sức khỏe, nội soi' },
  { topicCode: 'DINH_DUONG', topicLabel: 'Dinh dưỡng & An toàn thực phẩm', department: 'Dinh dưỡng', staffZaloUserId: '3133539333901491490', staffName: 'Lê Thị Vân', keywords: 'dinh dưỡng, biếng ăn, suy dinh dưỡng, béo phì, thực đơn, vi chất, an toàn thực phẩm, attp, ngộ độc, ngộ độc thực phẩm, đau bụng, nôn mửa sau ăn, tiêu chảy' },
  { topicCode: 'BENH_KHONG_LAY', topicLabel: 'Bệnh không lây nhiễm & Thuốc lá', department: 'Phòng chống bệnh không lây nhiễm', staffZaloUserId: '7755709677330530559', staffName: 'Nguyễn Thị Phượng', keywords: 'tăng huyết áp, huyết áp, đái tháo đường, tiểu đường, thuốc lá, cai thuốc lá, thuốc lá điện tử, tim mạch, bệnh nghề nghiệp' },
  { topicCode: 'THU_TUC', topicLabel: 'Thủ tục hành chính & Khiếu nại', department: 'Tổ chức - Hành chính', staffZaloUserId: '4443935348483087346', staffName: 'Lê Thị Phương Uyên', keywords: 'thủ tục, hành chính, giấy tờ, chứng nhận, tuyển dụng, nộp hồ sơ, văn bản, phản ánh, khiếu nại, thái độ, ban giám đốc' },
];

for (const t of defaultTopics) {
  try {
    await prisma.topicAssignment.upsert({
      where: { topicCode: t.topicCode },
      update: { topicLabel: t.topicLabel, department: t.department },
      create: {
        topicCode: t.topicCode,
        topicLabel: t.topicLabel,
        department: t.department,
        staffZaloUserId: t.staffZaloUserId,
        staffName: t.staffName,
        notifyZalo: true,
        keywords: t.keywords,
      },
    });
  } catch (e) {
    // Bảng chưa tồn tại hoặc lỗi khác — bỏ qua
  }
}
// ────────────────────────────────────────────────────────────────────────────

await prisma.$disconnect();
