// app/api/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/[^\d+]/g, '');
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  return `whatsapp:${formatted}`;
}

export async function POST(request: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !twilioWhatsAppNumber) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno de Twilio' },
      { status: 500 }
    );
  }

  const client = twilio(accountSid, authToken);

  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Número de teléfono y mensaje son requeridos' },
        { status: 400 }
      );
    }

    const formattedNumber = formatPhoneNumber(to);

    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioWhatsAppNumber,
      to: formattedNumber,
    });

    return NextResponse.json({
      success: true,
      messageSid: twilioMessage.sid,
      status: twilioMessage.status,
      to: formattedNumber,
    });

  } catch (error: any) {
    console.error('Error detallado:', error);

    if (error.code === 21606) {
      return NextResponse.json(
        {
          error: 'El destinatario no está registrado en el WhatsApp Sandbox. Debe enviar "join <código>" primero.',
          code: 'NOT_JOINED_SANDBOX'
        },
        { status: 400 }
      );
    }

    if (error.message?.includes('same To and From')) {
      return NextResponse.json(
        {
          error: 'No puedes enviar mensajes a tu propio número registrado. Usa un número diferente.',
          code: 'SAME_TO_FROM'
        },
        { status: 400 }
      );
    }

    if (error.code === 21211) {
      return NextResponse.json(
        {
          error: 'Número de teléfono inválido o no registrado en WhatsApp',
          code: 'INVALID_PHONE'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
