require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    // Tìm các Follower được tạo trong ngày 5/8/2026 (sau 0h)
    // Loại citizen, chưa có SĐT
    const startOfDay = new Date('2026-08-05T00:00:00.000Z');
    
    const targets = await prisma.follower.findMany({
      where: {
        followedAt: { gte: startOfDay },
        userType: 'citizen',
        phone: null,
      },
      include: {
        appointments: true,
        testResults: true,
        sessions: true
      }
    });

    const toDelete = targets.filter(f => 
      f.appointments.length === 0 && 
      f.testResults.length === 0 && 
      f.sessions.length === 0
    );

    console.log(`Found ${toDelete.length} ghost records from sync to delete.`);
    
    if (toDelete.length > 0) {
      const deleteResult = await prisma.follower.deleteMany({
        where: {
          id: { in: toDelete.map(f => f.id) }
        }
      });
      console.log(`Deleted ${deleteResult.count} records successfully.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
