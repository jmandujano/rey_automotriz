import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/reports/summary
// Returns a simple summary for the dashboard including counts and totals.
export async function GET() {
  const [productsCount, usersCount, ordersCount, returnsCount, ingresos, egresos] = await Promise.all([
    prisma.producto.count(),
    prisma.usuario.count(),
    prisma.pedido.count(),
    prisma.devolucion.count(),
    prisma.movimientoFinanciero.aggregate({
      _sum: { monto: true },
      where: { tipo_movimiento: 'ingreso' },
    }),
    prisma.movimientoFinanciero.aggregate({
      _sum: { monto: true },
      where: { tipo_movimiento: 'egreso' },
    }),
  ]);
  return NextResponse.json({
    productsCount,
    usersCount,
    ordersCount,
    returnsCount,
    totalIngresos: ingresos._sum.monto ?? 0,
    totalEgresos: egresos._sum.monto ?? 0,
  });
}