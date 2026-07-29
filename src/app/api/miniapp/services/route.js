import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isAdmin, canManageMiniApp } from "@/lib/roles";

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}



export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';

    const where = {};
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [categories, services] = await Promise.all([
      prisma.serviceCategory.findMany({
        where: {},
        orderBy: { order: 'asc' },
        select: { id: true, name: true, description: true, imageUrl: true, pdfUrl: true, priceImages: true, order: true, rawTable: true },
      }),
      prisma.servicePrice.findMany({
        where,
        orderBy: [{ categoryId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, price: true, unit: true, note: true, categoryId: true },
      }),
    ]);

    return NextResponse.json({
      categories,
      services: services.map(s => ({ ...s, price: s.price.toString() })),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
