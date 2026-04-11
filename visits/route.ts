import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/visits
 *
 * Registers a visit from the currently authenticated vendor to a specific client.
 * Requires `id_cliente` in the request body. Vendors may only record
 * visits for their own clients. Only one visit per vendor/client/day
 * is allowed. The API returns a 201 with the new record on success,
 * or a 409 if a visit was already recorded for today. Admins and
 * other roles are not permitted to record visits.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const userId = Number(session.user.id);
  // Determine if the user is a vendor
  const role = await prisma.role.findUnique({ where: { id_rol: Number(session.user.roleId) } });
  const isVendor = role?.nombre_rol?.toLowerCase() === 'vendedor';
  if (!isVendor) {
    return NextResponse.json({ error: 'Solo los vendedores pueden registrar visitas' }, { status: 403 });
  }
  const { id_cliente } = await req.json();
  if (!id_cliente) {
    return NextResponse.json({ error: 'Debe especificar el cliente' }, { status: 400 });
  }
  // Ensure the client belongs to the vendor
  const client = await prisma.cliente.findUnique({ where: { id_cliente: Number(id_cliente) } });
  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }
  if (client.id_vendedor_asignado !== userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  // Determine start of current day (00:00) to enforce one visit per day
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  try {
    const visita = await prisma.visitaCliente.create({
      data: {
        id_vendedor: userId,
        id_cliente: Number(id_cliente),
        fecha_visita: startOfDay,
        hora_visita: now,
        // contador_visitas always 1 per record; aggregated counts can be computed separately
      },
    });
    return NextResponse.json(visita, { status: 201 });
  } catch (err: any) {
    // Unique constraint error indicates a visit already recorded for today
    return NextResponse.json({ error: 'Ya se registró una visita para este cliente hoy' }, { status: 409 });
  }
}

/**
 * GET /api/visits
 *
 * Returns a list of visits for the authenticated vendor. Admins can
 * optionally fetch visits for any vendor by specifying the `vendedor`
 * query parameter. If no session is present, returns 401.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const vendedorParam = searchParams.get('vendedor');
  const role = await prisma.role.findUnique({ where: { id_rol: Number(session.user.roleId) } });
  const isVendor = role?.nombre_rol?.toLowerCase() === 'vendedor';
  const isAdmin = role?.nombre_rol?.toLowerCase() === 'administrador';
  let where: any = {};
  if (isVendor) {
    where.id_vendedor = Number(session.user.id);
  } else if (vendedorParam) {
    where.id_vendedor = Number(vendedorParam);
  }
  const visitas = await prisma.visitaCliente.findMany({
    where,
    include: {
      cliente: true,
    },
    orderBy: { fecha_visita: 'desc' },
  });
  return NextResponse.json(visitas);
}