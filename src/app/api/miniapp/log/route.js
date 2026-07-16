import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { followerId, action, metadata } = body;
    if (!followerId || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    await prisma.miniAppSession.create({
      data: {
        followerId: Number(followerId),
        action,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
