import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/returns/[id]
export async function GET(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const id = Number(context.params.id);
  const ret = await prisma.devolucion.findUnique({
    where: { id_devolucion: id },
    include: {
      cliente: true,
      pedido: true,
      vendedor: true,
      detalles: { include: { producto: true } },
      evidencias: true,
      historial: true,
    },
  });
  if (!ret) {
    return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 });
  }
  return NextResponse.json(ret);
}

// PUT /api/returns/[id]
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const id = Number(context.params.id);
  const data = await req.json();
  try {
    const devolucion = await prisma.devolucion.update({
      where: { id_devolucion: id },
      data,
    });
    return NextResponse.json(devolucion);
  } catch (err) {
    return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 });
  }
}

// DELETE /api/returns/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const id = Number(context.params.id);
  try {
    await prisma.devolucion.delete({ where: { id_devolucion: id } });
    return NextResponse.json({ message: 'Devolución eliminada' });
  } catch (err) {
    return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 });
  }
}