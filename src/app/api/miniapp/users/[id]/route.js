import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  const user = await prisma.follower.findUnique({
    where: { id },
    include: {
      appointments: { orderBy: { createdAt: 'desc' }, take: 10 },
      testResults: { orderBy: { testedAt: 'desc' }, take: 10 },
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, action: true, metadata: true, createdAt: true },
      },
      _count: { select: { appointments: true, testResults: true, sessions: true } },
    },
  });

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: user });
}

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  const body = await req.json();
  const updated = await prisma.follower.update({
    where: { id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.userType !== undefined && { userType: body.userType }),
      ...(body.fullName !== undefined && { fullName: body.fullName }),
      ...(body.department !== undefined && { department: body.department }),
      ...(body.accessLevel !== undefined && { accessLevel: body.accessLevel }),
    },
  });
  return NextResponse.json({ success: true, data: updated });
}
