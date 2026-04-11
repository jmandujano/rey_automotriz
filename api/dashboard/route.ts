// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/dashboard/stats
 * 
 * Returns comprehensive dashboard statistics including:
 * - Financial totals (sales, computed sales, pending credits, expenses)
 * - Order totals (total, delivered, pending, cancelled)
 * - Monthly charts data (finances, sales by vendor)
 * - Top 5 clients and vendors by computed sales
 * 
 * Query params:
 * - fecha_inicio: Start date (ISO format) - defaults to 1 year ago
 * - fecha_fin: End date (ISO format) - defaults to today
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    
    // Parse date filters - default to last year
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    
    const fechaInicio = searchParams.get('fecha_inicio') 
      ? new Date(searchParams.get('fecha_inicio')!) 
      : oneYearAgo;
    
    const fechaFin = searchParams.get('fecha_fin') 
      ? new Date(searchParams.get('fecha_fin')!) 
      : now;

    // ============================================
    // SECCIÓN DE FINANZAS
    // ============================================

    // 1. Total de ventas (suma de todos los pedidos)
    const totalVentas = await prisma.pedido.aggregate({
      where: {
        fecha_creacion: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      _sum: {
        total: true,
      },
    });

    // 2. Total ventas computadas (suma de ingresos)
    const ventasComputadas = await prisma.movimientoFinanciero.aggregate({
      where: {
        tipo_movimiento: 'ingreso',
        fecha_movimiento: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      _sum: {
        monto: true,
      },
    });

    // 3. Total créditos pendientes (suma de cuotas pendientes)
    const creditosPendientes = await prisma.pedido_cuotas.aggregate({
      where: {
        estado_pago: 'pendiente',
        pedido: {
          fecha_creacion: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      },
      _sum: {
        saldo_pendiente: true,
      },
    });

    // 4. Total de gastos (suma de egresos)
    const totalGastos = await prisma.movimientoFinanciero.aggregate({
      where: {
        tipo_movimiento: 'egreso',
        fecha_movimiento: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      _sum: {
        monto: true,
      },
    });

    // ============================================
    // SECCIÓN DE PEDIDOS
    // ============================================

    const pedidosStats = await prisma.pedido.groupBy({
      by: ['estado_actual'],
      where: {
        fecha_creacion: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      _count: {
        id_pedido: true,
      },
    });

    const totalPedidos = pedidosStats.reduce((sum, item) => sum + item._count.id_pedido, 0);
    const pedidosEntregados = pedidosStats.find(p => p.estado_actual === 'entregado')?._count.id_pedido || 0;
    const pedidosCancelados = pedidosStats.find(p => p.estado_actual === 'cancelado')?._count.id_pedido || 0;
    const pedidosPendientes = pedidosStats
      .filter(p => ['registrado', 'en_proceso', 'pendiente'].includes(p.estado_actual || ''))
      .reduce((sum, item) => sum + item._count.id_pedido, 0);

    // ============================================
    // GRÁFICO 1: Finanzas por mes
    // ============================================

    // Obtener pedidos por mes
    const pedidosPorMes = await prisma.pedido.findMany({
      where: {
        fecha_creacion: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      select: {
        total: true,
        fecha_creacion: true,
      },
    });

    // Obtener movimientos financieros por mes
    const movimientosPorMes = await prisma.movimientoFinanciero.findMany({
      where: {
        fecha_movimiento: {
          gte: fechaInicio,
          lte: fechaFin,
        },
      },
      select: {
        tipo_movimiento: true,
        monto: true,
        fecha_movimiento: true,
      },
    });

    // Generar array de meses entre fecha_inicio y fecha_fin
    const meses: Array<{
      mes: string;
      ventas: number;
      ventasComputadas: number;
      gastos: number;
    }> = [];

    const currentDate = new Date(fechaInicio);
    while (currentDate <= fechaFin) {
      const mesKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      meses.push({
        mes: mesKey,
        ventas: 0,
        ventasComputadas: 0,
        gastos: 0,
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Agregar ventas por mes
    pedidosPorMes.forEach(pedido => {
      const fecha = new Date(pedido.fecha_creacion!);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const mesIndex = meses.findIndex(m => m.mes === mesKey);
      if (mesIndex !== -1) {
        meses[mesIndex].ventas += Number(pedido.total);
      }
    });

    // Agregar ingresos y gastos por mes
    movimientosPorMes.forEach(mov => {
      const fecha = new Date(mov.fecha_movimiento);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const mesIndex = meses.findIndex(m => m.mes === mesKey);
      if (mesIndex !== -1) {
        const monto = Number(mov.monto);
        if (mov.tipo_movimiento === 'ingreso') {
          meses[mesIndex].ventasComputadas += monto;
        } else {
          meses[mesIndex].gastos += monto;
        }
      }
    });

    // ============================================
    // GRÁFICO 2: Ventas computadas por vendedor
    // ============================================

    // Obtener todos los vendedores
    const vendedores = await prisma.usuario.findMany({
      where: {
        rol: {
          nombre_rol: 'Vendedor',
        },
      },
      select: {
        id_usuario: true,
        nombre_completo: true,
      },
    });

    // Obtener ingresos vinculados a pedidos con sus vendedores
    const ingresosConVendedor = await prisma.movimientoFinanciero.findMany({
      where: {
        tipo_movimiento: 'ingreso',
        fecha_movimiento: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        movimientoPedidos: {
          some: {},
        },
      },
      select: {
        monto: true,
        fecha_movimiento: true,
        movimientoPedidos: {
          select: {
            pedido: {
              select: {
                id_vendedor: true,
              },
            },
          },
        },
      },
    });

    // Estructura para ventas por vendedor por mes
    const ventasPorVendedor: Record<number, Array<{ mes: string; monto: number }>> = {};

    vendedores.forEach(v => {
      ventasPorVendedor[v.id_usuario] = meses.map(m => ({ mes: m.mes, monto: 0 }));
    });

    ingresosConVendedor.forEach(ingreso => {
      const fecha = new Date(ingreso.fecha_movimiento);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      // Obtener vendedor del pedido
      if (ingreso.movimientoPedidos.length > 0) {
        const idVendedor = ingreso.movimientoPedidos[0].pedido.id_vendedor;
        
        if (ventasPorVendedor[idVendedor]) {
          const mesIndex = ventasPorVendedor[idVendedor].findIndex(m => m.mes === mesKey);
          if (mesIndex !== -1) {
            ventasPorVendedor[idVendedor][mesIndex].monto += Number(ingreso.monto);
          }
        }
      }
    });

    // Formatear datos para el gráfico
    const ventasPorVendedorChart = vendedores.map(v => ({
      nombre: v.nombre_completo,
      data: ventasPorVendedor[v.id_usuario].map(m => m.monto),
    }));

    // ============================================
    // GRÁFICO 3: Top 5 Clientes por ventas computadas
    // ============================================

    const ingresosConCliente = await prisma.movimientoFinanciero.findMany({
      where: {
        tipo_movimiento: 'ingreso',
        fecha_movimiento: {
          gte: fechaInicio,
          lte: fechaFin,
        },
        movimientoPedidos: {
          some: {},
        },
      },
      select: {
        monto: true,
        movimientoPedidos: {
          select: {
            pedido: {
              select: {
                id_cliente: true,
                cliente: {
                  select: {
                    razon_social: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Agrupar por cliente
    const ventasPorCliente: Record<number, { nombre: string; monto: number }> = {};

    ingresosConCliente.forEach(ingreso => {
      if (ingreso.movimientoPedidos.length > 0) {
        const cliente = ingreso.movimientoPedidos[0].pedido;
        if (!ventasPorCliente[cliente.id_cliente]) {
          ventasPorCliente[cliente.id_cliente] = {
            nombre: cliente.cliente.razon_social,
            monto: 0,
          };
        }
        ventasPorCliente[cliente.id_cliente].monto += Number(ingreso.monto);
      }
    });

    // Ordenar y tomar top 5
    const top5Clientes = Object.values(ventasPorCliente)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    // ============================================
    // GRÁFICO 4: Top 5 Vendedores por ventas computadas
    // ============================================

    const ventasTotalesPorVendedor: Record<number, { nombre: string; monto: number }> = {};

    vendedores.forEach(v => {
      ventasTotalesPorVendedor[v.id_usuario] = {
        nombre: v.nombre_completo,
        monto: 0,
      };
    });

    ingresosConVendedor.forEach(ingreso => {
      if (ingreso.movimientoPedidos.length > 0) {
        const idVendedor = ingreso.movimientoPedidos[0].pedido.id_vendedor;
        if (ventasTotalesPorVendedor[idVendedor]) {
          ventasTotalesPorVendedor[idVendedor].monto += Number(ingreso.monto);
        }
      }
    });

    const top5Vendedores = Object.values(ventasTotalesPorVendedor)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    // ============================================
    // RESPUESTA
    // ============================================

    return NextResponse.json({
      finanzas: {
        totalVentas: Number(totalVentas._sum.total || 0),
        ventasComputadas: Number(ventasComputadas._sum.monto || 0),
        creditosPendientes: Number(creditosPendientes._sum.saldo_pendiente || 0),
        totalGastos: Number(totalGastos._sum.monto || 0),
      },
      pedidos: {
        total: totalPedidos,
        entregados: pedidosEntregados,
        pendientes: pedidosPendientes,
        cancelados: pedidosCancelados,
      },
      graficos: {
        finanzasPorMes: {
          categorias: meses.map(m => m.mes),
          series: [
            {
              name: 'Ventas',
              data: meses.map(m => Math.round(m.ventas)),
            },
            {
              name: 'Ventas Computadas',
              data: meses.map(m => Math.round(m.ventasComputadas)),
            },
            {
              name: 'Gastos',
              data: meses.map(m => Math.round(m.gastos)),
            },
          ],
        },
        ventasPorVendedor: {
          categorias: meses.map(m => m.mes),
          series: ventasPorVendedorChart.map(v => ({
            name: v.nombre,
            data: v.data.map(d => Math.round(d)),
          })),
        },
        top5Clientes: {
          categorias: top5Clientes.map(c => c.nombre),
          data: top5Clientes.map(c => Math.round(c.monto)),
        },
        top5Vendedores: {
          categorias: top5Vendedores.map(v => v.nombre),
          data: top5Vendedores.map(v => Math.round(v.monto)),
        },
      },
    });

  } catch (err: any) {
    console.error('Error en dashboard stats:', err);
    return NextResponse.json(
      { error: err.message || 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}