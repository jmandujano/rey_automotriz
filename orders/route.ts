import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * API endpoint for the sales orders report.  Provides aggregated metrics and a
 * detailed list of orders, including payment information.  Supports filtering
 * by date range, seller and client as specified in FRD módulo 6【250385542692500†L1290-L1349】.
 */

// Helper to parse optional number query parameters
function parseOptionalInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
}

// GET /api/reports/orders
// Query parameters:
//   startDate: ISO date string (inclusive)
//   endDate: ISO date string (inclusive)
//   vendedor: id_usuario (number)
//   cliente: id_cliente (number)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  const vendedorId = parseOptionalInt(searchParams.get('vendedor'));
  const clienteId = parseOptionalInt(searchParams.get('cliente'));
  let dateFilter: any = {};
  if (startDateStr) {
    dateFilter.gte = new Date(startDateStr);
  }
  if (endDateStr) {
    // Add one day to include end date fully
    const end = new Date(endDateStr);
    end.setDate(end.getDate() + 1);
    dateFilter.lte = end;
  }
  const where: any = {};
  if (Object.keys(dateFilter).length > 0) {
    where.fecha_creacion = dateFilter;
  }
  if (vendedorId !== undefined) {
    where.id_vendedor = vendedorId;
  }
  if (clienteId !== undefined) {
    where.id_cliente = clienteId;
  }
  // Fetch orders with payments, client and seller names
  const orders = await prisma.pedido.findMany({
    where,
    include: {
      cliente: { select: { id_cliente: true, nombre_completo: true } },
      vendedor: { select: { id_usuario: true, nombre_completo: true } },
      pagos: true,
    },
    orderBy: { id_pedido: 'desc' },
  });
  // Compute metrics
  let totalPedidos = 0;
  let montoTotal = 0;
  let montoPagado = 0;
  let montoPendiente = 0;
  const listado = orders.map((pedido) => {
    totalPedidos++;
    const total = Number(pedido.total);
    montoTotal += total;
    // Sum of pagos.monto_pagado
    const pagado = pedido.pagos.reduce((sum, pago) => sum + Number(pago.monto_pagado), 0);
    montoPagado += pagado;
    const pendiente = total - pagado;
    montoPendiente += pendiente;
    return {
      id_pedido: pedido.id_pedido,
      fecha: pedido.fecha_creacion,
      vendedor: pedido.vendedor?.nombre_completo ?? 'N/A',
      cliente: pedido.cliente?.nombre_completo ?? 'N/A',
      tipo_pago: pedido.tipo_pago,
      tipo_comprobante: pedido.tipo_comprobante,
      total,
      pagado,
      pendiente,
    };
  });
  const response = {
    totalPedidos,
    montoTotal,
    montoPagado,
    montoPendiente,
    pedidos: listado,
  };
  return NextResponse.json(response);
}
