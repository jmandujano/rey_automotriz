"use client";

import React, { useEffect, useState, FormEvent } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

interface ConfiguracionData {
  advertenciaStock: number;
  alertaStock: number;
  alertaPagosVencidos: number;
  habilitarNotificacionClientes: boolean;
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [config, setConfig] = useState<ConfiguracionData>({
    advertenciaStock: 0,
    alertaStock: 0,
    alertaPagosVencidos: 0,
    habilitarNotificacionClientes: true,
  });

  // Cargar configuración inicial
  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await axios.get('/api/notifications');
      setConfig(response.data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      setErrorMessage('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (config.advertenciaStock < 0 || config.alertaStock < 0) {
      setErrorMessage('Los valores de stock no pueden ser negativos');
      return;
    }

    if (config.advertenciaStock <= config.alertaStock) {
      setErrorMessage('El umbral de advertencia debe ser mayor que el umbral de alerta');
      return;
    }

    if (config.alertaPagosVencidos < 0) {
      setErrorMessage('Los días de alerta no pueden ser negativos');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      await axios.put('/api/notifications', config);
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar:', error);
      setErrorMessage('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gestiona los parámetros generales del sistema
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sección de Productos */}
        <ComponentCard title="Productos" subtitle="Configuración de umbrales de stock e inventario">
          <div className="space-y-6">
            {/* Umbral de Advertencia */}
            <div>
              <Label htmlFor="advertenciaStock">
                Umbral de Advertencia de Stock
              </Label>
              <input
                type="number"
                id="advertenciaStock"
                min={0}
                value={config.advertenciaStock}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  advertenciaStock: parseInt(e.target.value) || 0
                }))}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                placeholder="Ej: 20"
              />
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Cantidad mínima antes de mostrar advertencia de stock bajo. 
                Este valor se aplicará a todos los productos.
              </p>
            </div>

            {/* Umbral de Stock Crítico */}
            <div>
              <Label htmlFor="alertaStock">
                Umbral de Stock Crítico
              </Label>
              <input
                type="number"
                id="alertaStock"
                min={0}
                value={config.alertaStock}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  alertaStock: parseInt(e.target.value) || 0
                }))}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                placeholder="Ej: 10"
              />
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Cantidad mínima antes de mostrar alerta crítica de stock. 
                Debe ser menor que el umbral de advertencia.
              </p>
            </div>

            {/* Indicador Visual */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Estado actual de umbrales:
                  </p>
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li>• Stock &gt; {config.advertenciaStock}: Normal (verde)</li>
                    <li>• Stock entre {config.alertaStock} - {config.advertenciaStock}: Advertencia (amarillo)</li>
                    <li>• Stock ≤ {config.alertaStock}: Crítico (rojo)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ComponentCard>

        {/* Sección de Créditos */}
        <ComponentCard title="Créditos" subtitle="Configuración de notificaciones y alertas de pagos">
          <div className="space-y-6">
            {/* Notificar Créditos Pendientes */}
            <div>
              <Label htmlFor="alertaPagosVencidos">
                Notificar Créditos Pendientes (días)
              </Label>
              <input
                type="number"
                id="alertaPagosVencidos"
                min={0}
                value={config.alertaPagosVencidos}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  alertaPagosVencidos: parseInt(e.target.value) || 0
                }))}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                placeholder="Ej: 3"
              />
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Número de días antes del vencimiento para enviar alertas de pagos pendientes.
              </p>
            </div>

            {/* Habilitar Notificaciones a Clientes */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="habilitarNotificaciones">
                    Habilitar Notificaciones a Clientes
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Activa o desactiva el envío automático de notificaciones a los clientes
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({
                    ...prev,
                    habilitarNotificacionClientes: !prev.habilitarNotificacionClientes
                  }))}
                  className={`
                    relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                    ${config.habilitarNotificacionClientes ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}
                  `}
                  role="switch"
                  aria-checked={config.habilitarNotificacionClientes}
                  id="habilitarNotificaciones"
                >
                  <span
                    className={`
                      inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg
                      ${config.habilitarNotificacionClientes ? 'translate-x-8' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>

              {/* Estado del Switch */}
              <div className="mt-3">
                <span className={`
                  inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                  ${config.habilitarNotificacionClientes 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                  }
                `}>
                  <span className={`
                    w-2 h-2 rounded-full
                    ${config.habilitarNotificacionClientes ? 'bg-green-600 dark:bg-green-400' : 'bg-gray-600 dark:bg-gray-400'}
                  `} />
                  {config.habilitarNotificacionClientes ? 'Activado' : 'Desactivado'}
                </span>
              </div>
            </div>
          </div>
        </ComponentCard>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={cargarConfiguracion}
            disabled={saving}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </div>
  );
}