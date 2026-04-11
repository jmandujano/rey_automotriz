"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Image from "next/image";

interface Cliente {
  razon_social: string;
  ruc?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  telefono_principal?: string | null;
}

interface Vendedor {
  id_usuario: number;
  nombre_completo: string;
}

interface PedidoDetalle {
  cantidad: number;
  precio_venta_comision: number;
  subtotal_venta_comision: number;
  producto: {
    codigo_producto: string;
    descripcion: string;
  };
}

interface Cuota {
  numero_cuota: number;
  fecha_pago_programada: string;
  monto_cuota: number;
  estado_pago: string;
}

interface Pedido {
  id_pedido: number;
  tipo_pago: string;
  tipo_comprobante: string;
  total: number;
  pago_inicial?: number | null;
  fecha_entrega: string;
  observaciones?: string | null;
  cliente: Cliente;
  vendedor: Vendedor;
  detalles: PedidoDetalle[];
  pedido_cuotas?: Cuota[];
}

export default function OrderPDFPage() {
  const params = useParams();
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
    
    // Detectar modo oscuro del documento/html
    const checkDarkMode = () => {
      const htmlElement = document.documentElement;
      const isDark = htmlElement.classList.contains('dark');
      setDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // Observer para detectar cambios en la clase 'dark' del html
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, [orderId]);

  async function loadOrderData() {
    try {
      const response = await axios.get(`/api/orders/${orderId}`);
      setPedido(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar pedido:", err);
      setError("Error al cargar los datos del pedido");
      setLoading(false);
    }
  }

  const handlePrint = () => {
    // Al imprimir, temporalmente forzar modo claro
    const wasDark = darkMode;
    if (wasDark && contentRef.current) {
      contentRef.current.classList.remove('dark-mode');
    }
    
    window.print();
    
    // Restaurar modo oscuro si estaba activo
    if (wasDark && contentRef.current) {
      contentRef.current.classList.add('dark-mode');
    }
  };

  const handleDownloadPDF = async () => {
    if (!pedido || !contentRef.current) return;
    
    setDownloading(true);
    
    try {
      // Importar html2canvas y jsPDF dinámicamente
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      // Crear un clon del elemento para evitar modificar el DOM original
      const element = contentRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Aplicar estilos inline para evitar problemas con oklch y otras funciones modernas
      const applyInlineStyles = (node: HTMLElement) => {
        const computedStyle = window.getComputedStyle(node);
        
        // Convertir colores oklch a rgb/hex
        const backgroundColor = computedStyle.backgroundColor;
        const color = computedStyle.color;
        const borderColor = computedStyle.borderColor;
        
        if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          node.style.backgroundColor = backgroundColor;
        }
        if (color) {
          node.style.color = color;
        }
        if (borderColor) {
          node.style.borderColor = borderColor;
        }
        
        // Aplicar a todos los hijos
        Array.from(node.children).forEach(child => {
          if (child instanceof HTMLElement) {
            applyInlineStyles(child);
          }
        });
      };
      
      applyInlineStyles(clone);
      
      // Añadir el clon temporalmente al DOM (fuera de vista)
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      
      // Capturar el clon
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
        onclone: (clonedDoc) => {
          // Asegurarse de que todos los estilos estén aplicados
          const clonedElement = clonedDoc.querySelector('[data-html2canvas-clone]');
          if (clonedElement) {
            // Forzar re-render
            (clonedElement as HTMLElement).style.display = 'block';
          }
        }
      });
      
      // Remover el clon del DOM
      document.body.removeChild(clone);
      
      const imgData = canvas.toDataURL('image/png');
      
      // Crear PDF en orientación vertical A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Añadir la primera página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Añadir páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generar nombre del archivo
      const razonSocial = pedido.cliente.razon_social
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30);
      const fileName = `Pedido_${pedido.id_pedido}_${razonSocial}.pdf`;
      
      // Descargar
      pdf.save(fileName);
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar el PDF. Por favor, intente nuevamente.");
    } finally {
      setDownloading(false);
    }
  };

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando datos del pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Pedido no encontrado"}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const creditoDias = pedido.pedido_cuotas && pedido.pedido_cuotas.length > 0 
    ? Math.round((new Date(pedido.pedido_cuotas[0].fecha_pago_programada).getTime() - new Date(pedido.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const montoPendiente = pedido.tipo_pago === 'credito' 
    ? pedido.total - (pedido.pago_inicial || 0) 
    : 0;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Botones de acción - solo visible en pantalla, NO en impresión */}
	  <div className={`print-content shadow-lg max-w-[210mm] mx-auto p-2 ${
            darkMode ? 'dark-mode' : '' }`}
        >
		{/* Botón de imprimir */}
		<button
		  onClick={handlePrint}
		  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium"
		>
		  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
		  </svg>
		  Imprimir
		</button>                
	  </div> 

      {/* Contenedor del documento - ESTO SE IMPRIME Y DESCARGA */}
      <div className="py-8">
        <div 
          ref={contentRef}
          className={`print-content shadow-lg max-w-[210mm] mx-auto p-6 ${
            darkMode ? 'dark-mode bg-gray-800' : 'bg-white'
          }`}
        >
          {/* Header con logo y datos de la empresa */}
          <div className={`pb-3 mb-4 ${darkMode ? 'border-b-4 border-blue-500' : 'border-b-4 border-blue-600'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Image
                  src="/images/logo/logo.png"
                  alt="Rey Automotriz"
                  width={150}
                  height={150}
                  className="object-contain"
                />
                <div className="pt-2">
                  <p className={`text-sm italic mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Accesorios de alta calidad para tu vehículo
                  </p>
                  <div className={`text-sm space-y-0.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <p className="mt-4"><span className="font-semibold">RUC:</span> 20607721603</p>
                    <p><span className="font-semibold">Dirección:</span> Av Modelo, Villa El Salvador, Lima, Lima</p>
                  </div>
                </div>
              </div>
              
              <div className={`rounded-lg p-3 text-center min-w-[180px] ${
                darkMode 
                  ? 'bg-blue-900/30 border-2 border-blue-500' 
                  : 'bg-blue-50 border-2 border-blue-600'
              }`}>
                <p className={`text-xs font-semibold uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Guía de Pedido
                </p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-900'}`}>
                  N° {String(pedido.id_pedido).padStart(6, '0')}
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Fecha: {new Date(pedido.fecha_entrega).toLocaleDateString('es-PE', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Información del cliente */}
          <div className="mb-3">
            <div className={`rounded-lg p-3 border ${
              darkMode 
                ? 'bg-gray-700/50 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}>              
              <div className={`grid grid-cols-2 gap-x-6 gap-y-1 text-sm ${darkMode ? 'text-gray-300' : ''}`}>                
				<div>
				  <p className={darkMode ? 'text-white' : 'text-gray-900'}><span className="font-semibold">Razon Social:</span> {pedido.cliente.razon_social}</p>   
                </div>
                <div>
				  <p className={darkMode ? 'text-white' : 'text-gray-900'}><span className="font-semibold">RUC:</span> {pedido.cliente.ruc || 'N/A'}</p>
                </div>
                <div>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}><span className="font-semibold">Dirección:</span> {pedido.cliente.direccion || 'N/A'}, {pedido.cliente.distrito || 'N/A'}</p>				  
                </div>
                <div>
                  <p className={darkMode ? 'text-white' : 'text-gray-900'}><span className="font-semibold">Teléfono:</span> {pedido.cliente.telefono_principal || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de productos */}
          <div className="mb-3">
            <h2 className={`text-xs font-bold uppercase mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Detalle de Productos
            </h2>
            <table className={`w-full border-collapse border text-xs ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              <thead>
                <tr className={darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-600 text-white'}>
                  <th className={`border px-2 py-1.5 text-left font-semibold w-8 ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>#</th>
                  <th className={`border px-2 py-1.5 text-left font-semibold w-24 ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>Código</th>
                  <th className={`border px-2 py-1.5 text-left font-semibold ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>Descripción</th>
                  <th className={`border px-2 py-1.5 text-center font-semibold w-16 ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>Cant.</th>
                  <th className={`border px-2 py-1.5 text-right font-semibold w-20 ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>P. Unit.</th>
                  <th className={`border px-2 py-1.5 text-right font-semibold w-24 ${
                    darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedido.detalles.map((detalle, index) => (
                  <tr key={index} className={darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}>
                    <td className={`border px-2 py-1 text-center ${
                      darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                    }`}>{index + 1}</td>
                    <td className={`border px-2 py-1 font-mono ${
                      darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                    }`}>{detalle.producto.codigo_producto}</td>
                    <td className={`border px-2 py-1 ${
                      darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                    }`}>{detalle.producto.descripcion}</td>
                    <td className={`border px-2 py-1 text-center font-semibold ${
                      darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                    }`}>{detalle.cantidad}</td>
                    <td className={`border px-2 py-1 text-right ${
                      darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                    }`}>S/ {Number(detalle.precio_venta_comision).toFixed(2)}</td>
                    <td className={`border px-2 py-1 text-right font-semibold ${
                      darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                    }`}>S/ {Number(detalle.subtotal_venta_comision).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalles del pedido y Resumen en dos columnas */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            {/* Detalles del pedido */}
            <div>
              <div className={`rounded-lg p-3 border ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h2 className={`text-xs font-bold uppercase mb-2 pb-1 ${
                  darkMode 
                    ? 'text-gray-300 border-b border-gray-600' 
                    : 'text-gray-700 border-b border-gray-300'
                }`}>
                  Detalles del Pedido
                </h2>
                <div className={`space-y-1 text-xs ${darkMode ? 'text-gray-300' : ''}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold">Tipo de Pago:</span>
                    <span className={`font-semibold uppercase ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {pedido.tipo_pago}
                    </span>
                  </div>
                  
                  {pedido.tipo_pago === 'contado' && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Fecha de Pago:</span>
                      <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                        {new Date(pedido.fecha_entrega).toLocaleDateString('es-PE', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}

                  {pedido.tipo_pago === 'credito' && (
                    <>                      
                      <div className="flex justify-between">
                        <span className="font-semibold">Crédito / # Cuotas:</span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{creditoDias} días / {pedido.pedido_cuotas?.length || 0} cuotas </span>
                      </div>
                    </>
                  )}

                  <div className={`flex justify-between pt-1 ${
                    darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                  }`}>
                    <span className="font-semibold">Vendedor:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {pedido.vendedor.nombre_completo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Fecha de Entrega:</span>
                    <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                      {new Date(pedido.fecha_entrega).toLocaleDateString('es-PE', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  {pedido.observaciones && (
                    <div className={`pt-1 ${
                      darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                    }`}>
                      <span className="font-semibold block mb-0.5">Observaciones:</span>
                      <p className={`text-sm leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {pedido.observaciones}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resumen del pedido */}
            <div>
              <div className={`rounded-lg p-3 border-2 ${
                darkMode 
                  ? 'bg-blue-900/20 border-blue-500' 
                  : 'bg-blue-50 border-blue-600'
              }`}>
                <h2 className={`text-xs font-bold uppercase mb-2 pb-1 ${
                  darkMode 
                    ? 'text-gray-300 border-b border-blue-500' 
                    : 'text-gray-700 border-b border-blue-300'
                }`}>
                  Resumen del Pedido
                </h2>
                <div className={`space-y-1 text-xs ${darkMode ? 'text-gray-300' : ''}`}>
                  <div className="flex justify-between">
                    <span className="font-semibold">Monto Total:</span>
                    <span className={`font-bold text-base ${darkMode ? 'text-blue-400' : 'text-gray-900'}`}>
                      S/ {Number(pedido.total).toFixed(2)}
                    </span>
                  </div>
                  {pedido.tipo_pago === 'credito' && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-semibold">Pago Inicial:</span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                          S/ {Number(pedido.pago_inicial || 0).toFixed(2)}
                        </span>
                      </div>
					  
                      <div className={`flex justify-between pt-1 ${
                        darkMode ? 'border-t border-blue-500' : 'border-t border-blue-300'
                      }`}>
                        <span className="font-semibold">Pago Pendiente:</span>
                        <span className={`font-bold text-base ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                          S/ {montoPendiente.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cronograma de cuotas - solo si es crédito */}
          {pedido.tipo_pago === 'credito' && pedido.pedido_cuotas && pedido.pedido_cuotas.length > 0 && (
            <div className="mb-3">
              <div className={`rounded-lg p-3 border ${
                darkMode 
                  ? 'bg-gray-700/50 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <h2 className={`text-xs font-bold uppercase mb-2 pb-1 ${
                  darkMode 
                    ? 'text-gray-300 border-b border-gray-600' 
                    : 'text-gray-700 border-b border-gray-300'
                }`}>
                  Cronograma de Cuotas
                </h2>
                <table className={`text-xs w-full text-xs border-collapse border ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <thead>
                    <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-200'}>
                      <th className={`border px-2 py-1 text-center ${
                        darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                      }`}>Cuota</th>
                      <th className={`border px-2 py-1 text-center ${
                        darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                      }`}>Fecha Programada</th>
                      <th className={`border px-2 py-1 text-right ${
                        darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300'
                      }`}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.pedido_cuotas.map((cuota) => (
                      <tr key={cuota.numero_cuota} className={darkMode ? 'text-gray-300' : ''}>
                        <td className={`border px-2 py-1 text-center ${
                          darkMode ? 'border-gray-600' : 'border-gray-300'
                        }`}>{cuota.numero_cuota}</td>
                        <td className={`border px-2 py-1 text-center ${
                          darkMode ? 'border-gray-600' : 'border-gray-300'
                        }`}>
                          {new Date(cuota.fecha_pago_programada).toLocaleDateString('es-PE', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          })}
                        </td>
                        <td className={`border px-2 py-1 text-right ${
                          darkMode ? 'border-gray-600' : 'border-gray-300'
                        }`}>S/ {Number(cuota.monto_cuota).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Información bancaria */}
          <div className="mb-3">
            <div className={`rounded-lg p-3 border ${
              darkMode 
                ? 'bg-gray-700/50 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h2 className={`text-xs font-bold uppercase mb-2 pb-1 ${
                darkMode 
                  ? 'text-gray-300 border-b border-gray-600' 
                  : 'text-gray-700 border-b border-gray-300'
              }`}>
                Cuentas Bancarias
              </h2>
              <div className={`grid grid-cols-3 gap-x-4 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div>
                  <p><span className="font-semibold">BCP Soles:</span> 123456</p>
                  <p><span className="font-semibold">BCP Dólares:</span> 123456</p>
                </div>
                <div>
                  <p><span className="font-semibold">CCI Soles:</span> 12345678</p>
                  <p><span className="font-semibold">CCI Dólares:</span> 12345678</p>
                </div>
                <div>
                  <p><span className="font-semibold">Yape:</span> 987 654 321</p>
                </div>
              </div>
            </div>
          </div>

          {/* Medios digitales - al final ocupando toda la línea */}
          <div className={`pt-2 mb-2 ${darkMode ? 'border-t-2 border-gray-600' : 'border-t-2 border-gray-300'}`}>
            <div className={`rounded-lg p-2 border ${
              darkMode 
                ? 'bg-blue-900/20 border-blue-500' 
                : 'bg-blue-50 border-blue-200'
            }`}>              
              <div className={`flex justify-center items-center gap-6 text-xs ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 0C4.477 0 0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.879V12.89h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.989C16.343 19.129 20 14.991 20 10c0-5.523-4.477-10-10-10z"/>
                  </svg>
                  <span>www.reyautomotriz.com</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span>987 654 321</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>@rey-automotriz</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                  <span>@rey-automotriz</span>
                </div>
              </div>
            </div>
          </div>          
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          /* Ocultar todo excepto el contenido del documento */
          body * {
            visibility: hidden;
          }
          
          .print-content,
          .print-content * {
            visibility: visible;
          }
          
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            box-shadow: none;
          }
          
          /* Forzar modo claro al imprimir */
          .print-content.dark-mode {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          
          .print-content.dark-mode * {
            background-color: transparent !important;
            color: inherit !important;
            border-color: #d1d5db !important;
          }
          
          .print-content.dark-mode .bg-blue-900 {
            background-color: #2563EB !important;
          }
          
          .print-content.dark-mode .text-blue-400,
          .print-content.dark-mode .text-blue-100 {
            color: #1E40AF !important;
          }
          
          .print-content.dark-mode .text-white {
            color: #111827 !important;
          }
          
          .print-content.dark-mode .text-gray-300,
          .print-content.dark-mode .text-gray-400 {
            color: #374151 !important;
          }
          
          .print-content.dark-mode .border-gray-600 {
            border-color: #d1d5db !important;
          }
          
          .print-content.dark-mode .bg-gray-700,
          .print-content.dark-mode .bg-gray-800 {
            background-color: #f9fafb !important;
          }
          
          /* Ocultar barra de botones */
          .no-print {
            display: none !important;
          }
          
          /* Configuración de página */
          @page {
            size: A4;
            margin: 8mm;
          }
          
          /* Evitar saltos de página dentro de secciones */
          .bg-gray-50,
          .bg-blue-50,
          .bg-gray-700 {
            page-break-inside: avoid;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
        
        /* Estilos para pantalla */
        @media screen {
          .no-print {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}