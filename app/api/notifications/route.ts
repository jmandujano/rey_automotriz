import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper to convert Prisma Decimal and BigInt to plain JS numbers
function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => {
      if (v && typeof v === 'object' && typeof (v as any).toFixed === 'function') {
        return Number(v);
      }
      if (typeof v === 'bigint') return Number(v);
      return v;
    }),
  );
}

/**
 * GET /api/configuracion
 *
 * Obtiene la configuración actual del sistema desde la tabla notificaciones
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Obtener el primer registro de notificaciones con los valores de configuración
    const notificacion = await prisma.notificacion.findFirst({
      where: {
        OR: [
          { advertencia_stock: { not: null } },
          { alerta_stock: { not: null } },
          { alerta_pagos_vencidos: { not: null } },
        ],
      },
      select: {
        advertencia_stock: true,
        alerta_stock: true,
        alerta_pagos_vencidos: true,
        habilitar_notificacion_clientes: true,
      },
    });

    const configuracion = {
      advertenciaStock: notificacion?.advertencia_stock ?? 20,
      alertaStock: notificacion?.alerta_stock ?? 10,
      alertaPagosVencidos: notificacion?.alerta_pagos_vencidos ?? 3,
      habilitarNotificacionClientes: notificacion?.habilitar_notificacion_clientes ?? true,
    };

    return NextResponse.json(toPlain(configuracion));
  } catch (err: any) {
    console.error('Error en GET /api/configuracion:', err);
    return NextResponse.json(
      { error: 'Error al obtener la configuración', details: err.message },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/configuracion
 *
 * Actualiza la configuración del sistema en la tabla notificaciones
 * y sincroniza los valores con la tabla productos
 */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const {
      advertenciaStock,
      alertaStock,
      alertaPagosVencidos,
      habilitarNotificacionClientes,
    } = data;

    // Validaciones
    if (
      advertenciaStock === undefined ||
      alertaStock === undefined ||
      alertaPagosVencidos === undefined ||
      habilitarNotificacionClientes === undefined
    ) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 },
      );
    }

    if (advertenciaStock < 0 || alertaStock < 0 || alertaPagosVencidos < 0) {
      return NextResponse.json(
        { error: 'Los valores no pueden ser negativos' },
        { status: 400 },
      );
    }

    if (advertenciaStock <= alertaStock) {
      return NextResponse.json(
        { error: 'El umbral de advertencia debe ser mayor que el umbral de alerta' },
        { status: 400 },
      );
    }

    // Ejecutar transacción para actualizar ambas tablas
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar todos los registros de notificaciones
      await tx.notificacion.updateMany({
        data: {
          advertencia_stock: Number(advertenciaStock),
          alerta_stock: Number(alertaStock),
          alerta_pagos_vencidos: Number(alertaPagosVencidos),
          habilitar_notificacion_clientes: Boolean(habilitarNotificacionClientes),
        },
      });

      // 2. Actualizar todos los productos con los nuevos umbrales de stock
      await tx.producto.updateMany({
        data: {
          advertencia_stock: Number(advertenciaStock),
          alerta_stock: Number(alertaStock),
        },
      });
    });

    return NextResponse.json({
      message: 'Configuración actualizada exitosamente',
    });
  } catch (err: any) {
    console.error('Error en PUT /api/configuracion:', err);
    return NextResponse.json(
      { error: 'Error al actualizar la configuración', details: err.message },
      { status: 500 },
    );
  }
}