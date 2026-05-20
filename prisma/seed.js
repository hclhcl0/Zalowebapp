/**
 * Script tạo tài khoản Admin mặc định
 * Chạy: node prisma/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("Admin@2026", 10);

  const admin = await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashed,
      fullName: "Quản trị viên CDC",
      role: "admin",
    },
  });

  const staffHashed = await bcrypt.hash("Staff@2026", 10);
  const staff = await prisma.admin.upsert({
    where: { username: "nhanvien" },
    update: {},
    create: {
      username: "nhanvien",
      password: staffHashed,
      fullName: "Nhân viên CDC",
      role: "staff",
    },
  });

  console.log("✅ Tạo tài khoản Admin thành công:", admin.username);
  console.log("   Mật khẩu mặc định: Admin@2026");
  console.log("✅ Tạo tài khoản Nhân viên thành công:", staff.username);
  console.log("   Mật khẩu mặc định: Staff@2026");

  // Seed sample follower data
  const sampleFollower = await prisma.follower.upsert({
    where: { zaloUserId: "zalo_user_test_123" },
    update: {},
    create: {
      zaloUserId: "zalo_user_test_123",
      displayName: "Nguyễn Hoàng Nam",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      phone: "0905123456",
    },
  });

  // Seed sample appointment linked to follower
  await prisma.appointment.create({
    data: {
      fullName: "Nguyễn Hoàng Nam",
      phone: "0905123456",
      dob: "20/12/2023",
      vaccineType: "Vắc-xin 6 trong 1 (Hexaxim)",
      appointedAt: new Date("2026-05-25T08:30:00Z"),
      status: "pending",
      followerId: sampleFollower.id,
    },
  });

  // Seed sample test result linked to follower
  await prisma.testResult.create({
    data: {
      fullName: "Nguyễn Hoàng Nam",
      phone: "0905123456",
      resultCode: "KQ-998877",
      content: "Kết quả xét nghiệm kháng nguyên Sốt xuất huyết: ÂM TÍNH. Người bệnh theo dõi thêm tại nhà.",
      testedAt: new Date("2026-05-18T14:15:00Z"),
      followerId: sampleFollower.id,
    },
  });

  // Seed message logs
  await prisma.messageLog.createMany({
    data: [
      {
        zaloUserId: "zalo_user_test_123",
        direction: "inbound",
        type: "text",
        content: "Chào CDC, tôi muốn đăng ký tiêm chủng cho bé vào tuần sau.",
        receivedAt: new Date("2026-05-18T09:00:00Z"),
      },
      {
        zaloUserId: "zalo_user_test_123",
        direction: "outbound",
        type: "text",
        content: "Chào bạn Nam, bạn vui lòng sử dụng tính năng Đặt lịch tiêm chủng trực tuyến trên Mini App hoặc cung cấp thông tin để chúng tôi hỗ trợ nhé.",
        receivedAt: new Date("2026-05-18T09:05:00Z"),
      },
    ],
  });

  console.log("✅ Seed dữ liệu người quan tâm Zalo mẫu và lịch sử dịch vụ y tế thành công!");
  console.log("   ⚠️ Hãy đổi mật khẩu sau khi đăng nhập lần đầu!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
