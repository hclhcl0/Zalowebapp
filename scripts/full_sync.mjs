import "dotenv/config";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function syncAllFollowers() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "zalo_access_token" },
  });
  const token = config?.value;
  if (!token) {
    console.error("No token found");
    return;
  }

  console.log("Fetching all followers from Zalo...");
  let offset = 0;
  const count = 50;
  let followersList = [];
  let hasMore = true;

  while (hasMore) {
    const listRes = await fetch(`https://openapi.zalo.me/v2.0/oa/getfollowers?data=${encodeURIComponent(JSON.stringify({ offset, count }))}`, {
      headers: { access_token: token }
    });
    const listData = await listRes.json();
    
    if (listData.error === 0 && listData.data && listData.data.followers.length > 0) {
      followersList = followersList.concat(listData.data.followers);
      offset += listData.data.followers.length;
      if (listData.data.followers.length < count || offset >= listData.data.total) {
        hasMore = false;
      }
    } else {
      console.error("Error fetching list:", listData);
      hasMore = false;
    }
  }

  console.log(`Found ${followersList.length} followers. Starting profile sync...`);
  
  let successCount = 0;
  for (let i = 0; i < followersList.length; i++) {
    const userId = followersList[i].user_id;
    
    try {
      const profileRes = await fetch(`https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`, {
        headers: { access_token: token }
      });
      const profileData = await profileRes.json();

      let displayName = "Người dùng Zalo";
      let avatarUrl = "";
      let phone = null;

      if (profileData.error === 0 && profileData.data) {
        displayName = profileData.data.display_name || displayName;
        avatarUrl = profileData.data.avatar || "";
        phone = profileData.data.shared_info?.phone || profileData.data.phone || null;
        if (phone !== null) phone = String(phone);
      } else {
        console.warn(`[WARN] Could not get profile for ${userId}:`, profileData.message);
      }

      await prisma.follower.upsert({
        where: { zaloUserId: userId },
        update: {
          displayName,
          avatarUrl,
          phone
        },
        create: {
          zaloUserId: userId,
          displayName,
          avatarUrl,
          phone,
          userType: "citizen"
        }
      });
      
      successCount++;
      process.stdout.write(`\rSynced ${successCount}/${followersList.length}`);
      
      // Delay to avoid rate limits
      await delay(200);
      
    } catch (e) {
      console.error(`\nFailed to sync user ${userId}:`, e.message);
    }
  }

  console.log("\nSync completed!");
}

syncAllFollowers().catch(console.error).finally(() => prisma.$disconnect());
