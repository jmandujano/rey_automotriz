// src/app/api/products/[id]/importaciones/[importId]/route.ts
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
 * DELETE /api/products/[id]/importaciones/[importId]
 * Elimina una importación y actualiza el stock
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; importId: string }> }
) {
  try {
    const { id, importId } = await context.params;
    const idNum = Number(id);
    const importIdNum = Number(importId);
    
    if (Number.isNaN(idNum) || Number.isNaN(importIdNum)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Transacción: validar + eliminar + actualizar stock
    const result = await prisma.$transaction(async (tx) => {
      // 1) Obtener producto y todas sus importaciones
      const producto = await tx.producto.findUnique({
        where: { id_producto: idNum },
        include: {
          importaciones: true,
        },
      });

      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      // 2) Validar que no sea la última importación
      if (producto.importaciones.length <= 1) {
        throw new Error('No se puede eliminar la última importación. Debe haber al menos una importación.');
      }

      // 3) Buscar la importación a eliminar
      const importacionAEliminar = producto.importaciones.find(
        (imp) => imp.id_importacion === importIdNum
      );

      if (!importacionAEliminar) {
        throw new Error('Importación no encontrada');
      }

      // 4) Validar que no sea la importación activa
      if (importacionAEliminar.estado_importacion === 'activa') {
        throw new Error('No se puede eliminar la importación activa. Por favor, active otra importación primero.');
      }

      // 5) Eliminar la importación
      await tx.productoImportacion.delete({
        where: { id_importacion: importIdNum },
      });

      // 6) Actualizar stock del producto: stock_actual - cantidad
      const cantidadARestar = Number(importacionAEliminar.cantidad) || 0;
      const nuevoStock = Math.max(0, producto.stock - cantidadARestar); // No permitir stock negativo
      
      await tx.producto.update({
        where: { id_producto: idNum },
        data: {
          stock: nuevoStock,
        },
      });

      // 7) Retornar producto actualizado
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

    return NextResponse.json(toPlain(result), { status: 200 });
    
  } catch (err: any) {
    console.error('Error en DELETE /api/products/[id]/importaciones/[importId]:', err);
    
    // Errores de validación de negocio
    if (err.message.includes('última importación') || 
        err.message.includes('importación activa') ||
        err.message.includes('no encontrad')) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al eliminar la importación', details: err.message },
      { status: 500 }
    );
  }
}