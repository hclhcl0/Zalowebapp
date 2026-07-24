import { NextResponse } from "next/server";
import { getAccessToken, getZaloArticleStatus } from "@/lib/zalo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token"); // Zalo Article Token

    if (!token) {
      // Just test getslice with no token to see structure
      const access_token = await getAccessToken();
      const res = await fetch(
        `https://openapi.zalo.me/v2.0/article/getslice?data=${encodeURIComponent(JSON.stringify({ type: "normal" }))}`,
        { headers: { access_token } }
      );
      const data = await res.json();
      return NextResponse.json({ success: true, access_token: access_token.substring(0,10) + '...', data });
    }

    const data = await getZaloArticleStatus(token);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
