import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/providers
 *
 * Returns a list of all suppliers (proveedores). Only active providers are
 * returned to populate dropdowns when creating products. This endpoint
 * exposes the provider id and name. Additional fields can be added as
 * needed.
 */
export async function GET() {
  const providers = await prisma.proveedor.findMany({
    where: { estado: 'activo' },
    select: {
      id_proveedor: true,
      nombre_proveedor: true,
    },
    orderBy: { nombre_proveedor: 'asc' },
  });
  return NextResponse.json(providers);
}
