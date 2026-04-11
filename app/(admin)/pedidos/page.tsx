"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { ChevronDownIcon, PencilIcon, TrashBinIcon } from "@/icons";

interface DetallePedido {
  id_detalle: number;
  id_producto: number;
  cantidad: number;
  precio_venta_comision: number;
  subtotal_venta_comision: number;
  producto: {
    codigo_producto: string;
    descripcion: string;
  };
}

interface Order {
  id_pedido: number;
  id_cliente: number;
  id_vendedor: number;
  tipo_pago: string;
  tipo_comprobante: string;
  subtotal: any;
  igv: any;
  total: any;
  estado_actual: string;
  fecha_creacion: string;
  fecha_entrega: string;
  cliente?: { id_cliente: number; razon_social: string; distrito: string };
  vendedor?: { id_usuario: number; nombre_completo: string };
  detalles: DetallePedido[];
}

type SortColumn = 
  | "id_pedido" 
  | "cliente" 
  | "vendedor" 
  | "total"
  | "estado_actual"
  | "distrito"
  | "fecha_creacion"
  | "fecha_entrega";

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

// Función para formatear números con separador de miles
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Icono de calendario
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

/**
 * PedidosPage
 *
 * Displays a list of orders with advanced filtering, sorting, and expandable details.
 */
export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState<number | null>(null);

  // Modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

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
  const [zonaFiltro, setZonaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");

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
  }, [fechaDesde, fechaHasta, vendedorFiltro, clienteFiltro, zonaFiltro, estadoFiltro]);

  async function loadData() {
    try {
      setLoading(true);
      const res = await axios.get<Order[]>("/api/orders");
      setOrders(res.data);
    } catch (err) {
      console.error(err);
      alert("Error al cargar los pedidos");
    } finally {
      setLoading(false);
    }
  }

  // Obtener pedidos filtrados por fecha, zona y estado (sin filtrar por vendedor ni cliente aún)
  const pedidosPreFiltrados = useMemo(() => {
    return orders.filter(pedido => {
      const fechaPedido = new Date(pedido.fecha_creacion);
      const desde = new Date(fechaDesde);
      const hasta = new Date(fechaHasta);
      
      desde.setHours(0, 0, 0, 0);
      hasta.setHours(23, 59, 59, 999);
	  hasta.setDate(hasta.getDate() + 1); // Aumenta 1 día
      fechaPedido.setHours(0, 0, 0, 0);

      if (fechaPedido < desde || fechaPedido > hasta) return false;
      if (zonaFiltro && pedido.cliente?.distrito !== zonaFiltro) return false;
      if (estadoFiltro && pedido.estado_actual !== estadoFiltro) return false;

      return true;
    });
  }, [orders, fechaDesde, fechaHasta, zonaFiltro, estadoFiltro]);
  
  // Obtener lista de vendedores disponibles según los filtros actuales
  const vendedoresDisponibles = useMemo(() => {
    let pedidosFiltrados = pedidosPreFiltrados;
    
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
  }, [pedidosPreFiltrados, clienteFiltro]);

  // Obtener lista de clientes disponibles según los filtros actuales
  const clientesDisponibles = useMemo(() => {
    let pedidosFiltrados = pedidosPreFiltrados;
    
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
  }, [pedidosPreFiltrados, vendedorFiltro]);

  // Manejar cambio de vendedor
  const handleVendedorChange = (value: string) => {
    setVendedorFiltro(value);
    
    // Si se selecciona un vendedor y el cliente actual no está en la lista de clientes de ese vendedor, resetear cliente
    if (value && clienteFiltro) {
      const pedidosDelVendedor = pedidosPreFiltrados.filter(p => p.id_vendedor === Number(value));
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
      const pedidosDelCliente = pedidosPreFiltrados.filter(p => p.id_cliente === Number(value));
      const vendedorExiste = pedidosDelCliente.some(p => p.id_vendedor === Number(vendedorFiltro));
      if (!vendedorExiste) {
        setVendedorFiltro("");
      }
    }
  };

  // Abrir modal de confirmación
  const handleDeleteClick = (pedido: Order) => {
    setOrderToDelete(pedido);
    setShowDeleteModal(true);
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    if (!orderToDelete) return;
    
    try {
      await axios.delete(`/api/orders/${orderToDelete.id_pedido}`);
      setOrders((prev) => prev.filter((o) => o.id_pedido !== orderToDelete.id_pedido));
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el pedido");
    }
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setOrderToDelete(null);
  };

  // Función para exportar a Excel
  async function exportToExcel() {
    setExporting(true);
    setShowExportMenu(false);
    
    try {
      const XLSX = await import("xlsx");
      
      // Usar datos filtrados
      const exportData = pedidosFiltrados.map((order) => ({
        "ID Pedido": order.id_pedido,
        "Cliente": order.cliente?.razon_social ?? "",
        "Vendedor": order.vendedor?.nombre_completo ?? "",
        "Tipo Pago": order.tipo_pago,
        "Tipo Comprobante": order.tipo_comprobante,
        "Total": Number(order.total).toFixed(2),
        "Estado": order.estado_actual,
        "Zona": order.cliente?.distrito ?? "",
        "Fecha Registro": order.fecha_creacion?.substring(0, 10) ?? "",
        "Fecha Entrega": order.fecha_entrega?.substring(0, 10) ?? "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws["!cols"] = [
        { wch: 12 }, // ID Pedido
        { wch: 35 }, // Cliente
        { wch: 25 }, // Vendedor
        { wch: 12 }, // Tipo Pago
        { wch: 18 }, // Tipo Comprobante
        { wch: 12 }, // Total
        { wch: 15 }, // Estado
        { wch: 20 }, // Zona
        { wch: 15 }, // Fecha Registro
        { wch: 15 }, // Fecha Entrega
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Pedidos");

      const fecha = new Date().toISOString().split("T")[0];
      const fileName = `pedidos_${fecha}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
      alert("Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  }

  // Función para generar PDF
  async function handleGeneratePdf(id_pedido: number) {
    setGeneratingPdf(id_pedido);
    
    try {
      window.open(`/pedidos/${id_pedido}/pdf`, '_blank');
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar PDF");
    } finally {
      setGeneratingPdf(null);
    }
  }

  // Función de ordenamiento
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // Función para expandir/contraer filas
  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Obtener listas únicas para filtros de zona y estado
  const zonasUnicas = useMemo(() => {
    const zonas = orders
      .map(p => p.cliente?.distrito)
      .filter((z, i, arr) => z && arr.indexOf(z) === i)
      .sort();
    return zonas as string[];
  }, [orders]);

  const estadosUnicos = useMemo(() => {
    const estados = orders
      .map(p => p.estado_actual)
      .filter((e, i, arr) => e && arr.indexOf(e) === i)
      .sort();
    return estados as string[];
  }, [orders]);

  // Filtrar pedidos con todos los criterios
  const pedidosFiltrados = useMemo(() => {
    return pedidosPreFiltrados.filter(pedido => {
      if (vendedorFiltro && pedido.id_vendedor !== Number(vendedorFiltro)) return false;
      if (clienteFiltro && pedido.id_cliente !== Number(clienteFiltro)) return false;
      return true;
    });
  }, [pedidosPreFiltrados, vendedorFiltro, clienteFiltro]);

  // Ordenar pedidos
  const pedidosOrdenados = useMemo(() => {
    const sorted = [...pedidosFiltrados].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortColumn) {
        case "id_pedido":
          aVal = a.id_pedido;
          bVal = b.id_pedido;
          break;
        case "cliente":
          aVal = a.cliente?.razon_social ?? "";
          bVal = b.cliente?.razon_social ?? "";
          break;
        case "vendedor":
          aVal = a.vendedor?.nombre_completo ?? "";
          bVal = b.vendedor?.nombre_completo ?? "";
          break;
        case "total":
          aVal = Number(a.total);
          bVal = Number(b.total);
          break;
        case "estado_actual":
          aVal = a.estado_actual;
          bVal = b.estado_actual;
          break;
        case "distrito":
          aVal = a.cliente?.distrito ?? "";
          bVal = b.cliente?.distrito ?? "";
          break;
        case "fecha_creacion":
          aVal = new Date(a.fecha_creacion).getTime();
          bVal = new Date(b.fecha_creacion).getTime();
          break;
        case "fecha_entrega":
          aVal = new Date(a.fecha_entrega).getTime();
          bVal = new Date(b.fecha_entrega).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

    return sorted;
  }, [pedidosFiltrados, sortColumn, sortDirection]);

  // Calcular totales
  const totales = useMemo(() => {
    const montoTotal = pedidosFiltrados.reduce((sum, p) => sum + Number(p.total), 0);
    const totalPedidos = pedidosFiltrados.length;
    
    // Contar pedidos por estado
    const pedidosRegistrados = pedidosFiltrados.filter(p => 
      p.estado_actual.toLowerCase() === 'registrado'
    ).length;
	
	// Contar pedidos por estado
    const pedidosEntregados = pedidosFiltrados.filter(p => 
      p.estado_actual.toLowerCase() === 'entregado'
    ).length;
    
    // Contar clientes únicos
    const clientesUnicos = new Set(
      pedidosFiltrados.map(p => p.id_cliente)
    ).size;

    return {
      montoTotal,
      totalPedidos,
      pedidosRegistrados,
	  pedidosEntregados,
      totalClientes: clientesUnicos
    };
  }, [pedidosFiltrados]);

  // Paginación
  const totalPages = Math.ceil(pedidosOrdenados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pedidosPaginados = pedidosOrdenados.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Función para obtener el estilo del badge según el estado
  const getEstadoBadgeClass = (estado: string) => {
    const estadoLower = estado.toLowerCase();
    if (estadoLower === 'registrado') {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    } else if (estadoLower === 'entregado') {
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    } else if (estadoLower === 'cancelado') {
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/95">
          Pedidos
        </h3>
      </div>

      {/* Tarjetas de totales */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Monto Total
          </p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
            S/ {formatNumber(totales.montoTotal)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            Total de Pedidos
          </p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
            {totales.totalPedidos.toLocaleString('es-PE')}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            Pedidos Registrados
          </p>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
            {totales.pedidosRegistrados.toLocaleString('es-PE')}
          </p>
        </div>
		
		<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            Pedidos Entregados
          </p>
          <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
            {totales.pedidosEntregados.toLocaleString('es-PE')}
          </p>
        </div>

        {/*<div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            Total de Clientes
          </p>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
            {totales.totalClientes.toLocaleString('es-PE')}
          </p>
        </div> */}
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
              onChange={(e) => handleVendedorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos los vendedores</option>
              {vendedoresDisponibles.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cliente
            </label>
            <select
              value={clienteFiltro}
              onChange={(e) => handleClienteChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos los clientes</option>
              {clientesDisponibles.map(c => (
                <option key={c.id} value={c.id}>{c.razon_social}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zona
            </label>
            <select
              value={zonaFiltro}
              onChange={(e) => setZonaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todas las zonas</option>
              {zonasUnicas.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado de Entrega
            </label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              {estadosUnicos.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-md font-semibold text-gray-800 dark:text-white/95">
            Lista de Pedidos
          </h4>
          <div className="flex gap-2 items-center">
            <Link
              href="/pedidos/nuevo"
              className="px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
            >
              + Nuevo Pedido
            </Link>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Exportando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar
                  </>
                )}
              </button>
              {showExportMenu && !exporting && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <button
                    onClick={exportToExcel}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    Exportar a Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500 dark:text-gray-400">Cargando pedidos...</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("id_pedido")}
                        className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        ID
                        <SortIcon direction={sortColumn === "id_pedido" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("cliente")}
                        className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Cliente
                        <SortIcon direction={sortColumn === "cliente" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("vendedor")}
                        className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Vendedor
                        <SortIcon direction={sortColumn === "vendedor" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSort("total")}
                        className="flex items-center justify-end w-full text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Total
                        <SortIcon direction={sortColumn === "total" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleSort("estado_actual")}
                        className="flex items-center justify-center w-full text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Estado
                        <SortIcon direction={sortColumn === "estado_actual" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("distrito")}
                        className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Zona
                        <SortIcon direction={sortColumn === "distrito" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("fecha_creacion")}
                        className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Fecha Registro
                        <SortIcon direction={sortColumn === "fecha_creacion" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button
                        onClick={() => handleSort("fecha_entrega")}
                        className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hover:text-brand-600 dark:hover:text-brand-400"
                      >
                        Fecha Entrega
                        <SortIcon direction={sortColumn === "fecha_entrega" ? sortDirection : null} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pedidosPaginados.map((pedido) => (
                    <React.Fragment key={pedido.id_pedido}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleRow(pedido.id_pedido)}
                            className="flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
                          >
                            <ChevronRightIcon 
                              className={`w-4 h-4 transition-transform ${
                                expandedRow === pedido.id_pedido ? "rotate-90" : ""
                              }`}
                            />
                            #{pedido.id_pedido}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {pedido.cliente?.razon_social ?? ""}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {pedido.vendedor?.nombre_completo ?? ""}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                          S/ {formatNumber(Number(pedido.total))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getEstadoBadgeClass(pedido.estado_actual)}`}>
                            {pedido.estado_actual}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {pedido.cliente?.distrito ?? ""}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {pedido.fecha_creacion?.substring(0, 10) ?? ""}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {pedido.fecha_entrega?.substring(0, 10) ?? ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center space-x-2">
                            <Link
                              href={`/pedidos/${pedido.id_pedido}/edit`}
                              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                              aria-label="Editar pedido"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </Link>
                            <button
                              onClick={() => handleGeneratePdf(pedido.id_pedido)}
                              className="text-green-600 hover:text-green-700 dark:text-green-400 disabled:opacity-50"
                              aria-label="Generar PDF"
                              disabled={generatingPdf === pedido.id_pedido}
                              title="Descargar guía de pedido"
                            >
                              {generatingPdf === pedido.id_pedido ? (
                                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteClick(pedido)}
                              className="text-error-500 hover:text-error-600"
                              aria-label="Eliminar pedido"
                            >
                              <TrashBinIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Fila expandible con detalles del pedido */}
                      {expandedRow === pedido.id_pedido && (
                        <tr>
                          <td colSpan={9} className="px-4 py-4 bg-gray-50 dark:bg-gray-900/50">
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Detalle de Productos
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-300 dark:border-gray-600">
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        #
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Código
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Descripción
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Cantidad
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Precio Unitario
                                      </th>
                                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400">
                                        Subtotal
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {pedido.detalles?.map((detalle, index) => (
                                      <tr key={detalle.id_detalle}>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                          {index + 1}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                          {detalle.producto?.codigo_producto ?? "-"}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                          {detalle.producto?.descripcion ?? "-"}
                                        </td>
                                        <td className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">
                                          {detalle.cantidad}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                                          S/ {formatNumber(Number(detalle.precio_venta_comision))}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100 font-medium">
                                          S/ {formatNumber(Number(detalle.subtotal_venta_comision))}
                                        </td>
                                      </tr>
                                    ))}
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

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar Eliminación
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                ¿Está seguro de eliminar el siguiente pedido?
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ID Pedido:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">#{orderToDelete.id_pedido}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Cliente:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {orderToDelete.cliente?.razon_social ?? "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monto Total:</span>
                  <span className="text-sm font-semibold text-error-600 dark:text-error-400">
                    S/ {formatNumber(Number(orderToDelete.total))}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}