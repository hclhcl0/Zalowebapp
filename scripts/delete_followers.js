import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Xóa liên kết (foreign key) trong Appointment và TestResult để tránh lỗi khóa ngoại
    console.log("Đang ngắt liên kết lịch hẹn và kết quả xét nghiệm...");
    await prisma.appointment.updateMany({
      data: { followerId: null },
    });
    await prisma.testResult.updateMany({
      data: { followerId: null },
    });

    // Xóa tất cả người theo dõi
    console.log("Đang xóa tất cả người quan tâm (Follower)...");
    const result = await prisma.follower.deleteMany({});
    console.log(`Đã xóa thành công ${result.count} người quan tâm.`);

  } catch (error) {
    console.error("Lỗi khi xóa người quan tâm:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
