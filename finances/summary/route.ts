import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/finances/summary
 *
 * Returns an array of 12 objects representing the total ingresos and
 * egresos (debits) for each month of the current year. This endpoint
 * aggregates financial movements client‑side rather than using
 * complex SQL so that it works with SQLite during development and
 * PostgreSQL in production.  Each object has the shape
 * `{ month: number, ingresos: number, egresos: number }` where
 * `month` is 1‑based (January = 1).
 */
export async function GET() {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  // Fetch all movements for the current year
  const movements = await prisma.movimientoFinanciero.findMany({
    where: {
      fecha_movimiento: {
        gte: yearStart,
        lt: yearEnd,
      },
    },
    select: {
      tipo_movimiento: true,
      monto: true,
      fecha_movimiento: true,
    },
  });
  // Initialize summary for 12 months
  const summary = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    ingresos: 0,
    egresos: 0,
  }));
  movements.forEach((m) => {
    const date = new Date(m.fecha_movimiento);
    const monthIndex = date.getMonth();
    const amt = typeof m.monto === 'number' ? m.monto : Number(m.monto);
    if (m.tipo_movimiento?.toLowerCase() === 'ingreso') {
      summary[monthIndex].ingresos += amt;
    } else {
      summary[monthIndex].egresos += amt;
    }
  });
  return NextResponse.json(summary);
}