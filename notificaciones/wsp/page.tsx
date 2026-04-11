'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface WhatsAppFormData {
  phoneNumber: string;
  message: string;
}

export default function WhatsAppNotificationPage() {
  const [formData, setFormData] = useState<WhatsAppFormData>({
    phoneNumber: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [registeredNumber, setRegisteredNumber] = useState<string | null>(null);

  // Obtener el número registrado en Twilio (opcional)
  useEffect(() => {
    // Puedes guardarlo en una variable de entorno o fetch desde tu API
    const twilioRegisteredNumber = process.env.NEXT_PUBLIC_TWILIO_REGISTERED_NUMBER;
    if (twilioRegisteredNumber) {
      setRegisteredNumber(twilioRegisteredNumber);
    }
  }, []);

  const normalizePhoneNumber = (phone: string): string => {
    // Remover espacios, guiones y paréntesis
    return phone.replace(/[\s\-\(\)]/g, '');
  };

  const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
    const normalized = normalizePhoneNumber(phone);

    // Validar formato E.164
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(normalized)) {
      return {
        valid: false,
        error: 'Formato inválido. Usa formato internacional (+51987654321)'
      };
    }

    // Validar que no sea el mismo número registrado
    if (registeredNumber && normalizePhoneNumber(registeredNumber) === normalized) {
      return {
        valid: false,
        error: 'No puedes enviar mensajes a tu propio número registrado en Twilio'
      };
    }

    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.phoneNumber.trim() || !formData.message.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    // Validar número de teléfono
    const validation = validatePhoneNumber(formData.phoneNumber);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/notifications/wsp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.phoneNumber,
          message: formData.message
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejo específico de errores
        if (data.error?.includes('same To and From')) {
          throw new Error('No puedes enviar mensajes a tu propio número. Usa otro número diferente.');
        }
        throw new Error(data.error || 'Error al enviar mensaje');
      }

      toast.success('¡Mensaje enviado exitosamente!');
      
      // Limpiar formulario
      setFormData({
        phoneNumber: '',
        message: ''
      });

    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar mensaje');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Enviar Notificación WhatsApp
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Envía mensajes directamente a WhatsApp de tus clientes
          </p>
          
          {/* Alerta informativa */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Modo Sandbox Activado</p>
                <p className="mt-1">El destinatario debe haber enviado <code className="bg-blue-100 px-1 rounded">join &lt;código&gt;</code> al número de Twilio para recibir mensajes.</p>
                <p className="mt-1 text-xs">No puedes enviar mensajes al número que registraste en Twilio.</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Número de Teléfono */}
          <div>
            <label 
              htmlFor="phoneNumber" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Número de Teléfono del Destinatario
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ 
                ...formData, 
                phoneNumber: e.target.value 
              })}
              placeholder="+51987654321"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Incluye el código de país (ej: +51 para Perú)
            </p>
            {registeredNumber && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ No uses: {registeredNumber} (tu número registrado)
              </p>
            )}
          </div>

          {/* Campo Mensaje */}
          <div>
            <label 
              htmlFor="message" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Mensaje
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ 
                ...formData, 
                message: e.target.value 
              })}
              placeholder="Escribe tu mensaje aquí..."
              rows={6}
              maxLength={1600}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">
                Máximo 1600 caracteres
              </p>
              <p className="text-xs text-gray-500">
                {formData.message.length}/1600
              </p>
            </div>
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg 
                  className="animate-spin h-5 w-5 text-white" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24"
                >
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Enviando...
              </>
            ) : (
              <>
                <svg 
                  className="w-5 h-5" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Enviar Mensaje WhatsApp
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}