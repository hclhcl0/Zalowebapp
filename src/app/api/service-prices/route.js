import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = { isActive: true };
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [services, total] = await Promise.all([
      prisma.servicePrice.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: [{ categoryId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.servicePrice.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: services.map(s => ({ ...s, price: s.price.toString() })),
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const service = await prisma.servicePrice.create({
      data: {
        name: body.name,
        price: BigInt(body.price),
        unit: body.unit || 'lần',
        note: body.note || null,
        categoryId: parseInt(body.categoryId),
        order: body.order ?? 0,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, data: { ...service, price: service.price.toString() } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
