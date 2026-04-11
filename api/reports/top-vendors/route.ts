import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/reports/top-vendors
// Returns the top 5 vendedores by total ventas (sum of order totals).
// Each item in the returned array includes the vendor ID, name and
// total sales amount. Decimal values are converted to regular
// JavaScript numbers for ease of use on the client.
export async function GET() {
  // Group orders by vendor and compute total sales for each vendor.
  const grouped = await prisma.pedido.groupBy({
    by: ['id_vendedor'],
    _sum: { total: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 5,
  });

  // Fetch vendor names for the top sellers
  const results = await Promise.all(
    grouped.map(async (g) => {
      const vendedor = await prisma.usuario.findUnique({
        where: { id_usuario: g.id_vendedor },
        select: { nombre_completo: true },
      });
      return {
        id_vendedor: g.id_vendedor,
        nombre_vendedor: vendedor?.nombre_completo ?? '',
        monto_total: g._sum.total ? Number(g._sum.total) : 0,
      };
    })
  );

  return NextResponse.json(results);
}