const { PrismaClient } = require('@prisma/client');
async function run() {
  const prisma = new PrismaClient();
  const tokenRecord = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token'} });
  const token = tokenRecord.value;
  
  // Thử getslice với type=normal và không có token cụ thể (lấy danh sách bài viết mới nhất)
  const res1 = await fetch(`https://openapi.zalo.me/v2.0/article/getslice?data=${encodeURIComponent(JSON.stringify({ type: "normal" }))}`, {
    headers: { access_token: token }
  });
  const data1 = await res1.json();
  console.log("getslice (type=normal, no token):", JSON.stringify(data1));
  
  // Thử với token từ lần tạo trước (nếu còn lưu)
  const articleToken = "JdIKwoXozIljg2I2uDfVWZkCtzpuBI1VMYRjCg4T54oIrS6ZnyERY33cn4n7YKRsXbVS3Z1czRnhyNRjYDl2DQ==";
  const res2 = await fetch(`https://openapi.zalo.me/v2.0/article/getslice?data=${encodeURIComponent(JSON.stringify({ token: articleToken, type: "normal" }))}`, {
    headers: { access_token: token }
  });
  const data2 = await res2.json();
  console.log("getslice (with token, type=normal):", JSON.stringify(data2));
  
  await prisma.$disconnect();
}
run().catch(console.error);
