import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import twilio from 'twilio';

// Configuración de Twilio para WhatsApp
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken && twilioWhatsAppNumber) {
  twilioClient = twilio(accountSid, authToken);
}

/**
 * Formatea un número de teléfono para WhatsApp
 */
function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/[^\d+]/g, '');
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  return `whatsapp:${formatted}`;
}

/**
 * Formatea una fecha en formato dd/mm/yyyy
 */
function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Envía notificación de pedido por WhatsApp
 */
async function sendOrderWhatsAppNotification(
  phoneNumber: string,
  orderData: {
    nombreCliente: string;
    idPedido: number;
    productos: Array<{ codigo: string; cantidad: number; subtotal: number }>;
    total: number;
    tipoPago: string;
    cuotas?: Array<{ numero: number; monto: number; fecha: string }>;
    fechaEntrega: string;
  }
): Promise<{ success: boolean; error?: string; messageSid?: string }> {
  if (!twilioClient || !twilioWhatsAppNumber) {
    return { 
      success: false, 
      error: 'Configuración de WhatsApp no disponible' 
    };
  }

  try {
    const formattedNumber = formatPhoneNumber(phoneNumber);

    // Extraer solo el primer nombre del cliente
    //const primerNombre = orderData.nombreCliente.split(' ')[0];
	

    // Construir mensaje formal
    let message = `Hola *${orderData.nombreCliente}*\n\n`;
    message += `Su pedido se ha registrado correctamente.\n`;
    message += `📋 *Nro. Pedido:* ${orderData.idPedido}\n\n`;
    message += '📦 *PRODUCTOS:*\n';
    
    orderData.productos.forEach((prod) => {
      message += `• ${prod.codigo} x${prod.cantidad}\n`;
      message += `  Subtotal: S/ ${prod.subtotal.toFixed(2)}\n`;
    });

    message += `\n💰 *TOTAL: S/ ${orderData.total.toFixed(2)}*\n\n`;
    message += `💳 *Tipo de Pago:* ${orderData.tipoPago === 'credito' ? 'Crédito' : 'Contado'}\n`;

    if (orderData.tipoPago === 'credito' && orderData.cuotas && orderData.cuotas.length > 0) {
      message += `📅 *Cuotas:* ${orderData.cuotas.length} de S/ ${orderData.cuotas[0].monto.toFixed(2)} c/u\n`;
      message += `🗓️ *Fechas:* ${orderData.cuotas.map(c => c.fecha).join(', ')}\n`;
    }

    message += `\n📅 *Fecha de Entrega:* ${orderData.fechaEntrega}\n\n`;
    message += '¡Gracias por su preferencia!';

    console.log('📤 Enviando notificación WhatsApp a:', formattedNumber);

    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: twilioWhatsAppNumber,
      to: formattedNumber,
    });

    console.log('✅ Notificación enviadaaaaa:', twilioMessage.sid);

    return {
      success: true,
      messageSid: twilioMessage.sid,
    };

  } catch (error: any) {
    console.error('❌ Error al enviar WhatsApp:', error);
    return {
      success: false,
      error: error.message || 'Error al enviar mensaje',
    };
  }
}


/**
 * GET /api/orders
 * Returns a list of orders with client, vendor, and product details information.
 * Vendors see only their assigned orders, administrators see all orders. 
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let where: any = {};
  
  const role = await prisma.role.findUnique({ 
    where: { id_rol: Number(session.user?.roleId) } 
  });
  
  if (role?.nombre_rol?.toLowerCase() === 'vendedor') {
    where.id_vendedor = Number(session.user.id);
  }

  const orders = await prisma.pedido.findMany({
    where,
    include: {
      cliente: true,
      vendedor: { 
        select: { 
          id_usuario: true, 
          nombre_completo: true 
        } 
      },
      detalles: {
        include: {
          producto: {
            select: {
              id_producto: true,
              codigo_producto: true,
              descripcion: true
            }
          }
        }
      }
    },
    orderBy: { id_pedido: 'desc' },
  });

  return NextResponse.json(orders);
}

/**
 * POST /api/orders
 * Creates a new order with one or more items and handles payment installments.
 * 
 * Request body:
 * {
 *   numero_comprobante: string,
 *   tipo_comprobante: string ('boleta' | 'factura' | 'guia'),
 *   id_cliente: number,
 *   id_vendedor: number,
 *   tipo_pago: string ('contado' | 'credito'),
 *   fecha_entrega: string (ISO date),
 *   observaciones?: string,
 *   fecha_pago_programada?: string (ISO date, required for 'contado'),
 *   pago_inicial?: number (required for 'credito'),
 *   tipo_credito?: number (7 | 10 | 15 | 30, required for 'credito'),
 *   nro_cuotas?: number (required for 'credito'),
 *   fechas_pago?: string[] (array of ISO dates, required for 'credito'),
 *   items: Array<{
 *     id_producto: number,
 *     id_importacion: number,
 *     cantidad: number,
 *     precio_seleccionado: 'a' | 'b' | 'otro',
 *     precio_personalizado?: number,
 *   }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await req.json();
    const { 
      numero_comprobante,
      tipo_comprobante,
      id_cliente, 
      id_vendedor, 
      tipo_pago, 
      fecha_entrega,
      items, 
      observaciones,
      fecha_pago_programada,
      pago_inicial,
      tipo_credito,
      nro_cuotas,
      fechas_pago
    } = data;

    // Validaciones básicas
    if (!tipo_comprobante || !id_cliente || !id_vendedor || 
        !tipo_pago || !fecha_entrega || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Datos incompletos. Debe proporcionar todos los campos requeridos y al menos un producto.' 
      }, { status: 400 });
    }

    // Validar fecha de entrega
    const fechaEntrega = new Date(fecha_entrega);
    const fechaActual = new Date();
    
		
	//fechaEntrega.setHours(0, 0, 0, 0);
	fechaActual.setHours(-5, 0, 0, 0);
	
	//console.log("fecha entrega: ", fechaEntrega);
	//console.log("fecha actual: ", fechaActual);

    if (fechaEntrega < fechaActual) {
      return NextResponse.json({ 
        error: 'La fecha de entrega no puede ser menor a la fecha actual '
      }, { status: 400 });
    }

    // Validar tipo de comprobante
    if (!['boleta', 'factura', 'guia'].includes(tipo_comprobante.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Tipo de comprobante inválido' 
      }, { status: 400 });
    }

    // Validar tipo de pago
    if (!['contado', 'credito'].includes(tipo_pago.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Tipo de pago inválido' 
      }, { status: 400 });
    }

    // Validaciones específicas por tipo de pago
    if (tipo_pago.toLowerCase() === 'contado') {
      if (!fecha_pago_programada) {
        return NextResponse.json({ 
          error: 'Debe proporcionar la fecha de pago programada para pagos al contado' 
        }, { status: 400 });
      }
    } else if (tipo_pago.toLowerCase() === 'credito') {
      if (pago_inicial === undefined || pago_inicial === null) {
        return NextResponse.json({ 
          error: 'Debe proporcionar el pago inicial para pagos a crédito' 
        }, { status: 400 });
      }
      /*if (!tipo_credito || ![7, 10, 15, 30].includes(Number(tipo_credito))) {
        return NextResponse.json({ 
          error: 'Tipo de crédito inválido. Debe ser 7, 10, 15 o 30 días' 
        }, { status: 400 });
      }*/
      if (!nro_cuotas || nro_cuotas <= 0) {
        return NextResponse.json({ 
          error: 'Debe proporcionar un número válido de cuotas' 
        }, { status: 400 });
      }
      if (!Array.isArray(fechas_pago) || fechas_pago.length !== nro_cuotas) {
        return NextResponse.json({ 
          error: 'Debe proporcionar las fechas de pago correspondientes a cada cuota' 
        }, { status: 400 });
      }
      
      // NOTA: fechas_pago[0] será ignorado porque la primera cuota usará fecha_entrega
      // fechas_pago[1] será la fecha de la segunda cuota, fechas_pago[2] la tercera, etc.

      // Validar número máximo de cuotas según tipo de crédito
      const maxCuotas = {
        7: 4,
        10: 3,
        15: 2,
        30: 1
      }[Number(tipo_credito)];

      /*if (nro_cuotas > maxCuotas) {
        return NextResponse.json({ 
          error: `El número de cuotas excede el máximo permitido (${maxCuotas}) para crédito de ${tipo_credito} días` 
        }, { status: 400 });
      }*/
    }

    // Procesar items y calcular totales
    let total = 0;
    const detalles: any[] = [];

    for (const item of items) {
      if (!item.id_producto || !item.id_importacion || !item.cantidad || 
          item.cantidad <= 0 || !item.precio_seleccionado) {
        return NextResponse.json({ 
          error: 'Datos de producto incompletos o inválidos' 
        }, { status: 400 });
      }

      const producto = await prisma.producto.findUnique({
        where: { id_producto: item.id_producto }
      });

      const importacion = await prisma.productoImportacion.findFirst({
        where: { 
          id_importacion: item.id_importacion,
          id_producto: item.id_producto,
          estado_importacion: 'activa'
        }
      });

      if (!producto || !importacion) {
        return NextResponse.json({ 
          error: `Producto o importación no encontrada para el producto ${item.id_producto}` 
        }, { status: 400 });
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
        if (!importacion.precio_venta_comision_b || !importacion.precio_venta_b || !importacion.comision_b) {
          return NextResponse.json({ 
            error: `El producto ${producto.descripcion} no tiene precio B configurado` 
          }, { status: 400 });
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
          return NextResponse.json({ 
            error: `Debe proporcionar un precio personalizado válido para el producto ${producto.descripcion}` 
          }, { status: 400 });
        }

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
          return NextResponse.json({
            error: `El producto ${producto.descripcion} no tiene precios configurados`,
          }, { status: 400 });
        }

        const minPrice = Math.min(...opciones.map((o) => o.precioVentaComision));
        if (precioPersonalizado < minPrice) {
          return NextResponse.json({
            error: `El precio ingresado para el producto ${producto.descripcion} es menor al precio mínimo permitido (S/ ${minPrice.toFixed(2)})`,
          }, { status: 400 });
        }

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
        return NextResponse.json({ 
          error: 'Precio seleccionado inválido. Debe ser "a", "b" o "otro"' 
        }, { status: 400 });
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
        id_producto: item.id_producto,
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

    // Validaciones adicionales para crédito
    if (tipo_pago.toLowerCase() === 'credito') {
      if (Number(pago_inicial) >= total) {
        return NextResponse.json({ 
          error: 'El pago inicial debe ser menor al total del pedido' 
        }, { status: 400 });
      }
    }

    // Crear el pedido en una transacción
    const order = await prisma.$transaction(async (tx) => {
      // Preparar datos del pedido
      const pedidoData: any = {
        numero_comprobante: numero_comprobante,
        tipo_comprobante: tipo_comprobante,
        id_cliente: Number(id_cliente),
        id_vendedor: Number(id_vendedor),
        tipo_pago: tipo_pago,
        fecha_entrega: new Date(fecha_entrega),
        subtotal: 0,
        igv: 0,
        total: total,
		estado_pago: 'pendiente',
        observaciones: observaciones || null,
        id_usuario_creacion: Number(session.user.id),
        detalles: {
          create: detalles,
        },
      };

      // Agregar campos específicos según tipo de pago
      if (tipo_pago.toLowerCase() === 'credito') {
        pedidoData.pago_inicial = Number(pago_inicial);
        //pedidoData.estado_pago = 'pendiente';
      }

      // Crear el pedido
      const nuevoPedido = await tx.pedido.create({
        data: pedidoData,
        include: {
          detalles: {
            include: {
              producto: {
                select: {
                  id_producto: true,
                  codigo_producto: true,
                  descripcion: true
                }
              }
            }
          },
          cliente: true,
          vendedor: {
            select: {
              id_usuario: true,
              nombre_completo: true
            }
          }
        },
      });

      // Crear cuota única si es pago contado
      console.log('🔍 tipo_pago:', JSON.stringify(tipo_pago), '| fecha_pago_programada:', JSON.stringify(fecha_pago_programada));
      if (tipo_pago.toLowerCase().trim() === 'contado' && fecha_pago_programada) {
        console.log('💰 Creando cuota contado - id_pedido:', nuevoPedido.id_pedido, 'total:', total, 'fecha:', fecha_pago_programada);
        const cuotaContado = await tx.pedido_cuotas.create({
          data: {
            id_pedido: nuevoPedido.id_pedido,
            numero_cuota: 1,
            monto_cuota: total,
            saldo_pendiente: total,
            estado_pago: 'pendiente',
            fecha_pago_programada: new Date(fecha_pago_programada),
          }
        });
        console.log('✅ Cuota contado creada:', cuotaContado.id_cuota);
      }

      // Crear cuotas si es pago a crédito
      if (tipo_pago.toLowerCase() === 'credito' && fechas_pago && Array.isArray(fechas_pago)) {

        const saldo_pendiente_pedido = total - Number(pago_inicial);
        const monto_cuota = saldo_pendiente_pedido / nro_cuotas;
		
		

        for (let i = 0; i < nro_cuotas; i++) {
          await tx.pedido_cuotas.create({
            data: {
              id_pedido: nuevoPedido.id_pedido,
              numero_cuota: i + 1,
              monto_cuota: monto_cuota,
              saldo_pendiente: monto_cuota,
              estado_pago: 'pendiente',
              // La primera cuota (i=0) usa fecha_entrega, las demás (i>0) usan fechas_pago[i] (ignorando fechas_pago[0])
              fecha_pago_programada: i === 0 ? new Date(fecha_entrega) : new Date(fechas_pago[i]),
              fecha_creacion: new Date(),
            }
          });
        }
      }

      // Actualizar el stock de cada producto
      for (const item of items) {
        await tx.producto.update({
          where: { id_producto: item.id_producto },
          data: {
            stock: {
              decrement: item.cantidad
            }
          }
        });
      }

      return nuevoPedido;
    });

    // Enviar notificación por WhatsApp
    let whatsappResult = null;
    let whatsappWarning = null;

    if (order.cliente?.telefono_principal) {
      // Preparar datos de las cuotas si es crédito
      let cuotasData: Array<{ numero: number; monto: number; fecha: string }> | undefined;
      
      if (tipo_pago.toLowerCase() === 'credito') {
        const cuotasCreadas = await prisma.pedido_cuotas.findMany({
          where: { id_pedido: order.id_pedido },
          orderBy: { numero_cuota: 'asc' }
        });

        cuotasData = cuotasCreadas.map(cuota => ({
          numero: cuota.numero_cuota,
          monto: Number(cuota.monto_cuota),
          fecha: formatDate(cuota.fecha_pago_programada)
        }));
      }

      // Preparar datos de productos
      const productosData = order.detalles.map(detalle => ({
        codigo: detalle.producto.codigo_producto,
        cantidad: Number(detalle.cantidad),
        subtotal: Number(detalle.subtotal_venta_comision)
      }));

      // Enviar WhatsApp
      whatsappResult = await sendOrderWhatsAppNotification(
        order.cliente.telefono_principal,
        {
          nombreCliente: order.cliente.razon_social,
          idPedido: order.id_pedido,
          productos: productosData,
          total: Number(order.total),
          tipoPago: order.tipo_pago,
          cuotas: cuotasData,
          fechaEntrega: formatDate(order.fecha_entrega)
        }
      );

      if (!whatsappResult.success) {
        whatsappWarning = `Pedido creado exitosamente, pero no se pudo enviar la notificación por WhatsApp: ${whatsappResult.error}`;
        console.warn('⚠️ WhatsApp no enviado:', whatsappResult.error);
      } else {
        console.log('✅ WhatsApp enviado correctamente');
      }
    } else {
      whatsappWarning = 'Pedido creado exitosamente, pero el cliente no tiene un número de teléfono registrado para enviar WhatsApp';
      console.warn('⚠️ Cliente sin teléfono:', order.id_cliente);
    }

    // Retornar respuesta con información del pedido y estado de WhatsApp
    return NextResponse.json({
      ...order,
      whatsapp: {
        sent: whatsappResult?.success || false,
        messageSid: whatsappResult?.messageSid,
        warning: whatsappWarning
      }
    }, { status: 201 });
  } catch (err: any) {
    console.error('Error al crear pedido:', err);
    return NextResponse.json({ 
      error: err.message || 'Error al crear pedido' 
    }, { status: 500 });
  }
}