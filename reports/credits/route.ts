import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/reports/credits
 * Returns orders with credit payments (both pending and completed)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let where: any = {};
    
    const role = await prisma.role.findUnique({ 
      where: { id_rol: Number(session.user?.roleId) } 
    });
    
    // Vendedores solo ven sus propios pedidos
    if (role?.nombre_rol?.toLowerCase() === 'vendedor') {
      where.id_vendedor = Number(session.user.id);
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        cliente: {
          select: {
            id_cliente: true,
            razon_social: true,
            distrito: true
          }
        },
        vendedor: { 
          select: { 
            id_usuario: true, 
            nombre_completo: true 
          } 
        },
        cuotas: {
          orderBy: { numero_cuota: 'asc' }
        }
      },
      orderBy: { id_pedido: 'desc' },
    });

    // Procesar datos para incluir información de cuotas
    const pedidosConCuotas = pedidos.map(pedido => {
      const cuotas = pedido.cuotas || [];

      // Calcular fecha de última cuota
      const fechaUltimaCuota = cuotas.length > 0 
        ? cuotas[cuotas.length - 1].fecha_pago_programada 
        : null;

      // Calcular días de retraso (solo si hay cuotas vencidas y pendientes)
      let diasRetraso = 0;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const cuotasVencidas = cuotas.filter(c => {
        const fechaProgramada = new Date(c.fecha_pago_programada);
        fechaProgramada.setHours(0, 0, 0, 0);
        return c.estado_pago === 'pendiente' && fechaProgramada < hoy;
      });

      if (cuotasVencidas.length > 0) {
        // Obtener la cuota vencida más antigua
        const cuotaMasAntigua = cuotasVencidas[0];
        const fechaVencida = new Date(cuotaMasAntigua.fecha_pago_programada);
        fechaVencida.setHours(0, 0, 0, 0);
        
        const diffTime = hoy.getTime() - fechaVencida.getTime();
        diasRetraso = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...pedido,
        cuotas,
        fecha_ultima_cuota: fechaUltimaCuota,
        dias_retraso: diasRetraso
      };
    });

    return NextResponse.json(pedidosConCuotas);
  } catch (err: any) {
    console.error('Error al obtener créditos:', err);
    return NextResponse.json({ 
      error: err.message || 'Error al obtener créditos' 
    }, { status: 500 });
  }
}

/**
 * PATCH /api/reports/credits
 * Update payment information for a specific installment
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id_cuota, id_pedido, fecha_pago_real, monto_pagado, es_contado } = await req.json();

    if ((!id_cuota && !es_contado) || !id_pedido) {
      return NextResponse.json({ 
        error: 'Datos incompletos' 
      }, { status: 400 });
    }

    if (!fecha_pago_real || !monto_pagado || monto_pagado <= 0) {
      return NextResponse.json({ 
        error: 'Debe proporcionar fecha de pago y monto válido' 
      }, { status: 400 });
    }

    // Verificar permisos del vendedor
    const role = await prisma.role.findUnique({ 
      where: { id_rol: Number(session.user?.roleId) } 
    });
    
    if (role?.nombre_rol?.toLowerCase() === 'vendedor') {
      const pedido = await prisma.pedido.findUnique({
        where: { id_pedido: Number(id_pedido) }
      });
      
      if (pedido?.id_vendedor !== Number(session.user.id)) {
        return NextResponse.json({ 
          error: 'No tiene permisos para editar este pedido' 
        }, { status: 403 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let cuotaActualizada;
      let infoPedido;

      // Obtener información completa del pedido para el registro financiero
      const pedidoCompleto = await tx.pedido.findUnique({
        where: { id_pedido: Number(id_pedido) },
        include: {
          cliente: {
            select: {
              razon_social: true,
              distrito: true
            }
          },
          vendedor: {
            select: {
              nombre_completo: true
            }
          },
          cuotas: true
        }
      });

      if (!pedidoCompleto) {
        throw new Error('Pedido no encontrado');
      }

      // Caso especial: pedido al contado
      if (es_contado) {
        // Buscar la cuota del pedido al contado (debe existir una sola cuota)
        const cuotaContado = await tx.pedido_cuotas.findFirst({
          where: { id_pedido: Number(id_pedido) }
        });

        if (!cuotaContado) {
          throw new Error('Cuota no encontrada para el pedido al contado');
        }

        // Validar que el monto no exceda el saldo pendiente
        const nuevoMontoPagado = Number(cuotaContado.monto_pagado || 0) + Number(monto_pagado);
        
        if (nuevoMontoPagado > Number(cuotaContado.monto_cuota)) {
          throw new Error('El monto total pagado no puede exceder el monto de la cuota');
        }

        const nuevoSaldo = Number(cuotaContado.monto_cuota) - nuevoMontoPagado;
        const nuevoEstado = nuevoSaldo === 0 ? 'completado' : 'pendiente';

        // Actualizar la cuota
        cuotaActualizada = await tx.pedido_cuotas.update({
          where: { id_cuota: cuotaContado.id_cuota },
          data: {
            monto_pagado: nuevoMontoPagado,
            saldo_pendiente: nuevoSaldo,
            estado_pago: nuevoEstado,
            fecha_pago_real: nuevoEstado === 'completado' ? new Date(fecha_pago_real) : cuotaContado.fecha_pago_real
          }
        });

        // Actualizar el estado del pedido
        await tx.pedido.update({
          where: { id_pedido: Number(id_pedido) },
          data: {
            estado_pago: nuevoEstado
          }
        });

        // Preparar información para registro financiero
        infoPedido = {
          cliente: pedidoCompleto.cliente?.razon_social || 'N/A',
          distrito: pedidoCompleto.cliente?.distrito || 'N/A',
          vendedor: pedidoCompleto.vendedor?.nombre_completo || 'N/A',
          numeroCuota: 1,
          totalCuotas: 1,
          cuotasPendientes: nuevoEstado === 'completado' ? 0 : 1,
          montoPagado: Number(monto_pagado)
        };
      } else {
        // Caso normal: pedido a crédito con cuotas
        const cuota = await tx.pedido_cuotas.findUnique({
          where: { id_cuota: Number(id_cuota) }
        });

        if (!cuota) {
          throw new Error('Cuota no encontrada');
        }

        const nuevoMontoPagado = Number(cuota.monto_pagado) + Number(monto_pagado);
        
        if (nuevoMontoPagado > Number(cuota.monto_cuota)) {
          throw new Error('El monto total pagado no puede exceder el monto de la cuota');
        }

        const nuevoSaldo = Number(cuota.monto_cuota) - nuevoMontoPagado;
        const nuevoEstado = nuevoSaldo === 0 ? 'completado' : 'pendiente';

        // Actualizar la cuota
        cuotaActualizada = await tx.pedido_cuotas.update({
          where: { id_cuota: Number(id_cuota) },
          data: {
            monto_pagado: nuevoMontoPagado,
            saldo_pendiente: nuevoSaldo,
            estado_pago: nuevoEstado,
            fecha_pago_real: nuevoEstado === 'completado' ? new Date(fecha_pago_real) : cuota.fecha_pago_real
          }
        });

        // Verificar si todas las cuotas están completadas
        const todasCuotas = await tx.pedido_cuotas.findMany({
          where: { id_pedido: Number(id_pedido) }
        });

        const todasCompletadas = todasCuotas.every(c => c.estado_pago === 'completado');

        // Si todas las cuotas están completadas, actualizar el estado del pedido
        if (todasCompletadas) {
          await tx.pedido.update({
            where: { id_pedido: Number(id_pedido) },
            data: { estado_pago: 'completado' }
          });
        }

        // Calcular cuotas pendientes
        const cuotasPendientes = todasCuotas.filter(c => c.estado_pago === 'pendiente').length;

        // Preparar información para registro financiero
        infoPedido = {
          cliente: pedidoCompleto.cliente?.razon_social || 'N/A',
          distrito: pedidoCompleto.cliente?.distrito || 'N/A',
          vendedor: pedidoCompleto.vendedor?.nombre_completo || 'N/A',
          numeroCuota: cuota.numero_cuota,
          totalCuotas: todasCuotas.length,
          cuotasPendientes: cuotasPendientes,
          montoPagado: Number(monto_pagado)
        };
      }

      // Buscar categoría "Venta"
      const categoriaVenta = await tx.categoriaFinanciera.findFirst({
        where: { nombre_categoria: 'Venta' }
      });

      if (!categoriaVenta) {
        throw new Error('Categoría "Venta" no encontrada en el sistema');
      }

      // Crear descripción del movimiento financiero
      const descripcion = `Cliente: ${infoPedido.cliente} - Distrito: ${infoPedido.distrito} - Vendedor: ${infoPedido.vendedor} - Cuota pagada: ${infoPedido.numeroCuota} de ${infoPedido.totalCuotas} - Monto: S/ ${infoPedido.montoPagado.toFixed(2)}`;

      // Crear registro de movimiento financiero (ingreso)
      const movimientoCreado = await tx.movimientoFinanciero.create({
        data: {
          tipo_movimiento: 'ingreso',
          id_categoria_financiera: categoriaVenta.id_categoria_financiera,
          descripcion: descripcion,
          monto: infoPedido.montoPagado,
          fecha_movimiento: new Date(fecha_pago_real),
          id_usuario_registro: Number(session.user.id),
          estado_computo: 'computado',
          id_cuota: es_contado ? (cuotaActualizada?.id_cuota || null) : Number(id_cuota)
        }
      });

      // Crear vinculación en la tabla intermedia MovimientoPedido
      await tx.movimientoPedido.create({
        data: {
          id_movimiento: movimientoCreado.id_movimiento,
          id_pedido: Number(id_pedido)
        }
      });

      return { 
        cuota: cuotaActualizada,
        pedido_completado: es_contado ? (infoPedido.cuotasPendientes === 0) : undefined,
        estado_pedido: es_contado ? (infoPedido.cuotasPendientes === 0 ? 'completado' : 'pendiente') : undefined,
        mensaje: 'Pago registrado exitosamente',
        success: true
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error al actualizar pago:', err);
    return NextResponse.json({ 
      error: err.message || 'Error al actualizar pago' 
    }, { status: 500 });
  }
}