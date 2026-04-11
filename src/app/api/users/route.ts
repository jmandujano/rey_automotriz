import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Helper to determine if the current session user has the specified role
 * name. Looks up the role by ID in the database. Returns `false` if
 * the session is missing or the role does not match. Using a DB lookup
 * avoids hard‑coding numeric role IDs which may vary between
 * environments.
 */
async function hasRole(session: any, roleName: string): Promise<boolean> {
  if (!session || !session.user?.roleId) return false;
  const role = await prisma.role.findUnique({ where: { id_rol: Number(session.user.roleId) } });
  return role?.nombre_rol?.toLowerCase() === roleName.toLowerCase();
}

// GET /api/users
// Returns a list of system users (excluding clients). Sensitive fields
// such as password hashes are omitted.
export async function GET(req: NextRequest) {
  // Allow any authenticated user (admin, vendor or operator) to list users.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get('rol');
  const estadoFilter = searchParams.get('estado');
  // Default to active users when no estado filter is provided.  This
  // ensures inactive users are hidden from listings.
  const where: any = {};
  if (roleFilter) {
    // Find role id by name (case insensitive)
    const role = await prisma.role.findFirst({ where: { nombre_rol: { equals: roleFilter, mode: 'insensitive' } } });
    if (role) where.id_rol = role.id_rol;
  }
  if (estadoFilter) {
    where.estado = estadoFilter;
  } else {
    where.estado = 'activo';
  }
  const users = await prisma.usuario.findMany({
    where,
    include: { rol: true },
    orderBy: { id_usuario: 'asc' },
  });
  // Expose only safe fields
  const safeUsers = users.map((u) => ({
    id_usuario: u.id_usuario,
    correo_electronico: u.correo_electronico,
    nombre_completo: u.nombre_completo,
    estado: u.estado,
    rol: u.rol,
    fecha_creacion: u.fecha_creacion,
  }));
  return NextResponse.json(safeUsers);
}

// POST /api/users
// Creates a new user. Requires correo_electronico, nombre_completo,
// contrasena and id_rol.
export async function POST(req: NextRequest) {
  // Only administrators may create users
  const session = await getServerSession(authOptions);
  if (!(await hasRole(session, 'Administrador'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  const data = await req.json();
  const {
    correo_electronico,
    nombre_completo,
    contrasena,
    id_rol,
    estado,
    dni,
    fecha_nacimiento,
    telefono_principal,
    telefono_secundario,
  } = data;
  if (!correo_electronico || !nombre_completo || !contrasena || !id_rol) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }
  // Normalize email and ensure uniqueness
  const email = correo_electronico.toLowerCase();
  const existing = await prisma.usuario.findUnique({ where: { correo_electronico: email } });
  if (existing) {
    return NextResponse.json({ error: 'El correo ya existe' }, { status: 409 });
  }
  const hash = await bcrypt.hash(contrasena, 10);
  // Build the data object with optional fields.  Strings may be empty
  // which we convert to undefined to avoid overriding defaults.
  const userData: any = {
    correo_electronico: email,
    contrasena_hash: hash,
    nombre_completo,
    id_rol: Number(id_rol),
    estado: estado ?? 'activo',
  };
  if (dni) userData.dni = dni;
  if (telefono_principal) userData.telefono_principal = telefono_principal;
  if (telefono_secundario) userData.telefono_secundario = telefono_secundario;
  if (fecha_nacimiento) {
    // Convert incoming date string to a proper Date object.  When
    // constructing a Date with YYYY-MM-DD it interprets the date in
    // UTC which is acceptable because we store only the date portion.
    const dateObj = new Date(fecha_nacimiento);
    if (!isNaN(dateObj.getTime())) {
      userData.fecha_nacimiento = dateObj;
    }
  }
  const user = await prisma.usuario.create({
    data: userData,
  });
  return NextResponse.json(
    {
      id_usuario: user.id_usuario,
      correo_electronico: user.correo_electronico,
      nombre_completo: user.nombre_completo,
      estado: user.estado,
    },
    { status: 201 },
  );
}