import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/users/[id]
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // CRITICAL: await params antes de acceder a sus propiedades (Next.js 15+)
  const params = await context.params;
  const id = Number(params.id);
  
  // Retrieve the current session. Required before referencing `session` below.
  const session = await getServerSession(authOptions);
  
  // Allow admins to view any user. Users may view their own record.
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  const isAdmin = await (async () => {
    const role = await prisma.role.findUnique({ 
      where: { id_rol: Number(session.user?.roleId) } 
    });
    return role?.nombre_rol?.toLowerCase() === 'administrador';
  })();
  
  if (!isAdmin && Number(session.user.id) !== id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  
  const user = await prisma.usuario.findUnique({
    where: { id_usuario: id },
    include: { rol: true },
  });
  
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }
  
  const { contrasena_hash, ...userWithoutPassword } = user;
  
  // Formatear fecha_nacimiento a formato ISO (YYYY-MM-DD) para el frontend
  const safeUser = {
    ...userWithoutPassword,
    fecha_nacimiento: userWithoutPassword.fecha_nacimiento 
      ? userWithoutPassword.fecha_nacimiento.toISOString().split('T')[0] 
      : null,
  };
  
  return NextResponse.json(safeUser);
}

// PUT /api/users/[id]
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // CRITICAL: await params antes de acceder a sus propiedades (Next.js 15+)
  const params = await context.params;
  const id = Number(params.id);
  
  const session = await getServerSession(authOptions);
  const data = await req.json();
  
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  // Only admins can update any user; a user can update their own profile except role.
  const isAdmin = await (async () => {
    const role = await prisma.role.findUnique({ 
      where: { id_rol: Number(session.user?.roleId) } 
    });
    return role?.nombre_rol?.toLowerCase() === 'administrador';
  })();
  
  if (!isAdmin && Number(session.user.id) !== id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  
  // Prevent non-admins from changing role and estado
  if (!isAdmin) {
    delete data.id_rol;
    delete data.estado;
  }
  
  try {
    // Hash a new password if provided
    if (data.contrasena) {
      const hash = await bcrypt.hash(data.contrasena, 10);
      data.contrasena_hash = hash;
      delete data.contrasena;
    }
    
    // Convert fecha_nacimiento string to Date if present to avoid runtime type errors
    if (data.fecha_nacimiento) {
      const dateObj = new Date(data.fecha_nacimiento);
      if (!isNaN(dateObj.getTime())) {
        data.fecha_nacimiento = dateObj;
      } else {
        // Si la fecha es inválida, eliminarla del payload
        delete data.fecha_nacimiento;
      }
    }
    
    const user = await prisma.usuario.update({
      where: { id_usuario: id },
      data,
    });
    
    const { contrasena_hash, ...userWithoutPassword } = user;
    
    // Formatear fecha_nacimiento a formato ISO (YYYY-MM-DD) para el frontend
    const safeUser = {
      ...userWithoutPassword,
      fecha_nacimiento: userWithoutPassword.fecha_nacimiento 
        ? userWithoutPassword.fecha_nacimiento.toISOString().split('T')[0] 
        : null,
    };
    
    return NextResponse.json(safeUser);
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // CRITICAL: await params antes de acceder a sus propiedades (Next.js 15+)
  const params = await context.params;
  const id = Number(params.id);
  
  // Only administrators may deactivate a user. Instead of deleting the
  // record, we update the estado to 'inactivo'.
  const session = await getServerSession(authOptions);
  
  const isAdmin = await (async () => {
    if (!session) return false;
    const role = await prisma.role.findUnique({ 
      where: { id_rol: Number(session.user?.roleId) } 
    });
    return role?.nombre_rol?.toLowerCase() === 'administrador';
  })();
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  
  try {
    await prisma.usuario.update({
      where: { id_usuario: id },
      data: { estado: 'inactivo' },
    });
    return NextResponse.json({ message: 'Usuario desactivado' });
  } catch (err) {
    console.error('Error deactivating user:', err);
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }
}