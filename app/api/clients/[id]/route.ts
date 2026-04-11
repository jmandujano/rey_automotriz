import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/clients/[id]
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const params = await context.params;
  const id = Number(params.id);
  const client = await prisma.cliente.findUnique({
    where: { id_cliente: id },
    include: { vendedor: true },
  });
  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }
  // Vendors can only view their own clients
  const role = await prisma.role.findUnique({ where: { id_rol: Number(session.user?.roleId) } });
  const isVendor = role?.nombre_rol?.toLowerCase() === 'vendedor';
  if (isVendor && client.id_vendedor_asignado !== Number(session.user.id)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  return NextResponse.json(client);
}

// PUT /api/clients/[id]
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const params = await context.params;
  const id = Number(params.id);
  const data = await req.json();
  // Determine role
  const role = await prisma.role.findUnique({ where: { id_rol: Number(session.user?.roleId) } });
  const isVendor = role?.nombre_rol?.toLowerCase() === 'vendedor';
  const isAdmin = role?.nombre_rol?.toLowerCase() === 'administrador';
  try {
    const client = await prisma.cliente.findUnique({ where: { id_cliente: id } });
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    // Vendors can only edit their own clients
    if (isVendor && client.id_vendedor_asignado !== Number(session.user.id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    // Vendors cannot reassign clients; ignore id_vendedor_asignado from data
    if (isVendor) {
      delete data.id_vendedor_asignado;
    }
    // If the payload contains a cumpleanos_representante string, convert it to a Date
    if (data.cumpleanos_representante) {
      const dateObj = new Date(data.cumpleanos_representante);
      if (!isNaN(dateObj.getTime())) {
        data.cumpleanos_representante = dateObj;
      }
    }
    // Map tipo_cliente from user‑facing values to those permitted by the database
    if (data.tipo_cliente) {
      const lower = String(data.tipo_cliente).toLowerCase();
      if (lower === 'natural') data.tipo_cliente = 'minorista';
      else if (lower === 'juridica') data.tipo_cliente = 'mayorista';
    }
    const updated = await prisma.cliente.update({
      where: { id_cliente: id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE /api/clients/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // Only admin can deactivate clients
  const role = await prisma.role.findUnique({ where: { id_rol: Number(session.user?.roleId) } });
  const isAdmin = role?.nombre_rol?.toLowerCase() === 'administrador';
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const params = await context.params;
  const id = Number(params.id);
  try {
    await prisma.cliente.update({ where: { id_cliente: id }, data: { estado: 'inactivo' } });
    return NextResponse.json({ message: 'Cliente desactivado' });
  } catch (err) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }
}