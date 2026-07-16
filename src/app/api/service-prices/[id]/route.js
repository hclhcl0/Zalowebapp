import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const { id } = await params;
    const service = await prisma.servicePrice.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        price: BigInt(body.price),
        unit: body.unit || 'lần',
        note: body.note || null,
        categoryId: parseInt(body.categoryId),
        order: body.order ?? 0,
        isActive: body.isActive ?? true,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ success: true, data: { ...service, price: service.price.toString() } });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.servicePrice.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
