import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/reports/top-clients
//
// Returns the top 5 clients by total sales amount. Each element in the
// returned array includes the client ID, the client name (razón
// social) and the aggregated sum of the order totals. Decimal
// values from the database are converted to standard numbers.
export async function GET() {
  // Group orders by client and compute the total sales for each client.
  const grouped = await prisma.pedido.groupBy({
    by: ['id_cliente'],
    _sum: { total: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 5,
  });

  // Resolve client names for the top clients.
  const results = await Promise.all(
    grouped.map(async (g) => {
      const cliente = await prisma.cliente.findUnique({
        where: { id_cliente: g.id_cliente },
        select: { razon_social: true },
      });
      return {
        id_cliente: g.id_cliente,
        nombre_cliente: cliente?.razon_social ?? '',
        monto_total: g._sum.total ? Number(g._sum.total) : 0,
      };
    })
  );

  return NextResponse.json(results);
}