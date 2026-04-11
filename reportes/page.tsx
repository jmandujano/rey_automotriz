"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ChevronDownIcon, PencilIcon } from "@/icons";

interface Cuota {
  id_cuota: number;
  numero_cuota: number;
  monto_cuota: number;
  monto_pagado: number;
  saldo_pendiente: number;
  estado_pago: string;
  fecha_pago_programada: string;
  fecha_pago_real: string | null;
}

interface PedidoCredito {
  id_pedido: number;
  id_cliente: number;
  id_vendedor: number;
  tipo_pago: string;
  total: number;
  estado_pago: string;
  fecha_entrega: string;
  fecha_ultima_cuota: string | null;
  dias_retraso: number;
  cliente?: { razon_social: string; distrito: string };
  vendedor?: { nombre_completo: string };
  cuotas: Cuota[];
}

interface EditingCuota {
  id_cuota: number;
  fecha_pago: string;
  monto_pagar: number;
}

type SortColumn = 
  | "id_pedido" 
  | "vendedor" 
  | "cliente" 
  | "distrito" 
  | "total"
  | "tipo_pago"
  | "fecha_entrega" 
  | "fecha_ultima_cuota" 
  | "retraso"
  | "estado_pago";

type SortDirection = "asc" | "desc";

// Componente de icono inline para chevron derecha
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

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

// Icono de calendario
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// Función para formatear números con separador de miles
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Función para calcular días de retraso desde hoy (solo para cuotas pendientes)
const calcularDiasRetrasoDesdeHoy = (fechaProgramada: string, estadoPago: string): number => {
  if (estadoPago === 'completado') return 0;
  
  const hoy = new Date();
  const programada = new Date(fechaProgramada);
  
  hoy.setHours(0, 0, 0, 0);
  programada.setHours(0, 0, 0, 0);
  
  const diffTime = hoy.getTime() - programada.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Solo retornar retraso si es positivo (fecha programada ya pasó)
  return diffDays > 0 ? diffDays : 0;
};

// Función para calcular días de diferencia entre fecha de pago y programada (para cuotas completadas)
const calcularDiasRetraso = (fechaPago: string | null, fechaProgramada: string): number => {
  if (!fechaPago) return 0;
  
  const pago = new Date(fechaPago);
  const programada = new Date(fechaProgramada);
  
  pago.setHours(0, 0, 0, 0);
  programada.setHours(0, 0, 0, 0);
  
  const diffTime = pago.getTime() - programada.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export default function CreditosPendientesPage() {
  const [pedidos, setPedidos] = useState<PedidoCredito[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingCuota, setEditingCuota] = useState<EditingCuota | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

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
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [tipoPagoFiltro, setTipoPagoFiltro] = useState("");
  const [estadoPagoFiltro, setEstadoPagoFiltro] = useState("");

  // Estados de ordenamiento
  const [sortColumn, setSortColumn] = useState<SortColumn>("id_pedido");
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
    setExpandedRow(null);
  }, [fechaDesde, fechaHasta, vendedorFiltro, clienteFiltro, tipoPagoFiltro, estadoPagoFiltro]);

  const loadData = () => {
    setLoading(true);
    axios
      .get<PedidoCredito[]>("/api/reports/credits")
      .then((res) => {
        setPedidos(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        alert("Error al cargar los datos: " + (err.response?.data?.error || err.message));
      });
  };

  // Obtener lista de vendedores filtrados por cliente seleccionado
  const vendedoresDisponibles = useMemo(() => {
    let pedidosFiltrados = pedidos;
    
    // Si hay un cliente seleccionado, filtrar pedidos por ese cliente
    if (clienteFiltro) {
      pedidosFiltrados = pedidosFiltrados.filter(p => p.id_cliente === Number(clienteFiltro));
    }
    
    // Extraer vendedores únicos de los pedidos filtrados
    const vendedoresUnicos = new Map<number, string>();
    pedidosFiltrados.forEach(pedido => {
      if (pedido.vendedor) {
        vendedoresUnicos.set(pedido.id_vendedor, pedido.vendedor.nombre_completo);
      }
    });
    
    return Array.from(vendedoresUnicos, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [pedidos, clienteFiltro]);

  // Obtener lista de clientes filtrados por vendedor seleccionado
  const clientesDisponibles = useMemo(() => {
    let pedidosFiltrados = pedidos;
    
    // Si hay un vendedor seleccionado, filtrar pedidos por ese vendedor
    if (vendedorFiltro) {
      pedidosFiltrados = pedidosFiltrados.filter(p => p.id_vendedor === Number(vendedorFiltro));
    }
    
    // Extraer clientes únicos de los pedidos filtrados
    const clientesUnicos = new Map<number, string>();
    pedidosFiltrados.forEach(pedido => {
      if (pedido.cliente) {
        clientesUnicos.set(pedido.id_cliente, pedido.cliente.razon_social);
      }
    });
    
    return Array.from(clientesUnicos, ([id, razon_social]) => ({ id, razon_social }))
      .sort((a, b) => a.razon_social.localeCompare(b.razon_social));
  }, [pedidos, vendedorFiltro]);

  // Manejar cambio de vendedor
  const handleVendedorChange = (value: string) => {
    setVendedorFiltro(value);
    
    // Si se selecciona un vendedor y el cliente actual no está en la lista de clientes de ese vendedor, resetear cliente
    if (value && clienteFiltro) {
      const pedidosDelVendedor = pedidos.filter(p => p.id_vendedor === Number(value));
      const clienteExiste = pedidosDelVendedor.some(p => p.id_cliente === Number(clienteFiltro));
      if (!clienteExiste) {
        setClienteFiltro("");
      }
    }
  };

  // Manejar cambio de cliente
  const handleClienteChange = (value: string) => {
    setClienteFiltro(value);
    
    // Si se selecciona un cliente y el vendedor actual no está en la lista de vendedores de ese cliente, resetear vendedor
    if (value && vendedorFiltro) {
      const pedidosDelCliente = pedidos.filter(p => p.id_cliente === Number(value));
      const vendedorExiste = pedidosDelCliente.some(p => p.id_vendedor === Number(vendedorFiltro));
      if (!vendedorExiste) {
        setVendedorFiltro("");
      }
    }
  };

  // Aplicar filtros
  const pedidosFiltrados = useMemo(() => {
    let resultado = [...pedidos];

    // Filtro por rango de fechas
    if (fechaDesde) {
      resultado = resultado.filter(p => p.fecha_entrega >= fechaDesde);
    }    
	
	/*if (fechaHasta) {
      resultado = resultado.filter(p => p.fecha_entrega <= fechaHasta);	  
    }*/
	
	if (fechaHasta) {
    const fechaHastaMasUno = new Date(fechaHasta);
    fechaHastaMasUno.setDate(fechaHastaMasUno.getDate() + 1);

    resultado = resultado.filter(p => new Date(p.fecha_entrega) <= fechaHastaMasUno);
  }

    // Filtro por vendedor
    if (vendedorFiltro) {
      resultado = resultado.filter(p => p.id_vendedor === Number(vendedorFiltro));
    }

    // Filtro por cliente
    if (clienteFiltro) {
      resultado = resultado.filter(p => p.id_cliente === Number(clienteFiltro));
    }

    // Filtro por tipo de pago
    if (tipoPagoFiltro) {
      resultado = resultado.filter(p => p.tipo_pago.toLowerCase() === tipoPagoFiltro.toLowerCase());
    }

    // Filtro por estado de pago
    if (estadoPagoFiltro) {
      resultado = resultado.filter(p => p.estado_pago === estadoPagoFiltro);
    }

    return resultado;
  }, [pedidos, fechaDesde, fechaHasta, vendedorFiltro, clienteFiltro, tipoPagoFiltro, estadoPagoFiltro]);

  // Aplicar ordenamiento
  const pedidosOrdenados = useMemo(() => {
    const sorted = [...pedidosFiltrados].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "id_pedido":
          aValue = a.id_pedido;
          bValue = b.id_pedido;
          break;
        case "vendedor":
          aValue = a.vendedor?.nombre_completo || "";
          bValue = b.vendedor?.nombre_completo || "";
          break;
        case "cliente":
          aValue = a.cliente?.razon_social || "";
          bValue = b.cliente?.razon_social || "";
          break;
        case "distrito":
          aValue = a.cliente?.distrito || "";
          bValue = b.cliente?.distrito || "";
          break;
        case "total":
          aValue = Number(a.total);
          bValue = Number(b.total);
          break;
        case "tipo_pago":
          aValue = a.tipo_pago;
          bValue = b.tipo_pago;
          break;
        case "fecha_entrega":
          aValue = a.fecha_entrega;
          bValue = b.fecha_entrega;
          break;
        case "fecha_ultima_cuota":
          aValue = a.fecha_ultima_cuota || "";
          bValue = b.fecha_ultima_cuota || "";
          break;
        case "retraso":
          aValue = a.dias_retraso;
          bValue = b.dias_retraso;
          break;
        case "estado_pago":
          aValue = a.estado_pago;
          bValue = b.estado_pago;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc" 
          ? aValue - bValue
          : bValue - aValue;
      }
    });

    return sorted;
  }, [pedidosFiltrados, sortColumn, sortDirection]);

  // Calcular totales basados en datos filtrados
  const totales = useMemo(() => {
    const montoTotal = pedidosFiltrados.reduce((sum, p) => sum + Number(p.total), 0);
    const saldoPendiente = pedidosFiltrados.reduce((sum, p) => {
      const saldoCuotas = p.cuotas.reduce((s, c) => s + Number(c.saldo_pendiente), 0);
      return sum + saldoCuotas;
    }, 0);
    const totalPedidos = pedidosFiltrados.length;
    const promedioRetraso = totalPedidos > 0
      ? pedidosFiltrados.reduce((sum, p) => sum + p.dias_retraso, 0) / totalPedidos
      : 0;

    return {
      montoTotal,
      saldoPendiente,
      totalPedidos,
      promedioRetraso
    };
  }, [pedidosFiltrados]);

  // Aplicar paginación
  const pedidosPaginados = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return pedidosOrdenados.slice(startIndex, endIndex);
  }, [pedidosOrdenados, currentPage]);

  const totalPages = Math.ceil(pedidosOrdenados.length / itemsPerPage);

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
    setExpandedRow(null);
  };

  const limpiarFiltros = () => {
    setFechaDesde(getFechaInicioPorDefecto());
    setFechaHasta(getFechaFinPorDefecto());
    setVendedorFiltro("");
    setClienteFiltro("");
    setTipoPagoFiltro("");
    setEstadoPagoFiltro("");
    setCurrentPage(1);
    setExpandedRow(null);
  };

  const toggleRow = (id_pedido: number) => {
    setExpandedRow(expandedRow === id_pedido ? null : id_pedido);
    setEditingCuota(null);
  };

  const startEditCuota = (cuota: Cuota) => {
    const hoy = new Date().toISOString().split("T")[0];
    setEditingCuota({
      id_cuota: cuota.id_cuota,
      fecha_pago: hoy,
      monto_pagar: 0,
    });
  };

  const cancelEdit = () => {
    setEditingCuota(null);
  };

  const handleSavePago = async (id_pedido: number, cuota: Cuota, es_contado: boolean = false) => {
    if (!editingCuota) return;

    if (editingCuota.monto_pagar <= 0) {
      alert("El monto a pagar debe ser mayor a 0");
      return;
    }

    const saldoPendiente = Number(cuota.saldo_pendiente);
    if (editingCuota.monto_pagar > saldoPendiente) {
      alert(`El monto a pagar no puede exceder el saldo pendiente (S/ ${formatNumber(saldoPendiente)})`);
      return;
    }

    if (!confirm("¿Confirmar el registro de este pago?")) return;

    setSaving(true);
    try {
      await axios.patch("/api/reports/credits", {
        id_cuota: cuota.id_cuota,
        id_pedido: id_pedido,
        fecha_pago_real: editingCuota.fecha_pago,
        monto_pagado: editingCuota.monto_pagar,
        es_contado: es_contado
      });

      alert("Pago registrado exitosamente");
      setEditingCuota(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Error al registrar el pago");
    } finally {
      setSaving(false);
    }
  };

  async function exportToExcel() {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const XLSX = await import("xlsx");

      const exportData = pedidosOrdenados.map((pedido) => ({
        "ID Pedido": pedido.id_pedido,
        "Vendedor": pedido.vendedor?.nombre_completo ?? "",
        "Cliente": pedido.cliente?.razon_social ?? "",
        "Distrito": pedido.cliente?.distrito ?? "",
        "Monto Total": Number(pedido.total).toFixed(2),
        "Tipo Pago": pedido.tipo_pago,
        "Estado": pedido.estado_pago,
        "Fecha Entrega": pedido.fecha_entrega?.substring(0, 10) ?? "",
        "Fecha Última Cuota": pedido.fecha_ultima_cuota?.substring(0, 10) ?? "",
        "Retraso (días)": pedido.dias_retraso > 0 ? pedido.dias_retraso : "-",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws["!cols"] = [
        { wch: 12 },
        { wch: 25 },
        { wch: 35 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Créditos");

      const fecha = new Date().toISOString().split("T")[0];
      const fileName = `creditos_pendientes_${fecha}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
      alert("Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/95">
          Créditos Pendientes
        </h3>
      </div>
	  
	  {/* Tarjetas de Totales */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
	  
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide"> Monto Total</p>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            S/ {formatNumber(totales.montoTotal)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">          
		  <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Saldo Pendiente</p>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            S/ {formatNumber(totales.saldoPendiente)}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Total de Pedidos</p>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totales.totalPedidos.toLocaleString('es-PE')}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pedidos Registrados</p>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {totales.promedioRetraso.toFixed(1)} días
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Desde
            </label>
            <div className="relative">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Hasta
            </label>
            <div className="relative">
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none"
              />
              <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Vendedor
            </label>
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {vendedoresDisponibles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cliente
            </label>
            <select
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {clientesDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razon_social}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo de Pago
            </label>
            <select
              value={tipoPagoFiltro}
              onChange={(e) => setTipoPagoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={estadoPagoFiltro}
              onChange={(e) => setEstadoPagoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
            </select>
          </div>
        </div>
        
      </div>

      

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-end px-5 py-4 border-b border-gray-200 dark:border-gray-800 sm:px-6 sm:py-5">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting || pedidosOrdenados.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Exportar
                </>
              )}
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <button
                    onClick={exportToExcel}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1.8l1.2 2.4L12.7 13h1.8l-2.1 3 2.1 3h-1.8l-1.2-2.5-1.2 2.5H8.5l2.1-3-2.1-3z" />
                    </svg>
                    Exportar a Excel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Cargando créditos pendientes...
            </div>
          ) : pedidosOrdenados.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay registros con los filtros seleccionados
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        {/* Columna para el botón de expandir */}
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("id_pedido")}
                      >
                        <div className="flex items-center">
                          ID Pedido
                          <SortIcon direction={sortColumn === "id_pedido" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("vendedor")}
                      >
                        <div className="flex items-center">
                          Vendedor
                          <SortIcon direction={sortColumn === "vendedor" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("cliente")}
                      >
                        <div className="flex items-center">
                          Cliente
                          <SortIcon direction={sortColumn === "cliente" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("distrito")}
                      >
                        <div className="flex items-center">
                          Distrito
                          <SortIcon direction={sortColumn === "distrito" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center">
                          Monto Total
                          <SortIcon direction={sortColumn === "total" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("tipo_pago")}
                      >
                        <div className="flex items-center">
                          Tipo Pago
                          <SortIcon direction={sortColumn === "tipo_pago" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("estado_pago")}
                      >
                        <div className="flex items-center">
                          Estado
                          <SortIcon direction={sortColumn === "estado_pago" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("fecha_entrega")}
                      >
                        <div className="flex items-center">
                          Fecha Entrega
                          <SortIcon direction={sortColumn === "fecha_entrega" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("fecha_ultima_cuota")}
                      >
                        <div className="flex items-center">
                          Fecha Última Cuota
                          <SortIcon direction={sortColumn === "fecha_ultima_cuota" ? sortDirection : null} />
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => handleSort("retraso")}
                      >
                        <div className="flex items-center">
                          Retraso
                          <SortIcon direction={sortColumn === "retraso" ? sortDirection : null} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                    {pedidosPaginados.map((pedido) => (
                      <React.Fragment key={pedido.id_pedido}>
                        {/* Fila principal */}
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleRow(pedido.id_pedido)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-transform"
                            >
                              {expandedRow === pedido.id_pedido ? (
                                <ChevronDownIcon className="w-5 h-5" />
                              ) : (
                                <ChevronRightIcon className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                            {pedido.id_pedido}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            {pedido.vendedor?.nombre_completo ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            {pedido.cliente?.razon_social ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            {pedido.cliente?.distrito ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                            S/ {formatNumber(Number(pedido.total))}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            <span className="capitalize">{pedido.tipo_pago}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                pedido.estado_pago === "completado"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              }`}
                            >
                              {pedido.estado_pago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            {pedido.fecha_entrega?.substring(0, 10) ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                            {pedido.fecha_ultima_cuota?.substring(0, 10) ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            {pedido.dias_retraso > 0 ? (
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                {pedido.dias_retraso} {pedido.dias_retraso === 1 ? "día" : "días"}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        </tr>

                        {/* Filas expandidas con detalles de cuotas */}
                        {expandedRow === pedido.id_pedido && (
                          <tr>
                            <td colSpan={11} className="px-0 py-0">
                              {/* Fondo sutil diferenciado */}
                              <div className="bg-blue-50/40 dark:bg-blue-950/20 border-t border-b border-gray-200 dark:border-gray-700">
                                <div className="px-4 py-2 bg-blue-100/60 dark:bg-blue-900/30">
                                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                    Detalle de Cuotas - Pedido #{pedido.id_pedido}
                                  </h4>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-blue-100/80 dark:bg-blue-900/40">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Nro Cuota
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Fecha Programada
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Monto Cuota
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Monto Pagado
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Fecha de Pago
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Monto a Pagar
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Saldo Pendiente
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Retraso
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Estado
                                        </th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                          Acciones
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                      {pedido.cuotas.map((cuota) => {
                                        const isEditing = editingCuota?.id_cuota === cuota.id_cuota;
                                        const saldoPendiente = isEditing
                                          ? Number(cuota.saldo_pendiente) - (editingCuota?.monto_pagar || 0)
                                          : Number(cuota.saldo_pendiente);
                                        
                                        // Calcular retraso
                                        let diasRetraso = 0;
                                        if (cuota.estado_pago === 'completado') {
                                          // Para cuotas completadas: diferencia entre fecha de pago y programada
                                          diasRetraso = calcularDiasRetraso(cuota.fecha_pago_real, cuota.fecha_pago_programada);
                                        } else {
                                          // Para cuotas pendientes: fecha actual menos fecha programada (solo si está vencida)
                                          diasRetraso = calcularDiasRetrasoDesdeHoy(cuota.fecha_pago_programada, cuota.estado_pago);
                                        }

                                        return (
                                          <tr
                                            key={cuota.id_cuota}
                                            className="hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                                          >
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                              {cuota.numero_cuota}
                                            </td>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                              {cuota.fecha_pago_programada?.substring(0, 10)}
                                            </td>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                              S/ {formatNumber(Number(cuota.monto_cuota))}
                                            </td>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                              S/ {formatNumber(Number(cuota.monto_pagado))}
                                            </td>
                                            <td className="px-4 py-2">
                                              {isEditing ? (
                                                <div className="relative">
                                                  <input
                                                    type="date"
                                                    value={editingCuota.fecha_pago}
                                                    onChange={(e) =>
                                                      setEditingCuota({
                                                        ...editingCuota,
                                                        fecha_pago: e.target.value,
                                                      })
                                                    }
                                                    className="px-2 py-1 pr-8 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm appearance-none"
                                                  />
                                                  <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                              ) : (
                                                <span className="text-gray-500 dark:text-gray-400">
                                                  {cuota.fecha_pago_real?.substring(0, 10) || "-"}
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2">
                                              {isEditing ? (
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  max={Number(cuota.saldo_pendiente)}
                                                  value={editingCuota.monto_pagar}
                                                  onChange={(e) => {
                                                    const valor = Number(e.target.value);
                                                    const montoMaximo = Number(cuota.saldo_pendiente);
                                                    setEditingCuota({
                                                      ...editingCuota,
                                                      monto_pagar: valor > montoMaximo ? montoMaximo : valor,
                                                    });
                                                  }}
                                                  className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                                                  placeholder="0.00"
                                                />
                                              ) : (
                                                <span className="text-gray-500 dark:text-gray-400">-</span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">
                                              S/ {formatNumber(saldoPendiente)}
                                            </td>
                                            <td className="px-4 py-2">
                                              {cuota.estado_pago === 'completado' ? (
                                                // Cuotas completadas: mostrar si pagó antes o después
                                                diasRetraso > 0 ? (
                                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                                    {diasRetraso} {diasRetraso === 1 ? "día" : "días"}
                                                  </span>
                                                ) : diasRetraso < 0 ? (
                                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                                    {Math.abs(diasRetraso)} {Math.abs(diasRetraso) === 1 ? "día" : "días"} antes
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-500">A tiempo</span>
                                                )
                                              ) : (
                                                // Cuotas pendientes: mostrar solo si está vencida
                                                diasRetraso > 0 ? (
                                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                                    {diasRetraso} {diasRetraso === 1 ? "día" : "días"}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-500">-</span>
                                                )
                                              )}
                                            </td>
                                            <td className="px-4 py-2">
                                              <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                  cuota.estado_pago === "completado"
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                }`}
                                              >
                                                {cuota.estado_pago}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                              {cuota.estado_pago === "pendiente" && (
                                                <>
                                                  {isEditing ? (
                                                    <div className="flex gap-2 justify-center">
                                                      <button
                                                        onClick={() =>
                                                          handleSavePago(
                                                            pedido.id_pedido,
                                                            cuota,
                                                            pedido.tipo_pago.toLowerCase() === "contado"
                                                          )
                                                        }
                                                        disabled={saving}
                                                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                      >
                                                        {saving ? "Guardando..." : "Confirmar"}
                                                      </button>
                                                      <button
                                                        onClick={cancelEdit}
                                                        disabled={saving}
                                                        className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                      >
                                                        Cancelar
                                                      </button>
                                                    </div>
                                                  ) : (
                                                    <button
                                                      onClick={() => startEditCuota(cuota)}
                                                      className="text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors"
                                                      title="Registrar pago"
                                                    >
                                                      <PencilIcon className="w-5 h-5" />
                                                    </button>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando {((currentPage - 1) * itemsPerPage + 1).toLocaleString('es-PE')} a{" "}
                    {Math.min(currentPage * itemsPerPage, pedidosOrdenados.length).toLocaleString('es-PE')} de{" "}
                    {pedidosOrdenados.length.toLocaleString('es-PE')} registros
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