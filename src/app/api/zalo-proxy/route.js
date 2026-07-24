import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const payload = await req.json();
    const tokenRecord = await prisma.systemConfig.findUnique({ where: { key: 'zalo_access_token'} });
    const token = tokenRecord?.value;
    
    if (!token) return NextResponse.json({ error: "no token" });

    const res = await fetch('https://openapi.zalo.me/v2.0/article/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': token
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    return NextResponse.json({ request: payload, response: data });
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
