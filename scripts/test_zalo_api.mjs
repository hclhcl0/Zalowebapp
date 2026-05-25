import "dotenv/config";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: "zalo_access_token" },
  });
  const token = config?.value;
  console.log("Token from DB:", token ? "Found" : "Not Found");

  console.log("\nFetching followers list...");
  const listRes = await fetch(`https://openapi.zalo.me/v2.0/oa/getfollowers?data=${encodeURIComponent(JSON.stringify({ offset: 0, count: 5 }))}`, {
    headers: { access_token: token }
  });
  const listData = await listRes.json();
  console.log("Followers list:", JSON.stringify(listData, null, 2));

  if (listData.error === 0 && listData.data && listData.data.followers.length > 0) {
    const userId = listData.data.followers[0].user_id;
    console.log(`\nFetching profile for user: ${userId}...`);
    const profileRes = await fetch(`https://openapi.zalo.me/v2.0/oa/getprofile?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`, {
      headers: { access_token: token }
    });
    const profileData = await profileRes.json();
    console.log("Profile response:", JSON.stringify(profileData, null, 2));
  } else {
    console.log("Could not get followers list.");
  }
}

test().finally(() => prisma.$disconnect());
