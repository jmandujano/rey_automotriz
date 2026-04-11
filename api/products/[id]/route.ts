// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helpers para serializar Decimals/BigInt
function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(
      obj,
      (_, v) => {
        // Prisma Decimal -> number
        if (v && typeof v === 'object' && typeof v.toFixed === 'function') {
          return Number(v);
        }
        // BigInt -> number (si usas BigInt IDs, cámbialo a string si prefieres)
        if (typeof v === 'bigint') return Number(v);
        return v;
      }
    )
  );
}

/**
 * GET /api/products/[id]
 * Next.js 15+: params es Promise; hay que await
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const idNum = Number(id);
    if (Number.isNaN(idNum)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // ⚠️ Ajusta el nombre del modelo a tu "model" Prisma real:
    // Si tu schema tiene `model Producto { @@map("productos") ... }`, usa prisma.producto
    const product = await prisma.producto.findUnique({
      where: { id_producto: idNum },
      include: {
        // Ajusta nombres de relaciones segun tu schema:
        // - si tu relación es `categoria` o `categorias_producto`, cámbialo aquí
        // - la UI no lo necesita completo para pintar, pero no estorba
        categoria: true,

        // Importaciones + proveedor para mostrar nombre
		//importaciones: true,
        importaciones: {
          include: {
            proveedor: true, // relación al proveedor (ajusta si tu nombre difiere)
          },
          orderBy: { fecha_importacion: 'desc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(toPlain(product), { status: 200 });
  } catch (err: any) {
    console.error('Error en GET /api/products/[id]:', err);
    return NextResponse.json(
      { error: 'Error al obtener el producto', details: err.message },
      { status: 500 }
    );
  }
}


/**
 * PUT /api/products/[id]
 * Actualiza un producto y su importación activa
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const idNum = Number(id);

    if (Number.isNaN(idNum)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();
    const {
      codigo_producto,
      descripcion,
      id_categoria,
      estado,
      id_importacion_activa,
      importacion,
    } = body;

    // Validaciones
    if (!codigo_producto || !descripcion || !id_categoria) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios del producto' },
        { status: 400 }
      );
    }

    if (!id_importacion_activa || !importacion) {
      return NextResponse.json(
        { error: 'Faltan datos de importación' },
        { status: 400 }
      );
    }

    // Transacción para actualizar producto e importación
    const result = await prisma.$transaction(async (tx) => {
      // 1) Actualizar datos básicos del producto
      await tx.producto.update({
        where: { id_producto: idNum },
        data: {
          descripcion,
          id_categoria: Number(id_categoria),
          estado,
        },
      });

      // 2) Actualizar la importación activa
      await tx.productoImportacion.update({
        where: { id_importacion: Number(id_importacion_activa) },
        data: {
          id_proveedor: Number(importacion.id_proveedor),
          fecha_importacion: new Date(importacion.fecha_importacion),
          cantidad: Number(importacion.cantidad),
          precio_compra: Number(importacion.precio_compra),
          margen_a: Number(importacion.margen_a),
          comision_a: Number(importacion.comision_a),
          margen_b: importacion.margen_b != null ? Number(importacion.margen_b) : null,
          comision_b: importacion.comision_b != null ? Number(importacion.comision_b) : null,
          margen_c: importacion.margen_c != null ? Number(importacion.margen_c) : null,
          comision_c: importacion.comision_c != null ? Number(importacion.comision_c) : null,
          margen_d: importacion.margen_d != null ? Number(importacion.margen_d) : null,
          comision_d: importacion.comision_d != null ? Number(importacion.comision_d) : null,
          precio_venta_a: Number(importacion.precio_venta_a),
          precio_venta_comision_a: Number(importacion.precio_venta_comision_a),
          precio_venta_b: importacion.precio_venta_b != null 
            ? Number(importacion.precio_venta_b) 
            : null,
          precio_venta_comision_b: importacion.precio_venta_comision_b != null 
            ? Number(importacion.precio_venta_comision_b) 
            : null,
          precio_venta_c: importacion.precio_venta_c != null 
            ? Number(importacion.precio_venta_c) 
            : null,
          precio_venta_comision_c: importacion.precio_venta_comision_c != null 
            ? Number(importacion.precio_venta_comision_c) 
            : null,
          precio_venta_d: importacion.precio_venta_d != null 
            ? Number(importacion.precio_venta_d) 
            : null,
          precio_venta_comision_d: importacion.precio_venta_comision_d != null 
            ? Number(importacion.precio_venta_comision_d) 
            : null,
        },
      });

      // 3) Retornar el producto actualizado con todas sus relaciones
      return await tx.producto.findUnique({
        where: { id_producto: idNum },
        include: {
          categoria: true,
          importaciones: {
            include: { proveedor: true },
            orderBy: { fecha_importacion: 'desc' },
          },
        },
      });
    });

    return NextResponse.json(toPlain(result));
  } catch (err: any) {
    console.error('Error en PUT /api/products/[id]:', err);
    return NextResponse.json(
      { error: 'Error al actualizar el producto', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Elimina un producto (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const idNum = Number(id);

    if (Number.isNaN(idNum)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Soft delete: cambiar estado a 'inactivo'
    await prisma.producto.update({
      where: { id_producto: idNum },
      data: { estado: 'inactivo' },
    });

    return NextResponse.json({ message: 'Producto eliminado exitosamente' });
  } catch (err: any) {
    console.error('Error en DELETE /api/products/[id]:', err);
    return NextResponse.json(
      { error: 'Error al eliminar el producto' },
      { status: 500 }
    );
  }
}