import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const tokenRecord = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token'} });
  const token = tokenRecord?.value;
  
  if (!token) return NextResponse.json({ error: "no token" });

  const testCover = async (cover) => {
    const articlePayload = {
      type: 'normal',
      title: 'Test Zalo Article Cover ' + Date.now(),
      description: 'Kiem tra tao bai viet Zalo OA',
      author: 'CDC Da Nang',
      body: [{ type: 'text', content: '<p>Test</p>' }],
      cover: cover,
      status: 'hide'
    };
    const r = await fetch('https://openapi.zalo.me/v2.0/article/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', access_token: token },
      body: JSON.stringify(articlePayload)
    });
    const d = await r.json();
    return { cover, result: d };
  };

  const results = [];
  results.push(await testCover({ cover_type: 0, photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' }));
  results.push(await testCover({ cover_type: 1, photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' }));
  results.push(await testCover({ cover_type: 0, cover_view: 'show', photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' }));
  results.push(await testCover({ cover_type: 1, cover_view: 'show', photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' }));
  results.push(await testCover({ photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' }));
  results.push(await testCover({ cover_type: 'photo', photo_url: 'https://zcdc.ksbtdanang.vn/cdc-logo.png', status: 'show' }));

  return NextResponse.json(results);
}
