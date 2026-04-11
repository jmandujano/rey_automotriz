// src/app/api/products/[id]/importaciones/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper para serializar Decimals
function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => {
      if (v && typeof v === 'object' && typeof v.toFixed === 'function') {
        return Number(v);
      }
      if (typeof v === 'bigint') return Number(v);
      return v;
    })
  );
}

/**
 * POST /api/products/[id]/importaciones
 * Crea una nueva importación para el producto
 * Actualiza el stock del producto sumando la cantidad
 */
export async function POST(
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
      id_proveedor,
      fecha_importacion,
      cantidad,
      precio_compra,
      margen_a,
      comision_a,
      margen_b,
      comision_b,
      margen_c,
      comision_c,
      margen_d,
      comision_d,
      precio_venta_a,
      precio_venta_comision_a,
      precio_venta_b,
      precio_venta_comision_b,
      precio_venta_c,
      precio_venta_comision_c,
      precio_venta_d,
      precio_venta_comision_d,
    } = body;

    // Validaciones
    if (!id_proveedor || !fecha_importacion || cantidad === undefined || !precio_compra) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }

    // Transacción: crear importación + actualizar stock
    const result = await prisma.$transaction(async (tx) => {
      // 1) Obtener producto actual
      const producto = await tx.producto.findUnique({
        where: { id_producto: idNum },
      });

      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      // 2) Desactivar todas las importaciones existentes
      await tx.productoImportacion.updateMany({
        where: { id_producto: idNum },
        data: { estado_importacion: 'inactiva' },
      });

      // 3) Crear nueva importación como activa
      const nuevaImportacion = await tx.productoImportacion.create({
        data: {
          id_producto: idNum,
          id_proveedor: Number(id_proveedor),
          fecha_importacion: new Date(fecha_importacion),
          cantidad: Number(cantidad),
          precio_compra: Number(precio_compra),
          margen_a: Number(margen_a),
          comision_a: Number(comision_a),
          margen_b: margen_b != null ? Number(margen_b) : null,
          comision_b: comision_b != null ? Number(comision_b) : null,
          margen_c: margen_c != null ? Number(margen_c) : null,
          comision_c: comision_c != null ? Number(comision_c) : null,
          margen_d: margen_d != null ? Number(margen_d) : null,
          comision_d: comision_d != null ? Number(comision_d) : null,
          precio_venta_a: Number(precio_venta_a),
          precio_venta_comision_a: Number(precio_venta_comision_a),
          precio_venta_b: precio_venta_b != null ? Number(precio_venta_b) : null,
          precio_venta_comision_b: precio_venta_comision_b != null ? Number(precio_venta_comision_b) : null,
          precio_venta_c: precio_venta_c != null ? Number(precio_venta_c) : null,
          precio_venta_comision_c: precio_venta_comision_c != null ? Number(precio_venta_comision_c) : null,
          precio_venta_d: precio_venta_d != null ? Number(precio_venta_d) : null,
          precio_venta_comision_d: precio_venta_comision_d != null ? Number(precio_venta_comision_d) : null,
          estado_importacion: 'activa',
        },
      });

      // 4) Actualizar stock del producto: stock_actual + cantidad
      const nuevoStock = producto.stock + Number(cantidad);
      
      await tx.producto.update({
        where: { id_producto: idNum },
        data: {
          stock: nuevoStock,
        },
      });

      // 5) Retornar producto actualizado con todas sus relaciones
      const productoActualizado = await tx.producto.findUnique({
        where: { id_producto: idNum },
        include: {
          categoria: true,
          importaciones: {
            include: { proveedor: true },
            orderBy: { fecha_importacion: 'desc' },
          },
        },
      });

      return productoActualizado;
    });

    return NextResponse.json(toPlain(result), { status: 201 });
    
  } catch (err: any) {
    console.error('Error en POST /api/products/[id]/importaciones:', err);
    
    return NextResponse.json(
      { error: 'Error al crear la importación', details: err.message },
      { status: 500 }
    );
  }
}