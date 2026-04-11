"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

interface ComisionReporte {
  id_movimiento: number;
  id_vendedor: number;
  vendedor: string;
  id_pedido: number;
  monto_total_pedido: number;
  comision_porcentaje: number;
  tipo_pago: string;
  cuotas: string;
  monto_pagado: number;
  monto_comision: number;
  fecha_pago: string;
  fecha_registro: string;
}

type SortColumn = 
  | "vendedor"
  | "id_pedido" 
  | "monto_total_pedido"
  | "comision_porcentaje"
  | "tipo_pago"
  | "cuotas"
  | "monto_pagado"
  | "monto_comision"
  | "fecha_pago";

type SortDirection = "asc" | "desc";

// Icono de ordenamiento
const SortIcon: React.FC<{ direction: SortDirection | null }> = ({ direction }) => (
  <svg className="w-4 h-4 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {direction === "asc" ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    ) : direction === "desc" ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    )}
  </svg>
);

// Función para formatear números con separador de miles
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ReporteComisionesPage() {
  const [comisiones, setComisiones] = useState<ComisionReporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Calcular fechas por defecto (3 meses atrás y hoy)
  const getFechaInicioPorDefecto = () => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - 3);
    return fecha.toISOString().split('T')[0];
  };

  const getFechaFinPorDefecto = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Estados de filtros con valores por defecto
  const [fechaDesde, setFechaDesde] = useState(getFechaInicioPorDefecto());
  const [fechaHasta, setFechaHasta] = useState(getFechaFinPorDefecto());
  const [vendedorFiltro, setVendedorFiltro] = useState("");

  // Estados de ordenamiento
  const [sortColumn, setSortColumn] = useState<SortColumn>("fecha_pago");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadData();
  }, []);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [fechaDesde, fechaHasta, vendedorFiltro]);

  const loadData = () => {
    setLoading(true);
    axios
      .get<ComisionReporte[]>("/api/reports/commissions")
      .then((res) => {
        setComisiones(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        alert("Error al cargar los datos: " + (err.response?.data?.error || err.message));
      });
  };

  // Obtener lista de vendedores únicos
  const vendedoresDisponibles = useMemo(() => {
    const vendedoresUnicos = new Map<number, string>();
    comisiones.forEach(comision => {
      vendedoresUnicos.set(comision.id_vendedor, comision.vendedor);
    });
    
    return Array.from(vendedoresUnicos, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [comisiones]);

  // Aplicar filtros
  const comisionesFiltradas = useMemo(() => {
    let resultado = [...comisiones];

    // Filtro por rango de fechas (usando fecha_pago)
    if (fechaDesde) {
      resultado = resultado.filter(c => {
        const fechaPago = new Date(c.fecha_pago).toISOString().split('T')[0];
        return fechaPago >= fechaDesde;
      });
    }
    if (fechaHasta) {
      resultado = resultado.filter(c => {
        const fechaPago = new Date(c.fecha_pago).toISOString().split('T')[0];
        return fechaPago <= fechaHasta;
      });
    }

    // Filtro por vendedor
    if (vendedorFiltro) {
      resultado = resultado.filter(c => c.id_vendedor === Number(vendedorFiltro));
    }

    return resultado;
  }, [comisiones, fechaDesde, fechaHasta, vendedorFiltro]);

  // Aplicar ordenamiento
  const comisionesOrdenadas = useMemo(() => {
    const sorted = [...comisionesFiltradas].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "vendedor":
          aValue = a.vendedor.toLowerCase();
          bValue = b.vendedor.toLowerCase();
          break;
        case "id_pedido":
          aValue = a.id_pedido;
          bValue = b.id_pedido;
          break;
        case "monto_total_pedido":
          aValue = a.monto_total_pedido;
          bValue = b.monto_total_pedido;
          break;
        case "comision_porcentaje":
          aValue = a.comision_porcentaje;
          bValue = b.comision_porcentaje;
          break;
        case "tipo_pago":
          aValue = a.tipo_pago.toLowerCase();
          bValue = b.tipo_pago.toLowerCase();
          break;
        case "cuotas":
          aValue = a.cuotas;
          bValue = b.cuotas;
          break;
        case "monto_pagado":
          aValue = a.monto_pagado;
          bValue = b.monto_pagado;
          break;
        case "monto_comision":
          aValue = a.monto_comision;
          bValue = b.monto_comision;
          break;
        case "fecha_pago":
          aValue = new Date(a.fecha_pago).getTime();
          bValue = new Date(b.fecha_pago).getTime();
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [comisionesFiltradas, sortColumn, sortDirection]);

  // Calcular totales
  const totales = useMemo(() => {
    const comisionTotal = comisionesOrdenadas.reduce((sum, c) => sum + c.monto_comision, 0);
    const pedidosUnicos = new Set(comisionesOrdenadas.map(c => c.id_pedido)).size;
    
    return {
      comisionTotal,
      cantidadPedidos: pedidosUnicos
    };
  }, [comisionesOrdenadas]);

  // Paginación
  const comisionesPaginadas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return comisionesOrdenadas.slice(startIndex, endIndex);
  }, [comisionesOrdenadas, currentPage]);

  const totalPages = Math.ceil(comisionesOrdenadas.length / itemsPerPage);

  // Funciones de ordenamiento
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Funciones de paginación
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  async function exportToExcel() {
    setExporting(true);

    try {
      const XLSX = await import("xlsx");

      const exportData = comisionesOrdenadas.map((comision) => ({
        "Vendedor": comision.vendedor,
        "ID Pedido": comision.id_pedido,
        "Monto Total Pedido": Number(comision.monto_total_pedido).toFixed(2),
        "Comisión (%)": Number(comision.comision_porcentaje).toFixed(2),
        "Tipo Pago": comision.tipo_pago,
        "Cuotas": comision.cuotas,
        "Monto Pagado": Number(comision.monto_pagado).toFixed(2),
        "Monto Comisión": Number(comision.monto_comision).toFixed(2),
        "Fecha Pago": new Date(comision.fecha_pago).toLocaleDateString('es-PE'),
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws["!cols"] = [
        { wch: 25 },
        { wch: 12 },
        { wch: 18 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
      XLSX.writeFile(wb, `Reporte_Comisiones_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reporte de Comisiones
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Gestión y seguimiento de comisiones por ventas
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
              <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                Comisión Total
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                S/ {formatNumber(totales.comisionTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                Cantidad de Pedidos
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                {totales.cantidadPedidos.toLocaleString('es-PE')}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vendedor
              </label>
              <select
                value={vendedorFiltro}
                onChange={(e) => setVendedorFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {vendedoresDisponibles.map((vendedor) => (
                  <option key={vendedor.id} value={vendedor.id}>
                    {vendedor.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Botón de exportar */}
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold">{comisionesOrdenadas.length.toLocaleString('es-PE')}</span> registros
            </div>
            <button
              onClick={exportToExcel}
              disabled={exporting || comisionesOrdenadas.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? "Exportando..." : "Exportar a Excel"}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando datos...</p>
            </div>
          ) : comisionesOrdenadas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No se encontraron registros de comisiones
              </p>
            </div>
          ) : (
            <>
              {/* Tabla */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th
                        onClick={() => handleSort("vendedor")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Vendedor
                        <SortIcon direction={sortColumn === "vendedor" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("id_pedido")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        ID Pedido
                        <SortIcon direction={sortColumn === "id_pedido" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("monto_total_pedido")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Monto Total Pedido
                        <SortIcon direction={sortColumn === "monto_total_pedido" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("comision_porcentaje")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Comisión (%)
                        <SortIcon direction={sortColumn === "comision_porcentaje" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("tipo_pago")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Tipo Pago
                        <SortIcon direction={sortColumn === "tipo_pago" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("cuotas")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Cuotas
                        <SortIcon direction={sortColumn === "cuotas" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("monto_pagado")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Monto Pagado
                        <SortIcon direction={sortColumn === "monto_pagado" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("monto_comision")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Monto Comisión
                        <SortIcon direction={sortColumn === "monto_comision" ? sortDirection : null} />
                      </th>
                      <th
                        onClick={() => handleSort("fecha_pago")}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      >
                        Fecha Pago
                        <SortIcon direction={sortColumn === "fecha_pago" ? sortDirection : null} />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {comisionesPaginadas.map((comision) => (
                      <tr
                        key={comision.id_movimiento}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {comision.vendedor}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          #{comision.id_pedido}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                          S/ {formatNumber(comision.monto_total_pedido)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {formatNumber(comision.comision_porcentaje)}%
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              comision.tipo_pago.toLowerCase() === "contado"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                            }`}
                          >
                            {comision.tipo_pago}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {comision.cuotas}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                          S/ {formatNumber(comision.monto_pagado)}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400 font-bold">
                          S/ {formatNumber(comision.monto_comision)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(comision.fecha_pago).toLocaleDateString('es-PE')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando {((currentPage - 1) * itemsPerPage + 1).toLocaleString('es-PE')} a{" "}
                    {Math.min(currentPage * itemsPerPage, comisionesOrdenadas.length).toLocaleString('es-PE')} de{" "}
                    {comisionesOrdenadas.length.toLocaleString('es-PE')} registros
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Anterior
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-3 py-1 rounded transition-colors ${
                            currentPage === pageNum
                              ? "bg-brand-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}