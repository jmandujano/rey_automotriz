import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Utility to parse id param
function parseId(id: string | string[] | undefined): number | null {
  if (!id) return null;
  const parsed = Array.isArray(id) ? id[0] : id;
  const num = parseInt(parsed, 10);
  return isNaN(num) ? null : num;
}

// GET /api/finances/[id]
// Returns a specific financial movement with category and user info.
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const id = parseId(context.params.id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const movement = await prisma.movimientoFinanciero.findUnique({
    where: { id_movimiento: id },
    include: {
      categoria: true,
      usuario: { select: { id_usuario: true, nombre_completo: true } },
      movimientoPedidos: true,
    },
  });
  if (!movement) {
    return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
  }
  return NextResponse.json(movement);
}

// PUT /api/finances/[id]
// Updates a financial movement.  Body can include any fields used on POST.
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const id = parseId(context.params.id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const data = await req.json();
  const {
    tipo_movimiento,
    id_categoria_financiera,
    razon,
    monto,
    fecha_movimiento,
    numero_comprobante,
    numero_operacion_bancaria,
    descripcion,
    id_usuario_registro,
    estado_computo,
  } = data;
  try {
    const updated = await prisma.movimientoFinanciero.update({
      where: { id_movimiento: id },
      data: {
        tipo_movimiento: tipo_movimiento ?? undefined,
        id_categoria_financiera: id_categoria_financiera ?? undefined,
        razon: razon ?? undefined,
        monto: monto ?? undefined,
        fecha_movimiento: fecha_movimiento ? new Date(fecha_movimiento) : undefined,
        numero_comprobante: numero_comprobante ?? undefined,
        numero_operacion_bancaria: numero_operacion_bancaria ?? undefined,
        descripcion: descripcion ?? undefined,
        id_usuario_registro: id_usuario_registro ?? undefined,
        estado_computo: estado_computo ?? undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Error al actualizar el movimiento financiero' },
      { status: 500 },
    );
  }
}

// DELETE /api/finances/[id]
// Instead of deleting the record, mark it as no computado according to FRD
// requisito 5.7【250385542692500†L1162-L1165】.
export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const id = parseId(context.params.id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  try {
    const updated = await prisma.movimientoFinanciero.update({
      where: { id_movimiento: id },
      data: {
        estado_computo: 'no_computado',
      },
    });
    return NextResponse.json({ message: 'Movimiento marcado como no computado', updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Error al eliminar el movimiento financiero' },
      { status: 500 },
    );
  }
}
