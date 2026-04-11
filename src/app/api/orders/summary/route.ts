import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/orders/summary
//
// Returns an array of 12 objects representing the number of orders
// created per month in the current calendar year. Each object
// contains a `month` (1-12) and the corresponding `orders` count.
// Months without any orders return a count of zero to ensure
// consistent chart lengths. The date range is limited to the
// current year using JavaScript's Date API. Raw SQL is used to
// leverage PostgreSQL's date extraction functions.
export async function GET() {
  // Determine the start and end boundaries for the current year.  The
  // start is January 1st of the current year and the end is
  // January 1st of the following year.
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

  // Query the database for the count of orders per month.  We
  // extract the month number (1-12) from the `fecha_creacion`
  // column and group by it.  The `count(*)` is cast to integer
  // because Prisma returns BigInt by default when counting rows in
  // a raw query.
  const rows: { month: number; count: number }[] = await prisma.$queryRaw`
    SELECT EXTRACT(MONTH FROM "fecha_creacion")::int AS month,
           COUNT(*)::int AS count
    FROM "pedidos"
    WHERE "fecha_creacion" >= ${startOfYear} AND "fecha_creacion" < ${startOfNextYear}
    GROUP BY month
    ORDER BY month;
  `;

  // Initialise an array of 12 zero counts.  We'll fill in the
  // positions returned from the query and leave the rest as 0.
  const monthlyCounts: number[] = Array(12).fill(0);
  rows.forEach(({ month, count }) => {
    // Convert month (1-12) to zero‑based index
    const idx = month - 1;
    monthlyCounts[idx] = count;
  });

  // Build the response objects, mapping each index back to a
  // 1‑based month number.
  const result = monthlyCounts.map((orders, index) => ({ month: index + 1, orders }));

  return NextResponse.json(result);
}