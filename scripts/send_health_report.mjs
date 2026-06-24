import "dotenv/config";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Thay đổi URL này thành domain thật của phần mềm Khám Sức Khỏe
const HEALTH_APP_API_URL = "http://localhost:3000/api/export/zalo-oa";

async function sendHealthReport() {
  try {
    console.log("1. Lấy dữ liệu từ hệ thống Khám Sức Khỏe...");
    const reportRes = await fetch(HEALTH_APP_API_URL);
    const reportData = await reportRes.json();

    if (!reportData.success) {
      throw new Error("Không thể lấy dữ liệu: " + reportData.error);
    }

    const messageText = reportData.data.text_message;
    console.log("Nội dung báo cáo:\n", messageText);

    console.log("\n2. Lấy Zalo Access Token từ Database...");
    const config = await prisma.systemConfig.findUnique({
      where: { key: "zalo_access_token" },
    });
    const token = config?.value;
    
    if (!token) {
      throw new Error("Không tìm thấy zalo_access_token trong DB!");
    }

    console.log("3. Lấy danh sách người theo dõi (Followers)...");
    const listRes = await fetch(`https://openapi.zalo.me/v2.0/oa/getfollowers?data=${encodeURIComponent(JSON.stringify({ offset: 0, count: 50 }))}`, {
      headers: { access_token: token }
    });
    const listData = await listRes.json();

    if (listData.error !== 0 || !listData.data || !listData.data.followers) {
      throw new Error("Lỗi lấy danh sách followers: " + JSON.stringify(listData));
    }

    const followers = listData.data.followers;
    console.log(`Tìm thấy ${followers.length} followers. Bắt đầu gửi tin nhắn...`);

    let successCount = 0;
    // Gửi tin nhắn cho từng người (Lưu ý: Thực tế nên lọc gửi cho Ban Giám Đốc/Admin)
    for (const follower of followers) {
      const payload = {
        recipient: { user_id: follower.user_id },
        message: { text: messageText }
      };

      const sendRes = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": token
        },
        body: JSON.stringify(payload)
      });
      
      const sendData = await sendRes.json();
      if (sendData.error === 0) {
        successCount++;
        console.log(`- Đã gửi thành công cho user: ${follower.user_id}`);
      } else {
        console.log(`- Lỗi gửi user ${follower.user_id}: ${sendData.message} (${sendData.error})`);
      }
      
      // Delay nhỏ để tránh rate limit của Zalo
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n✅ Hoàn tất! Đã gửi thành công ${successCount}/${followers.length} tin nhắn.`);

  } catch (error) {
    console.error("❌ Lỗi toàn trình:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

sendHealthReport();
