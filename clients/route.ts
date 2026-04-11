import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/clients
// Returns a list of clients with their id and razon_social. Only active clients are returned.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const vendedorIdParam = searchParams.get('vendedor');
  let where: any = { estado: 'activo' };
  // Vendors can only view their own clients
  const role = await prisma.role.findUnique({ where: { id_rol: Number((session.user as any)?.roleId) } });
  const isVendor = role?.nombre_rol?.toLowerCase() === 'vendedor';
  const isAdmin = role?.nombre_rol?.toLowerCase() === 'administrador';
  // Vendors may view all clients; apply vendor filter only when a vendorIdParam
  // is explicitly provided (used by administrators to filter). Vendors cannot
  // arbitrarily filter by vendor ID.
  if (isVendor) {
    where.id_vendedor_asignado = Number((session.user as any).id);
  } else if (vendedorIdParam) {
    where.id_vendedor_asignado = Number(vendedorIdParam);
  }
  const clients = await prisma.cliente.findMany({
    where,
    include: {
      vendedor: {
        select: {
          id_usuario: true,
          nombre_completo: true,
        },
      },
    },
    orderBy: { razon_social: 'asc' },
  });
  return NextResponse.json(clients);
}

// POST /api/clients
// Creates a new client. Requires razon_social, correo_electronico and id_vendedor_asignado
// along with optional fields such as ruc, nombre_representante, fecha de cumpleaños
// and contact information. Unrecognized fields are ignored.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const role = await prisma.role.findUnique({ where: { id_rol: Number((session.user as any)?.roleId) } });
  const isVendor = role?.nombre_rol?.toLowerCase() === 'vendedor';
  const isAdmin = role?.nombre_rol?.toLowerCase() === 'administrador';
  if (!isVendor && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  try {
    const data = await req.json();
    let {
      id_vendedor_asignado,
      ruc,
      razon_social,
      nombre_representante,
      cumpleanos_representante,
      correo_electronico,
      telefono_principal,
      telefono_secundario,
      dni_representante,
      tipo_cliente,
      departamento,
      provincia,
      distrito,
      direccion,
      estado,
    } = data;
    if (!razon_social || !correo_electronico) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }
    // If vendor, force assignment to the current user
    if (isVendor) {
      id_vendedor_asignado = Number((session.user as any).id);
    }
    if (!id_vendedor_asignado) {
      return NextResponse.json({ error: 'Debe asignar un vendedor' }, { status: 400 });
    }
    // Normalization helper: convert empty strings to undefined to prevent
    // exceeding database column lengths or inserting blank values.
    const normalize = (value: any) => {
      if (value === '' || value === null || value === undefined) return undefined;
      return value;
    };
    // Validate RUC (11 digits) and DNI (8 digits) lengths
    if (ruc && String(ruc).length > 11) {
      return NextResponse.json(
        { error: 'El RUC no puede tener más de 11 caracteres' },
        { status: 400 },
      );
    }
    if (dni_representante && String(dni_representante).length > 8) {
      return NextResponse.json(
        { error: 'El DNI no puede tener más de 8 caracteres' },
        { status: 400 },
      );
    }
    // Ensure email uniqueness in a case‑insensitive manner. If the provided
    // correo_electronico exists in another record, return a 409 conflict.
    const existing = await prisma.cliente.findFirst({
      where: {
        correo_electronico: {
          equals: correo_electronico,
          mode: 'insensitive',
        },
      },
      select: { id_cliente: true },
    });
    if (existing) {
      return NextResponse.json({ error: 'El correo del cliente ya existe' }, { status: 409 });
    }
    // Map user‑facing tipo_cliente values to those permitted by the
    // database. According to the schema, tipo_cliente accepts
    // 'minorista', 'mayorista' or 'otro'. The FRD uses 'natural' and
    // 'juridica', so we convert them here. Any other value falls back
    // to its normalized form.
    let mappedTipo = normalize(tipo_cliente);
    if (mappedTipo) {
      const lower = String(mappedTipo).toLowerCase();
      if (lower === 'natural') mappedTipo = 'minorista';
      else if (lower === 'juridica') mappedTipo = 'mayorista';
    }
    const client = await prisma.cliente.create({
      data: {
        id_vendedor_asignado: Number(id_vendedor_asignado),
        ruc: normalize(ruc),
        razon_social,
        nombre_representante: normalize(nombre_representante),
        cumpleanos_representante: cumpleanos_representante
          ? new Date(cumpleanos_representante)
          : undefined,
        correo_electronico,
        telefono_principal: normalize(telefono_principal),
        telefono_secundario: normalize(telefono_secundario),
        dni_representante: normalize(dni_representante),
        tipo_cliente: mappedTipo,
        departamento: normalize(departamento),
        provincia: normalize(provincia),
        distrito: normalize(distrito),
        direccion: normalize(direccion),
        estado: estado ?? 'activo',
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}