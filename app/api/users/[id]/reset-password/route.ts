import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/users/[id]/reset-password
 *
 * Generates a temporary password for the specified user and updates
 * the user's password hash in the database. Only users with the
 * Administrador role may perform this action. The temporary password
 * is returned in the response payload so that the administrator can
 * communicate it to the user. The flag `requiere_cambio_contrasena`
 * is set to true so the user is prompted to change their password
 * upon next login.
 */
export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  // Only administrators may reset passwords
  const session = await getServerSession(authOptions);
  if (!session?.user?.roleId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const role = await prisma.role.findUnique({ where: { id_rol: Number(session.user.roleId) } });
  if (!role || role.nombre_rol.toLowerCase() !== 'administrador') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  // Access the route parameter off of the context to avoid the
  // synchronous `params` error described in the Next.js docs.
  const id = Number(context.params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const user = await prisma.usuario.findUnique({ where: { id_usuario: id } });
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }
  // Generate a random temporary password of 8 characters (alphanumeric)
  const tempPassword = Math.random().toString(36).slice(-8);
  const hash = await bcrypt.hash(tempPassword, 10);
  await prisma.usuario.update({
    where: { id_usuario: id },
    data: {
      contrasena_hash: hash,
      requiere_cambio_contrasena: true,
    },
  });
  return NextResponse.json({ tempPassword });
}

export const dynamic = 'force-dynamic';