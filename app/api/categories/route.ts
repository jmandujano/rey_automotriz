import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/categories
export async function GET() {
  const categories = await prisma.categoriaProducto.findMany({
    where: {
      id_categoria_padre: null,
    },
    include: {
      subcategorias: true,
    },
    orderBy: { nombre_categoria: 'asc' },
  });
  return NextResponse.json(categories);
}

// POST /api/categories
export async function POST(req: NextRequest) {
  const data = await req.json();
  const { nombre_categoria, id_categoria_padre, porcentaje_alerta_stock, descripcion } = data;
  if (!nombre_categoria) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }
  try {
    const category = await prisma.categoriaProducto.create({
      data: {
        nombre_categoria,
        id_categoria_padre: id_categoria_padre ?? null,
        porcentaje_alerta_stock: porcentaje_alerta_stock ?? 10,
        descripcion,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'La categoría ya existe' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}