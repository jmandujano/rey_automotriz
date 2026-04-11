import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/reports/commissions
 * Returns commission report based on financial movements
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const role = await prisma.role.findUnique({ 
      where: { id_rol: Number(session.user?.roleId) } 
    });
    
    // Buscar categoría "Venta"
    const categoriaVenta = await prisma.categoriaFinanciera.findFirst({
      where: { nombre_categoria: 'Venta' }
    });

    if (!categoriaVenta) {
      return NextResponse.json({ 
        error: 'Categoría "Venta" no encontrada' 
      }, { status: 404 });
    }

    // Construir filtro base: solo ingresos de categoría "Venta"
    let whereMovimiento: any = {
      tipo_movimiento: 'ingreso',
      id_categoria_financiera: categoriaVenta.id_categoria_financiera
    };

    // Obtener todos los movimientos financieros de tipo ingreso con categoría Venta
    const movimientos = await prisma.movimientoFinanciero.findMany({
      where: whereMovimiento,
      include: {
        movimientoPedidos: {
          include: {
            pedido: {
              include: {
                vendedor: {
                  select: {
                    id_usuario: true,
                    nombre_completo: true
                  }
                },
                detalles: {
                  select: {
                    cantidad: true,
                    precio_venta_comision: true,
                    comision: true
                  }
                },
                cuotas: {
                  orderBy: { numero_cuota: 'asc' },
                  select: {
                    id_cuota: true,
                    numero_cuota: true,
                    estado_pago: true
                  }
                }
              }
            }
          }
        },
        pedido_cuotas: {
          select: {
            id_cuota: true,
            numero_cuota: true
          }
        }
      },
      orderBy: { fecha_registro: 'desc' }
    });

    // Procesar datos para el reporte
    const reporteComisiones = movimientos
      .filter(mov => mov.movimientoPedidos && mov.movimientoPedidos.length > 0) // Solo movimientos vinculados a pedidos
      .map(movimiento => {
        const vinculo = movimiento.movimientoPedidos[0]; // Tomar el primer vínculo
        const pedido = vinculo.pedido;
        
        // Calcular comisión promedio ponderada
        let comisionPromedio = 0;
        if (pedido.detalles && pedido.detalles.length > 0) {
          let sumaComisionesPonderadas = 0;
          let sumaMontos = 0;
          
          pedido.detalles.forEach(detalle => {
            const montoDetalle = Number(detalle.cantidad) * Number(detalle.precio_venta_comision);
            const comisionDetalle = Number(detalle.comision || 0);
            sumaComisionesPonderadas += montoDetalle * comisionDetalle;
            sumaMontos += montoDetalle;
          });
          
          comisionPromedio = sumaMontos > 0 ? sumaComisionesPonderadas / sumaMontos : 0;
        }

        // Calcular información de cuotas
        let cuotaInfo = '1 de 1';
        let numeroCuotaPagada = 1;
        
        // Si tiene id_cuota, obtener el número de cuota desde pedido_cuotas
        if (movimiento.pedido_cuotas) {
          numeroCuotaPagada = movimiento.pedido_cuotas.numero_cuota;
        }
        
        if (pedido.tipo_pago.toLowerCase() === 'credito' && pedido.cuotas.length > 0) {
          const totalCuotas = pedido.cuotas.length;
          cuotaInfo = `${numeroCuotaPagada} de ${totalCuotas}`;
        }

        // Calcular monto de comisión pagada
        const montoPagado = Number(movimiento.monto);
        const montoComision = (montoPagado * comisionPromedio) / 100;

        return {
          id_movimiento: movimiento.id_movimiento,
          id_vendedor: pedido.id_vendedor,
          vendedor: pedido.vendedor?.nombre_completo || 'N/A',
          id_pedido: pedido.id_pedido,
          monto_total_pedido: Number(pedido.total),
          comision_porcentaje: comisionPromedio,
          tipo_pago: pedido.tipo_pago,
          cuotas: cuotaInfo,
          monto_pagado: montoPagado,
          monto_comision: montoComision,
          fecha_pago: movimiento.fecha_movimiento,
          fecha_registro: movimiento.fecha_registro
        };
      });

    // Filtrar por vendedor si el rol es vendedor
    let reporteFiltrado = reporteComisiones;
    if (role?.nombre_rol?.toLowerCase() === 'vendedor') {
      reporteFiltrado = reporteComisiones.filter(
        item => item.id_vendedor === Number(session.user.id)
      );
    }

    return NextResponse.json(reporteFiltrado);
  } catch (err: any) {
    console.error('Error al obtener reporte de comisiones:', err);
    return NextResponse.json({ 
      error: err.message || 'Error al obtener reporte de comisiones' 
    }, { status: 500 });
  }
}