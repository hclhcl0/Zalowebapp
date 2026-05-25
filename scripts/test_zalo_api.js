import { prisma } from "./src/lib/prisma.js";
import { getUserProfile, getFollowers } from "./src/lib/zalo.js";

async function test() {
  console.log("Fetching followers list...");
  const followers = await getFollowers(0, 5);
  console.log("Followers list response:", JSON.stringify(followers, null, 2));

  if (followers.error === 0 && followers.data && followers.data.followers.length > 0) {
    const userId = followers.data.followers[0].user_id;
    console.log(`\nFetching profile for user: ${userId}...`);
    const profile = await getUserProfile(userId);
    console.log("Profile response:", JSON.stringify(profile, null, 2));
  } else {
    console.log("Could not get followers list.");
  }
}

test().catch(console.error).finally(() => process.exit(0));
