import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * API endpoints for the notifications module.  A notification represents an event
 * (e.g. stock alert, payment reminder, return) and may be sent to one or more
 * users.  Each user has a separate record in `notificacion_usuarios` to track
 * read/unread state.  This API supports listing all notifications (admin), and
 * creating new notifications with recipients.  See FRD módulo 7【250385542692500†L1356-L1405】.
 */

// GET /api/notifications
// List all notifications with counts of associated users.
export async function GET() {
  const notifications = await prisma.notificacion.findMany({
    include: {
      usuarios: {
        select: {
          id_usuario: true,
          leida: true,
        },
      },
    },
    orderBy: { id_notificacion: 'desc' },
  });
  return NextResponse.json(notifications);
}

// POST /api/notifications
// Creates a new notification and associates it with a list of user IDs.
// Body: { tipo_notificacion: string, detalle: string, usuarios: number[] }
export async function POST(req: NextRequest) {
  const data = await req.json();
  const { tipo_notificacion, detalle, usuarios } = data;
  if (!tipo_notificacion || !detalle) {
    return NextResponse.json(
      { error: 'Tipo y detalle de la notificación son obligatorios' },
      { status: 400 },
    );
  }
  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    return NextResponse.json(
      { error: 'Debe especificar al menos un usuario destinatario' },
      { status: 400 },
    );
  }
  try {
    const notification = await prisma.notificacion.create({
      data: {
        tipo_notificacion,
        detalle,
        enviada: true,
        fecha_envio: new Date(),
        usuarios: {
          create: usuarios.map((uid: number) => ({ id_usuario: uid })),
        },
      },
      include: { usuarios: true },
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Error al crear la notificación' },
      { status: 500 },
    );
  }
}
