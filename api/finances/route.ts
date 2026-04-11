import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/movimientos-financieros
 * Obtiene todos los movimientos financieros con sus relaciones
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener todos los movimientos financieros
    const movimientos = await prisma.movimientoFinanciero.findMany({
      include: {
        categoria: {
          select: {
            id_categoria_financiera: true,
            nombre_categoria: true
          }
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre_completo: true
          }
        },
        comprobantes: {
          select: {
            id_comprobante: true,
            nombre_archivo: true,
            ruta_archivo: true
          }
        }
      },
      orderBy: {
        fecha_movimiento: 'desc'
      }
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error("Error al obtener movimientos financieros:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/movimientos-financieros
 * Crea un nuevo movimiento financiero
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del body
    const body = await req.json();
    const {
      tipo_movimiento,
      id_categoria_financiera,
      descripcion,
      monto,
      fecha_movimiento
    } = body;

    // Validaciones
    if (!tipo_movimiento || !descripcion || monto === undefined || !fecha_movimiento) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (!["ingreso", "egreso"].includes(tipo_movimiento.toLowerCase())) {
      return NextResponse.json(
        { error: "Tipo de movimiento inválido. Debe ser ingreso o egreso" },
        { status: 400 }
      );
    }

    if (Number(monto) < 0) {
      return NextResponse.json(
        { error: "El monto no puede ser negativo" },
        { status: 400 }
      );
    }

    // Crear el movimiento financiero
    const nuevoMovimiento = await prisma.movimientoFinanciero.create({
      data: {
        tipo_movimiento: tipo_movimiento.toLowerCase(),
        id_categoria_financiera: id_categoria_financiera || null,
        descripcion,
        monto: Number(monto),
        fecha_movimiento: new Date(fecha_movimiento),
        id_usuario_registro: Number(session.user.id),
        estado_computo: "computado"
      },
      include: {
        categoria: {
          select: {
            id_categoria_financiera: true,
            nombre_categoria: true
          }
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre_completo: true
          }
        },
        comprobantes: true
      }
    });

    return NextResponse.json(nuevoMovimiento, { status: 201 });
  } catch (error) {
    console.error("Error al crear movimiento financiero:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/movimientos-financieros
 * Actualiza un movimiento financiero existente
 * Requiere id en el body
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del body
    const body = await req.json();
    const {
      id,
      tipo_movimiento,
      id_categoria_financiera,
      descripcion,
      monto,
      fecha_movimiento
    } = body;

    // Validar ID
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Verificar que el movimiento existe
    const movimientoExistente = await prisma.movimientoFinanciero.findUnique({
      where: { id_movimiento: Number(id) }
    });

    if (!movimientoExistente) {
      return NextResponse.json(
        { error: "Movimiento no encontrado" },
        { status: 404 }
      );
    }

    // Validaciones
    if (!tipo_movimiento || !descripcion || monto === undefined || !fecha_movimiento) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    if (!["ingreso", "egreso"].includes(tipo_movimiento.toLowerCase())) {
      return NextResponse.json(
        { error: "Tipo de movimiento inválido. Debe ser ingreso o egreso" },
        { status: 400 }
      );
    }

    if (Number(monto) < 0) {
      return NextResponse.json(
        { error: "El monto no puede ser negativo" },
        { status: 400 }
      );
    }

    // Actualizar el movimiento financiero
    const movimientoActualizado = await prisma.movimientoFinanciero.update({
      where: { id_movimiento: Number(id) },
      data: {
        tipo_movimiento: tipo_movimiento.toLowerCase(),
        id_categoria_financiera: id_categoria_financiera || null,
        descripcion,
        monto: Number(monto),
        fecha_movimiento: new Date(fecha_movimiento),
        fecha_ultima_actualizacion: new Date()
      },
      include: {
        categoria: {
          select: {
            id_categoria_financiera: true,
            nombre_categoria: true
          }
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre_completo: true
          }
        },
        comprobantes: true
      }
    });

    return NextResponse.json(movimientoActualizado);
  } catch (error) {
    console.error("Error al actualizar movimiento financiero:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/movimientos-financieros
 * Elimina un movimiento financiero
 * Requiere id en el body
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener ID del body
    const body = await req.json();
    const { id } = body;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "ID inválido" },
        { status: 400 }
      );
    }

    // Verificar que el movimiento existe
    const movimientoExistente = await prisma.movimientoFinanciero.findUnique({
      where: { id_movimiento: Number(id) },
      include: {
        comprobantes: true,
        movimientoPedidos: true,
        comisiones: true
      }
    });

    if (!movimientoExistente) {
      return NextResponse.json(
        { error: "Movimiento no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si hay relaciones que impidan la eliminación
    if (movimientoExistente.movimientoPedidos.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el movimiento porque está vinculado a pedidos" },
        { status: 400 }
      );
    }

    if (movimientoExistente.comisiones.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el movimiento porque está vinculado a comisiones" },
        { status: 400 }
      );
    }

    // Eliminar el movimiento (los comprobantes se eliminan automáticamente por CASCADE)
    await prisma.movimientoFinanciero.delete({
      where: { id_movimiento: Number(id) }
    });

    return NextResponse.json(
      { message: "Movimiento eliminado correctamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar movimiento financiero:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}