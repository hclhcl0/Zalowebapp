import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const userType = searchParams.get('userType') || '';

  const where = {
    AND: [
      q ? {
        OR: [
          { displayName: { contains: q } },
          { zaloUserId: { contains: q } },
          { fullName: { contains: q } },
          { phone: { contains: q } },
        ]
      } : {},
      userType ? { userType } : {},
    ]
  };

  const [total, users] = await Promise.all([
    prisma.follower.count({ where }),
    prisma.follower.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { appointments: true, testResults: true, sessions: true } },
      },
    }),
  ]);

  return NextResponse.json({ success: true, data: { users, total, page, limit } });
}
