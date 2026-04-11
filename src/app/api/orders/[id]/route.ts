import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Helper to convert Prisma Decimal and BigInt to plain JS numbers
function toPlain<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => {
      if (v && typeof v === 'object' && typeof (v as any).toFixed === 'function') {
        return Number(v);
      }
      if (typeof v === 'bigint') return Number(v);
      return v;
    }),
  );
}

/**
 * GET /api/orders/[id]
 *
 * Returns a single order with its client, seller, details and payment schedule.
 * Augments each detail with the active importation id for the corresponding product.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const idNum = Number(id);
  if (Number.isNaN(idNum)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const order = await prisma.pedido.findUnique({
      where: { id_pedido: idNum },
      include: {
        cliente: true,
        vendedor: {
          select: {
            id_usuario: true,
            nombre_completo: true,
          },
        },
        detalles: {
          include: {
            producto: true,
          },
        },
        cuotas: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }
    // Augment each detail with the active importation id (if any)
    const detalles = await Promise.all(
      order.detalles.map(async (detail) => {
        const imp = await prisma.productoImportacion.findFirst({
          where: {
            id_producto: detail.id_producto,
            estado_importacion: 'activa',
          },
          select: { id_importacion: true },
        });
        return {
          ...detail,
          id_importacion: imp?.id_importacion ?? null,
        };
      }),
    );
    return NextResponse.json(toPlain({ ...order, detalles }));
  } catch (err: any) {
    console.error('Error en GET /api/orders/[id]:', err);
    return NextResponse.json(
      { error: 'Error al obtener el pedido', details: err.message },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/orders/[id]
 *
 * Updates an existing order. Supports updating the basic order data, items and credit schedule.
 * It recalculates totals and commission based pricing similarly to the POST route. It also
 * adjusts product stock based on quantity changes.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const idNum = Number(id);
  if (Number.isNaN(idNum)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const data = await req.json();
    const {
      tipo_comprobante,
      id_cliente,
      id_vendedor,
	  estado_actual,
      tipo_pago,
      fecha_entrega,
      observaciones,
      fecha_pago_programada,
      pago_inicial,
      tipo_credito,
      nro_cuotas,
      fechas_pago,
      items,
    } = data;

    // Basic validations
    if (
      !tipo_comprobante ||
      !id_cliente ||
      !id_vendedor ||
      !tipo_pago ||
      !fecha_entrega ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'Datos incompletos. Debe proporcionar todos los campos requeridos y al menos un producto.',
        },
        { status: 400 },
      );
    }

    // Validate date
    const fechaEntrega = new Date(fecha_entrega);
    const fechaActual = new Date();
    // Adjust timezone for America/Lima (UTC-5)
    fechaActual.setHours(-5, 0, 0, 0);
    if (fechaEntrega < fechaActual) {
      return NextResponse.json(
        {
          error: 'La fecha de entrega no puede ser menor a la fecha actual',
        },
        { status: 400 },
      );
    }

    // Validate comprobante
    if (!['boleta', 'factura', 'guia'].includes(String(tipo_comprobante).toLowerCase())) {
      return NextResponse.json(
        { error: 'Tipo de comprobante inválido' },
        { status: 400 },
      );
    }

    // Validate payment type
    if (!['contado', 'credito'].includes(String(tipo_pago).toLowerCase())) {
      return NextResponse.json(
        { error: 'Tipo de pago inválido' },
        { status: 400 },
      );
    }

    // Payment specific validations
    if (String(tipo_pago).toLowerCase() === 'contado') {
      if (!fecha_pago_programada) {
        return NextResponse.json(
          { error: 'Debe proporcionar la fecha de pago programada para pagos al contado' },
          { status: 400 },
        );
      }
    } else if (String(tipo_pago).toLowerCase() === 'credito') {
      if (pago_inicial === undefined || pago_inicial === null) {
        return NextResponse.json(
          { error: 'Debe proporcionar el pago inicial para pagos a crédito' },
          { status: 400 },
        );
      }
      /*if (!tipo_credito || ![7, 10, 15, 30].includes(Number(tipo_credito))) {
        return NextResponse.json(
          {
            error:
              'Tipo de crédito inválido. Debe ser 7, 10, 15 o 30 días',
          },
          { status: 400 },
        );
      }*/
      if (!nro_cuotas || nro_cuotas <= 0) {
        return NextResponse.json(
          { error: 'Debe proporcionar un número válido de cuotas' },
          { status: 400 },
        );
      }
      if (!Array.isArray(fechas_pago) || fechas_pago.length !== nro_cuotas) {
        return NextResponse.json(
          {
            error: 'Debe proporcionar las fechas de pago correspondientes a cada cuota',
          },
          { status: 400 },
        );
      }
      // Maximum quotas by credit type
      const maxCuotas = { 7: 4, 10: 3, 15: 2, 30: 1 }[Number(tipo_credito)];
      /*if (nro_cuotas > maxCuotas) {
        return NextResponse.json(
          {
            error: `El número de cuotas excede el máximo permitido (${maxCuotas}) para crédito de ${tipo_credito} días`,
          },
          { status: 400 },
        );
      }*/
    }

    // Process items and calculate totals using logic similar to POST
    let total = 0;
    const detalles: any[] = [];
    for (const item of items) {
      if (
        !item.id_producto ||
        !item.id_importacion ||
        !item.cantidad ||
        item.cantidad <= 0 ||
        !item.precio_seleccionado
      ) {
        return NextResponse.json(
          { error: 'Datos de producto incompletos o inválidos' },
          { status: 400 },
        );
      }

      const producto = await prisma.producto.findUnique({
        where: { id_producto: Number(item.id_producto) },
      });
      const importacion = await prisma.productoImportacion.findFirst({
        where: {
          id_importacion: Number(item.id_importacion),
          id_producto: Number(item.id_producto),
        },
      });
      if (!producto || !importacion) {
        return NextResponse.json(
          {
            error: `Producto o importación no encontrada para el producto ${item.id_producto}`,
          },
          { status: 400 },
        );
      }

      const precio_seleccionado = String(item.precio_seleccionado).toLowerCase();
      let precio_venta_comision: number;
      let precio_venta: number;
      let comision: number;
      const precio_compra = Number(importacion.precio_compra);
      const cantidad = Number(item.cantidad);
      if (precio_seleccionado === 'a') {
        precio_venta_comision = Number(importacion.precio_venta_comision_a);
        precio_venta = Number(importacion.precio_venta_a);
        comision = Number(importacion.comision_a);
      } else if (precio_seleccionado === 'b') {
        if (
          !importacion.precio_venta_comision_b ||
          !importacion.precio_venta_b ||
          !importacion.comision_b
        ) {
          return NextResponse.json(
            { error: `El producto ${producto.descripcion} no tiene precio B configurado` },
            { status: 400 },
          );
        }
        precio_venta_comision = Number(importacion.precio_venta_comision_b);
        precio_venta = Number(importacion.precio_venta_b);
        comision = Number(importacion.comision_b);
      
	  } else if (precio_seleccionado === 'c') {
        if (!importacion.precio_venta_comision_c || !importacion.precio_venta_c || !importacion.comision_c) {
          return NextResponse.json({ 
            error: `El producto ${producto.descripcion} no tiene precio C configurado` 
          }, { status: 400 });
        }
        precio_venta_comision = Number(importacion.precio_venta_comision_c);
        precio_venta = Number(importacion.precio_venta_c);
        comision = Number(importacion.comision_c);
	  
	  } else if (precio_seleccionado === 'd') {
        if (!importacion.precio_venta_comision_d || !importacion.precio_venta_d || !importacion.comision_d) {
          return NextResponse.json({ 
            error: `El producto ${producto.descripcion} no tiene precio D configurado` 
          }, { status: 400 });
        }
        precio_venta_comision = Number(importacion.precio_venta_comision_d);
        precio_venta = Number(importacion.precio_venta_d);
        comision = Number(importacion.comision_d);
	  
	  } else if (precio_seleccionado === 'otro') {
        const precioPersonalizado = Number(item.precio_personalizado);
        if (!precioPersonalizado || isNaN(precioPersonalizado) || precioPersonalizado <= 0) {
          return NextResponse.json(
            {
              error: `Debe proporcionar un precio personalizado válido para el producto ${producto.descripcion}`,
            },
            { status: 400 },
          );
        }
        // Build list of all available commission price options
        const opciones: { letra: string; precioVentaComision: number; precioVenta: number; comision: number }[] = [];
        const letras = ['a', 'b', 'c', 'd', 'e', 'f'];
        for (const letra of letras) {
          const precioComKey = `precio_venta_comision_${letra}` as keyof typeof importacion;
          const precioKey = `precio_venta_${letra}` as keyof typeof importacion;
          const comisionKey = `comision_${letra}` as keyof typeof importacion;
          const precioComVal: any = (importacion as any)[precioComKey];
          const precioVal: any = (importacion as any)[precioKey];
          const comVal: any = (importacion as any)[comisionKey];
          if (precioComVal != null && precioVal != null) {
            opciones.push({
              letra: letra,
              precioVentaComision: Number(precioComVal),
              precioVenta: Number(precioVal),
              comision: comVal != null ? Number(comVal) : 0,
            });
          }
        }
        if (opciones.length === 0) {
          return NextResponse.json(
            { error: `El producto ${producto.descripcion} no tiene precios configurados` },
            { status: 400 },
          );
        }
        /*const minPrice = Math.min(...opciones.map((o) => o.precioVentaComision));
        if (precioPersonalizado < minPrice) {
          return NextResponse.json(
            {
              error: `El precio ingresado para el producto ${producto.descripcion} es menor al precio mínimo permitido (S/ ${minPrice.toFixed(2)})`,
            },
            { status: 400 },
          );
        }*/
        // Find the closest option to the personalized price to derive base price and commission
        let closest = opciones[0];
        let minDiff = Math.abs(precioPersonalizado - opciones[0].precioVentaComision);
        for (const opc of opciones) {
          const diff = Math.abs(precioPersonalizado - opc.precioVentaComision);
          if (diff < minDiff) {
            closest = opc;
            minDiff = diff;
          }
        }
        precio_venta = (closest.precioVenta * precioPersonalizado) / closest.precioVentaComision;
        precio_venta_comision = precioPersonalizado;
        comision = ((precio_venta_comision - precio_venta) / precio_venta) * 100;
      } else {
        return NextResponse.json(
          { error: 'Precio seleccionado inválido. Debe ser "a", "b", "c", "d" o "otro"' },
          { status: 400 },
        );
      }
      const subtotal_compra = precio_compra * cantidad;
      const subtotal_venta = precio_venta * cantidad;
      const subtotal_venta_comision = precio_venta_comision * cantidad;
      let subtotal_monto_comision: number;
      if (precio_seleccionado === 'otro') {
        subtotal_monto_comision = subtotal_venta_comision - subtotal_venta;
      } else {
        subtotal_monto_comision = subtotal_venta_comision * (comision / 100);
      }
      detalles.push({
        id_producto: Number(item.id_producto),
        cantidad: cantidad,
        comision: comision,
        precio_compra: precio_compra,
        precio_venta: precio_venta,
        precio_venta_comision: precio_venta_comision,
        subtotal_compra: subtotal_compra,
        subtotal_venta: subtotal_venta,
        subtotal_venta_comision: subtotal_venta_comision,
        subtotal_monto_comision: subtotal_monto_comision,
      });
      total += subtotal_venta_comision;
    }

    // Additional validation for credit
    if (String(tipo_pago).toLowerCase() === 'credito') {
      if (Number(pago_inicial) >= total) {
        return NextResponse.json(
          { error: 'El pago inicial debe ser menor al total del pedido' },
          { status: 400 },
        );
      }
    }

    // Fetch existing details for stock adjustment
    const existingDetails = await prisma.pedidoDetalle.findMany({
      where: { id_pedido: idNum },
    });

    // Build map of new quantities per product
    const newQtyMap: Record<number, number> = {};
    for (const item of items) {
      const pid = Number(item.id_producto);
      const qty = Number(item.cantidad);
      newQtyMap[pid] = (newQtyMap[pid] || 0) + qty;
    }

    // Start transaction to update order and adjust stock
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Adjust stock based on differences
      // Decrease or increase stock depending on quantity changes
      for (const detail of existingDetails) {
        const pid = detail.id_producto;
        const oldQty = Number(detail.cantidad);
        const newQty = newQtyMap[pid] ?? 0;
        const diff = newQty - oldQty;
        if (diff !== 0) {
          if (diff > 0) {
            // need to decrease stock by the extra quantity ordered
            await tx.producto.update({
              where: { id_producto: pid },
              data: { stock: { decrement: diff } },
            });
          } else {
            // quantity reduced, restore stock
            await tx.producto.update({
              where: { id_producto: pid },
              data: { stock: { increment: -diff } },
            });
          }
        }
        // Mark as processed so leftover new items can be handled later
        newQtyMap[pid] = undefined as any;
      }
      // For new items not present in existingDetails, decrement stock by their quantity
      for (const [pidStr, qty] of Object.entries(newQtyMap)) {
        if (qty && qty > 0) {
          const pid = Number(pidStr);
          await tx.producto.update({
            where: { id_producto: pid },
            data: { stock: { decrement: qty } },
          });
        }
      }
      // Delete existing details and quotas
      await tx.pedidoDetalle.deleteMany({ where: { id_pedido: idNum } });
      await tx.pedido_cuotas.deleteMany({ where: { id_pedido: idNum } });
      // Prepare data for order update
      const pedidoData: any = {
        tipo_comprobante: String(tipo_comprobante),
        id_cliente: Number(id_cliente),
        id_vendedor: Number(id_vendedor),
		estado_actual: String(estado_actual),
        tipo_pago: String(tipo_pago),
        fecha_entrega: new Date(fecha_entrega),
        total: total,
        observaciones: observaciones || null,
        id_usuario_ultima_actualizacion: Number(session.user.id),
      };
      if (String(tipo_pago).toLowerCase() === 'credito') {
        pedidoData.pago_inicial = Number(pago_inicial);
      } else {
        pedidoData.pago_inicial = null;
      }
      // Establecer estado_pago como pendiente para ambos tipos de pago
      pedidoData.estado_pago = 'pendiente';
      await tx.pedido.update({ where: { id_pedido: idNum }, data: pedidoData });
      // Create new details
      for (const det of detalles) {
        await tx.pedidoDetalle.create({ data: { id_pedido: idNum, ...det } });
      }
      // Create payment schedule if credit
      if (String(tipo_pago).toLowerCase() === 'credito' && fechas_pago && Array.isArray(fechas_pago)) {
        const saldo_pendiente_pedido = total - Number(pago_inicial);
        const monto_cuota = saldo_pendiente_pedido / Number(nro_cuotas);
        for (let i = 0; i < Number(nro_cuotas); i++) {
          await tx.pedido_cuotas.create({
            data: {
              id_pedido: idNum,
              numero_cuota: i + 1,
              monto_cuota: monto_cuota,
              saldo_pendiente: monto_cuota,
              estado_pago: 'pendiente',
              // La primera cuota usa fecha_entrega, las demás usan fechas_pago
              fecha_pago_programada: i === 0 ? new Date(fecha_entrega) : new Date(fechas_pago[i]),
              fecha_creacion: new Date(),
            },
          });
        }
      }
      // Fetch and return updated order with relations
      return await tx.pedido.findUnique({
        where: { id_pedido: idNum },
        include: {
          cliente: true,
          vendedor: {
            select: {
              id_usuario: true,
              nombre_completo: true,
            },
          },
          detalles: {
            include: { producto: true },
          },
          cuotas: true,
        },
      });
    });
    return NextResponse.json(toPlain(updatedOrder));
  } catch (err: any) {
    console.error('Error en PUT /api/orders/[id]:', err);
    return NextResponse.json(
      { error: 'Error al actualizar el pedido', details: err.message },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/orders/[id]
 *
 * Deletes an existing order and restores product stock accordingly. It also
 * removes related details and payment schedules.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const idNum = Number(id);
  if (Number.isNaN(idNum)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const existingDetails = await prisma.pedidoDetalle.findMany({ where: { id_pedido: idNum } });
    await prisma.$transaction(async (tx) => {
      // Restore stock by adding back quantities from existing details
      for (const detail of existingDetails) {
        await tx.producto.update({
          where: { id_producto: detail.id_producto },
          data: { stock: { increment: Number(detail.cantidad) } },
        });
      }
      // Delete payment schedule and details
      await tx.pedido_cuotas.deleteMany({ where: { id_pedido: idNum } });
      await tx.pedidoDetalle.deleteMany({ where: { id_pedido: idNum } });
      // Delete the order itself
      await tx.pedido.delete({ where: { id_pedido: idNum } });
    });
    return NextResponse.json({ message: 'Pedido eliminado' }, { status: 200 });
  } catch (err: any) {
    console.error('Error en DELETE /api/orders/[id]:', err);
    return NextResponse.json(
      { error: 'Error al eliminar el pedido', details: err.message },
      { status: 500 },
    );
  }
}