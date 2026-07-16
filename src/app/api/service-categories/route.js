import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  try {
    const cats = await prisma.serviceCategory.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { services: true } } },
    });
    return NextResponse.json({ success: true, data: cats });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const cat = await prisma.serviceCategory.create({
      data: {
        name: body.name,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        order: body.order ?? 0,
      },
    });
    return NextResponse.json({ success: true, data: cat });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
