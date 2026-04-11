import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/returns
export async function GET() {
  const returns = await prisma.devolucion.findMany({
    include: {
      cliente: true,
      vendedor: true,
      pedido: true,
    },
    orderBy: { id_devolucion: 'desc' },
  });
  return NextResponse.json(returns);
}

// POST /api/returns
// Creates a new return with details. Body: { id_pedido, id_cliente, id_vendedor, motivo, detalles: [{ id_producto, cantidad_devuelta, motivo_producto? }] }
export async function POST(req: NextRequest) {
  const data = await req.json();
  const { id_pedido, id_cliente, id_vendedor, motivo, detalles } = data;
  if (!id_pedido || !id_cliente || !id_vendedor || !motivo) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  try {
    const returnRecord = await prisma.devolucion.create({
      data: {
        id_pedido,
        id_cliente,
        id_vendedor,
        motivo,
        detalles: {
          create: (detalles || []).map((d: any) => ({
            id_producto: d.id_producto,
            cantidad_devuelta: d.cantidad_devuelta,
            motivo_producto: d.motivo_producto ?? null,
          })),
        },
        id_usuario_creacion: id_vendedor,
      },
      include: { detalles: true },
    });
    return NextResponse.json(returnRecord, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error al crear devolución' }, { status: 500 });
  }
}