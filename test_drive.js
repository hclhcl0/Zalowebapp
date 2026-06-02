require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function loadDriveDocuments() {
  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: ["drive_folder_id", "google_api_key", "drive_refresh_token", "gmail_oauth_client_id", "gmail_oauth_client_secret"] } },
  });
  const folderId     = configs.find(c => c.key === "drive_folder_id")?.value;
  const apiKey       = configs.find(c => c.key === "google_api_key")?.value;
  const refreshToken = configs.find(c => c.key === "drive_refresh_token")?.value;
  const clientId     = configs.find(c => c.key === "gmail_oauth_client_id")?.value;
  const clientSecret = configs.find(c => c.key === "gmail_oauth_client_secret")?.value;

  console.log("folderId:", folderId);
  console.log("apiKey:", apiKey ? "Set" : "Not Set");
  console.log("refreshToken:", refreshToken ? "Set" : "Not Set");

  if (!folderId) { console.log("No folderId"); return []; }

  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const fields = encodeURIComponent("files(id,name,mimeType)");
  let headers = {};
  let url;

  if (apiKey) {
    console.log("Using apiKey mode");
    url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&key=${apiKey}`;
  } else if (refreshToken && clientId && clientSecret) {
    console.log("Using OAuth mode");
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("[Drive OAuth] Lỗi:", tokenData);
      return [];
    }
    url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100`;
    headers = { Authorization: `Bearer ${tokenData.access_token}` };
  } else {
    console.log("Not enough credentials");
    return [];
  }

  const res = await fetch(url, { headers });
  const json = await res.json();
  if (!res.ok || !json.files) {
    console.error("[Drive] Lỗi:", json);
    return [];
  }

  return json.files;
}

loadDriveDocuments().then(files => {
  console.log("Found files:", files);
}).catch(console.error).finally(() => prisma.$disconnect());
