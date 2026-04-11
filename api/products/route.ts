import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper para serializar Decimals/BigInt
function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(
      obj,
      (_, v) => {
        // Prisma Decimal -> number
        if (v && typeof v === 'object' && typeof v.toFixed === 'function') {
          return Number(v);
        }
        // BigInt -> number
        if (typeof v === 'bigint') return Number(v);
        return v;
      }
    )
  );
}

/**
 * GET /api/products
 * 
 * Query params:
 * - include: string (opcional) - puede ser "importaciones" para incluir datos de importaciones
 * 
 * Retorna lista de productos con la importación activa transformada a importacionActiva.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const include = searchParams.get('include');

    // Siempre incluir importaciones activas para mostrar precios en la tabla
    const products = await prisma.producto.findMany({
      where: {
        estado: 'activo'
      },
      include: {
        categoria: {
          select: {
            id_categoria: true,
            nombre_categoria: true
          }
        },
        importaciones: {
          where: {
            estado_importacion: 'activa'
          },
          orderBy: {
            fecha_importacion: 'desc'
          },
          take: 1,
          select: {
            id_importacion: true,
            id_producto: true,
            precio_compra: true,
            precio_venta_a: true,
            precio_venta_b: true,
            precio_venta_c: true,
            precio_venta_d: true,
            precio_venta_comision_a: true,
            precio_venta_comision_b: true,
            precio_venta_comision_c: true,
            precio_venta_comision_d: true,
            margen_a: true,
            margen_b: true,
            margen_c: true,
            margen_d: true,
            comision_a: true,
            comision_b: true,
            comision_c: true,
            comision_d: true,
            estado_importacion: true,
            fecha_importacion: true,
            cantidad: true
          }
        }
      },
      orderBy: [
        { codigo_producto: 'asc' }
      ]
    });

    // Transformar la respuesta para aplanar la estructura
    // Convertir importaciones[] a importacionActiva (primer elemento o null)
    const transformedProducts = products.map((product) => ({
      ...product,
      importacionActiva: product.importaciones[0] || null,
      importaciones: include === 'importaciones' ? product.importaciones : undefined,
    }));

    return NextResponse.json(toPlain(transformedProducts));
  } catch (err: any) {
    console.error('Error obteniendo productos:', err);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 *
 * Crea un nuevo producto con múltiples importaciones
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      codigo_producto,
      descripcion,
      id_categoria,
      estado = 'activo',
      stock = 0,
      advertencia_stock = 0,
      alerta_stock = 0,
      // Array de importaciones
      importaciones = [],
      // Campos de la primera importación (compatibilidad)
      id_proveedor,
      precio_compra,
      cantidad,
      fecha_importacion,
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
    } = data;

    // Validaciones básicas
    if (!codigo_producto || !descripcion || !id_categoria) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Usar prisma.producto (singular) según tu schema
    const existing = await prisma.producto.findUnique({
      where: { codigo_producto },
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'El código de producto ya existe' },
        { status: 409 }
      );
    }

    // Determinar qué datos de importación usar
    let importacionesData = [];
    
    if (importaciones && importaciones.length > 0) {
      // Si viene array de importaciones (desde nuevo producto)
      importacionesData = importaciones;
    } else if (id_proveedor && precio_compra !== undefined) {
      // Si vienen campos individuales (compatibilidad con versión anterior)
      importacionesData = [{
        id_proveedor,
        fecha_importacion,
        cantidad: cantidad || 0,
        precio_compra,
        margen_a: margen_a || 0,
        comision_a: comision_a || 0,
        margen_b: margen_b || 0,
        comision_b: comision_b || 0,
        margen_c: margen_c || 0,
        comision_c: comision_c || 0,
        margen_d: margen_d || 0,
        comision_d: comision_d || 0,
        precio_venta_a: precio_venta_a || 0,
        precio_venta_comision_a: precio_venta_comision_a || 0,
        precio_venta_b: precio_venta_b || 0,
        precio_venta_comision_b: precio_venta_comision_b || 0,
        precio_venta_c: precio_venta_c || 0,
        precio_venta_comision_c: precio_venta_comision_c || 0,
        precio_venta_d: precio_venta_d || 0,
        precio_venta_comision_d: precio_venta_comision_d || 0,
        estado_importacion: 'activa',
      }];
    }

    // Validar que tenga al menos una importación
    if (importacionesData.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos una importación' },
        { status: 400 }
      );
    }

    // Transacción: crear producto + importaciones
    const result = await prisma.$transaction(async (tx) => {
      // 1) Crear producto
      const product = await tx.producto.create({
        data: {
          codigo_producto,
          descripcion,
          id_categoria: Number(id_categoria),
          estado,
          stock: Number(stock) || 0,
          advertencia_stock: Number(advertencia_stock) || 0,
          alerta_stock: Number(alerta_stock) || 0,
        },
      });

      // 2) Crear todas las importaciones
      for (const imp of importacionesData) {
        await tx.productoImportacion.create({
          data: {
            id_producto: product.id_producto,
            id_proveedor: Number(imp.id_proveedor),
            fecha_importacion: imp.fecha_importacion 
              ? new Date(imp.fecha_importacion) 
              : new Date(),
            cantidad: Number(imp.cantidad) || 0,
            precio_compra: Number(imp.precio_compra),
            margen_a: Number(imp.margen_a) || 0,
            comision_a: Number(imp.comision_a) || 0,
            margen_b: imp.margen_b != null ? Number(imp.margen_b) : null,
            comision_b: imp.comision_b != null ? Number(imp.comision_b) : null,
            margen_c: imp.margen_c != null ? Number(imp.margen_c) : null,
            comision_c: imp.comision_c != null ? Number(imp.comision_c) : null,
            margen_d: imp.margen_d != null ? Number(imp.margen_d) : null,
            comision_d: imp.comision_d != null ? Number(imp.comision_d) : null,
            precio_venta_a: Number(imp.precio_venta_a) || 0,
            precio_venta_comision_a: Number(imp.precio_venta_comision_a) || 0,
            precio_venta_b: imp.precio_venta_b != null ? Number(imp.precio_venta_b) : null,
            precio_venta_comision_b: imp.precio_venta_comision_b != null 
              ? Number(imp.precio_venta_comision_b) 
              : null,
            precio_venta_c: imp.precio_venta_c != null ? Number(imp.precio_venta_c) : null,
            precio_venta_comision_c: imp.precio_venta_comision_c != null 
              ? Number(imp.precio_venta_comision_c) 
              : null,
            precio_venta_d: imp.precio_venta_d != null ? Number(imp.precio_venta_d) : null,
            precio_venta_comision_d: imp.precio_venta_comision_d != null 
              ? Number(imp.precio_venta_comision_d) 
              : null,
            estado_importacion: imp.estado_importacion || 'inactiva',
          },
        });
      }

      // 3) Retornar producto con relaciones
      return await tx.producto.findUnique({
        where: { id_producto: product.id_producto },
        include: {
          categoria: true,
          importaciones: {
            include: { proveedor: true },
            orderBy: { fecha_importacion: 'desc' },
          },
        },
      });
    });

    return NextResponse.json(toPlain(result), { status: 201 });
  } catch (err: any) {
    console.error('Error en POST /api/products:', err);
    
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear producto', details: err.message },
      { status: 500 }
    );
  }
}