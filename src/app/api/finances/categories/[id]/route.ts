import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper to parse id from params
function parseId(id: string | string[] | undefined): number | null {
  if (!id) return null;
  const parsed = Array.isArray(id) ? id[0] : id;
  const num = parseInt(parsed, 10);
  return isNaN(num) ? null : num;
}

// GET /api/finances/categories/[id]
// Returns a single category by id.
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const id = parseId(context.params.id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const category = await prisma.categoriaFinanciera.findUnique({
    where: { id_categoria_financiera: id },
  });
  if (!category) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  }
  return NextResponse.json(category);
}

// PUT /api/finances/categories/[id]
// Updates a financial category.  Body: { nombre_categoria?, tipo_categoria?, descripcion? }
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const id = parseId(context.params.id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const data = await req.json();
  const { nombre_categoria, tipo_categoria, descripcion } = data;
  if (tipo_categoria && !['ingreso', 'egreso'].includes(tipo_categoria)) {
    return NextResponse.json(
      { error: 'Tipo de categoría no válido' },
      { status: 400 },
    );
  }
  try {
    const updated = await prisma.categoriaFinanciera.update({
      where: { id_categoria_financiera: id },
      data: {
        nombre_categoria: nombre_categoria ?? undefined,
        tipo_categoria: tipo_categoria ?? undefined,
        descripcion: descripcion ?? undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre' },
        { status: 409 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: 'Error al actualizar la categoría' },
      { status: 500 },
    );
  }
}

// DELETE /api/finances/categories/[id]
// Deletes a category if no movements reference it.  Otherwise returns 409.
export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const id = parseId(context.params.id);
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  // Check if there are movements referencing this category
  const count = await prisma.movimientoFinanciero.count({
    where: { id_categoria_financiera: id },
  });
  if (count > 0) {
    return NextResponse.json(
      { error: 'No se puede eliminar una categoría con registros asociados' },
      { status: 409 },
    );
  }
  await prisma.categoriaFinanciera.delete({
    where: { id_categoria_financiera: id },
  });
  return NextResponse.json({ message: 'Categoría eliminada' });
}
