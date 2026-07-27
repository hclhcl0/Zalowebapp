import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDB() {
  console.log('\n🔍 Kiểm tra trạng thái database...\n');
  
  try {
    // Danh sách tất cả bảng
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
    `;
    console.log('📋 Bảng hiện có trong DB:');
    tables.forEach(t => console.log('  ✅', t.tablename));
    
    // Danh sách bảng trong Schema Prisma cần có
    const requiredTables = [
      'Admin', 'Follower', 'Appointment', 'TestResult', 'MiniAppSession',
      'ServiceCategory', 'ServicePrice', 'NewsArticle', 'SystemConfig',
      'MessageLog', 'StaffZaloLink', 'AiKnowledge', 'GeminiApiKey', 'GroqApiKey'
    ];
    
    const existingNames = tables.map(t => t.tablename);
    console.log('\n❌ Bảng còn thiếu:');
    let missingTables = 0;
    for (const t of requiredTables) {
      if (!existingNames.includes(t)) {
        console.log('  ❌ MISSING:', t);
        missingTables++;
      }
    }
    if (missingTables === 0) console.log('  (Không thiếu bảng nào)');
    
    // Kiểm tra cột quan trọng
    console.log('\n🔍 Kiểm tra các cột quan trọng:');
    const colChecks = [
      { table: 'Follower', col: 'interestGroup' },
      { table: 'Follower', col: 'fullName' },
      { table: 'Follower', col: 'dob' },
      { table: 'Follower', col: 'cccd' },
      { table: 'Follower', col: 'lastSeenAt' },
      { table: 'Follower', col: 'totalVisits' },
      { table: 'StaffZaloLink', col: 'updatedAt' },
      { table: 'AiKnowledge', col: 'allowedDepartment' },
      { table: 'AiKnowledge', col: 'sourceUrl' },
      { table: 'AiKnowledge', col: 'sourceExt' },
    ];
    
    for (const { table, col } of colChecks) {
      const result = await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_name='${table}' AND column_name='${col}'`
      );
      const status = result.length > 0 ? '✅ OK' : '❌ MISSING';
      console.log(`  ${status} — ${table}.${col}`);
    }
    
  } catch (e) {
    console.error('Lỗi:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();
