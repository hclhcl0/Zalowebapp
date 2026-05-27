const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    await p.$executeRawUnsafe(`DROP INDEX IF EXISTS "StaffZaloLink_staffName_key"`);
    console.log('✅ Đã xóa unique index trên staffName thành công!');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  }
}

main().finally(() => p.$disconnect());
