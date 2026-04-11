import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'fecha_envio';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * pageSize;

    // Mapeo de nombres de columna del frontend al backend
    const columnMap: Record<string, string> = {
      'id': 'id_notificacion',
      'detalle': 'detalle',
      'enviada': 'enviada',
      'fechaEnvio': 'fecha_envio',
    };

    const dbColumn = columnMap[sortBy] || 'fecha_envio';

    // Construcción del orderBy
    const orderBy: any = {};
    orderBy[dbColumn] = sortOrder;

    // Obtener notificaciones con paginación
    // Solo las de tipo "pago_vencido" (WhatsApp)
    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where: {
          tipo_notificacion: 'pago_vencido',
        },
        skip,
        take: pageSize,
        orderBy,
      }),
      prisma.notificacion.count({
        where: {
          tipo_notificacion: 'pago_vencido',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Transformar datos al formato esperado por el frontend
    const notificacionesTransformadas = notificaciones.map(n => ({
      id: n.id_notificacion,
      detalle: n.detalle,
      enviada: n.enviada ?? false,
      fechaEnvio: n.fecha_envio ?? n.fecha_generacion,
    }));

    return NextResponse.json({
      data: notificacionesTransformadas,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });

  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial de notificaciones' },
      { status: 500 }
    );
  }
}