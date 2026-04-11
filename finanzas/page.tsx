"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { PencilIcon, TrashBinIcon } from "@/icons";

interface CategoriaFinanciera {
  id_categoria_financiera: number;
  nombre_categoria: string;
}

interface MovimientoComprobante {
  id_comprobante: number;
  nombre_archivo: string;
  ruta_archivo: string;
}

interface MovimientoFinanciero {
  id_movimiento: number;
  tipo_movimiento: string;
  id_categoria_financiera: number | null;
  descripcion: string;
  monto: number;
  fecha_movimiento: string;
  id_usuario_registro: number;
  categoria?: CategoriaFinanciera | null;
  usuario?: {
    id_usuario: number;
    nombre_completo: string;
  };
  comprobantes?: MovimientoComprobante[];
}

type SortColumn = 
  | "id_movimiento" 
  | "tipo_movimiento" 
  | "categoria"
  | "monto"
  | "fecha_movimiento";

type SortDirection = "asc" | "desc";

// Iconos
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

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ExportIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Función para formatear números
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Función para formatear fecha
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
};

/**
 * MovimientosFinancierosPage
 * 
 * Módulo para gestionar movimientos financieros (ingresos y egresos)
 */
export default function MovimientosFinancierosPage() {
  const [movimientos, setMovimientos] = useState<MovimientoFinanciero[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanciera[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Estados de edición
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<MovimientoFinanciero>>({});

  // Modal de confirmación de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [movimientoToDelete, setMovimientoToDelete] = useState<MovimientoFinanciero | null>(null);

  // Modal de comprobantes
  const [showComprobantesModal, setShowComprobantesModal] = useState(false);
  const [comprobantesActuales, setComprobantesActuales] = useState<MovimientoComprobante[]>([]);

  // Modal de nuevo registro
  const [showNewModal, setShowNewModal] = useState(false);
  const [newMovimiento, setNewMovimiento] = useState({
    tipo_movimiento: "ingreso",
    id_categoria_financiera: "",
    descripcion: "",
    monto: "",
    fecha_movimiento: new Date().toISOString().split('T')[0]
  });

  // Calcular fechas por defecto (3 meses atrás y hoy)
  const getFechaInicioPorDefecto = () => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - 3);
    return fecha.toISOString().split('T')[0];
  };

  const getFechaFinPorDefecto = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Estados de filtros
  const [fechaDesde, setFechaDesde] = useState(getFechaInicioPorDefecto());
  const [fechaHasta, setFechaHasta] = useState(getFechaFinPorDefecto());
  const [tipoMovimientoFiltro, setTipoMovimientoFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  // Estados de ordenamiento
  const [sortColumn, setSortColumn] = useState<SortColumn>("id_movimiento");
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
  }, [fechaDesde, fechaHasta, tipoMovimientoFiltro, categoriaFiltro]);

  async function loadData() {
    try {
      setLoading(true);
      const [movimientosRes, categoriasRes] = await Promise.all([
        axios.get<MovimientoFinanciero[]>("/api/finances"),
        axios.get<CategoriaFinanciera[]>("/api/finances/categories")
      ]);
      setMovimientos(movimientosRes.data);
      setCategorias(categoriasRes.data);
    } catch (err) {
      console.error(err);
      alert("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter(mov => {
      const fechaMov = new Date(mov.fecha_movimiento);
      const desde = new Date(fechaDesde);
      const hasta = new Date(fechaHasta);
      
      desde.setHours(0, 0, 0, 0);
      hasta.setHours(23, 59, 59, 999);
      hasta.setDate(hasta.getDate() + 1);
      fechaMov.setHours(0, 0, 0, 0);

      if (fechaMov < desde || fechaMov > hasta) return false;
      if (tipoMovimientoFiltro && mov.tipo_movimiento !== tipoMovimientoFiltro) return false;
      if (categoriaFiltro && mov.id_categoria_financiera !== Number(categoriaFiltro)) return false;

      return true;
    });
  }, [movimientos, fechaDesde, fechaHasta, tipoMovimientoFiltro, categoriaFiltro]);

  // Calcular totales
  const totales = useMemo(() => {
    const montoIngresos = movimientosFiltrados
      .filter(m => m.tipo_movimiento === "ingreso")
      .reduce((sum, m) => sum + Number(m.monto), 0);
    
    const montoEgresos = movimientosFiltrados
      .filter(m => m.tipo_movimiento === "egreso")
      .reduce((sum, m) => sum + Number(m.monto), 0);
    
    const totalRegistros = movimientosFiltrados.length;

    return {
      montoIngresos,
      montoEgresos,
      totalRegistros
    };
  }, [movimientosFiltrados]);

  // Ordenar movimientos
  const movimientosOrdenados = useMemo(() => {
    const sorted = [...movimientosFiltrados];
    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case "id_movimiento":
          aVal = a.id_movimiento;
          bVal = b.id_movimiento;
          break;
        case "tipo_movimiento":
          aVal = a.tipo_movimiento;
          bVal = b.tipo_movimiento;
          break;
        case "categoria":
          aVal = a.categoria?.nombre_categoria ?? "";
          bVal = b.categoria?.nombre_categoria ?? "";
          break;
        case "monto":
          aVal = a.monto;
          bVal = b.monto;
          break;
        case "fecha_movimiento":
          aVal = new Date(a.fecha_movimiento).getTime();
          bVal = new Date(b.fecha_movimiento).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [movimientosFiltrados, sortColumn, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(movimientosOrdenados.length / itemsPerPage);
  const movimientosPaginados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return movimientosOrdenados.slice(start, start + itemsPerPage);
  }, [movimientosOrdenados, currentPage]);

  // Función para cambiar ordenamiento
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Función para ir a página específica
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Funciones de edición
  const startEdit = (movimiento: MovimientoFinanciero) => {
    setEditingRow(movimiento.id_movimiento);
    setEditData({
      tipo_movimiento: movimiento.tipo_movimiento,
      id_categoria_financiera: movimiento.id_categoria_financiera,
      descripcion: movimiento.descripcion,
      monto: movimiento.monto,
      fecha_movimiento: movimiento.fecha_movimiento
    });
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const saveEdit = async (id: number) => {
    try {
      // Validaciones
      if (!editData.tipo_movimiento || !editData.descripcion || !editData.monto || !editData.fecha_movimiento) {
        alert("Todos los campos son obligatorios");
        return;
      }

      if (Number(editData.monto) < 0) {
        alert("El monto no puede ser negativo");
        return;
      }

      await axios.put(`/api/finances`, {
        id,
        ...editData
      });
      await loadData();
      setEditingRow(null);
      setEditData({});
      alert("Movimiento actualizado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el movimiento");
    }
  };

  // Funciones de eliminación
  const openDeleteModal = (movimiento: MovimientoFinanciero) => {
    setMovimientoToDelete(movimiento);
    setShowDeleteModal(true);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMovimientoToDelete(null);
  };

  const confirmDelete = async () => {
    if (!movimientoToDelete) return;

    try {
      await axios.delete(`/api/finances`, {
        data: { id: movimientoToDelete.id_movimiento }
      });
      await loadData();
      setShowDeleteModal(false);
      setMovimientoToDelete(null);
      alert("Movimiento eliminado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el movimiento");
    }
  };

  // Funciones de comprobantes
  const openComprobantesModal = (comprobantes: MovimientoComprobante[] = []) => {
    setComprobantesActuales(comprobantes);
    setShowComprobantesModal(true);
  };

  const closeComprobantesModal = () => {
    setShowComprobantesModal(false);
    setComprobantesActuales([]);
  };

  const downloadComprobante = (ruta: string, nombre: string) => {
    // Implementar lógica de descarga
    const link = document.createElement('a');
    link.href = ruta;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para crear nuevo movimiento
  const openNewModal = () => {
    setShowNewModal(true);
    setNewMovimiento({
      tipo_movimiento: "ingreso",
      id_categoria_financiera: "",
      descripcion: "",
      monto: "",
      fecha_movimiento: new Date().toISOString().split('T')[0]
    });
  };

  const closeNewModal = () => {
    setShowNewModal(false);
  };

  const saveNewMovimiento = async () => {
    try {
      // Validaciones
      if (!newMovimiento.tipo_movimiento || !newMovimiento.descripcion || !newMovimiento.monto || !newMovimiento.fecha_movimiento) {
        alert("Todos los campos son obligatorios");
        return;
      }

      if (Number(newMovimiento.monto) < 0) {
        alert("El monto no puede ser negativo");
        return;
      }

      await axios.post("/api/finances", {
        ...newMovimiento,
        monto: Number(newMovimiento.monto),
        id_categoria_financiera: newMovimiento.id_categoria_financiera ? Number(newMovimiento.id_categoria_financiera) : null
      });

      await loadData();
      closeNewModal();
      alert("Movimiento creado correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al crear el movimiento");
    }
  };

  // Función para exportar a Excel
  const exportToExcel = async () => {
    setExporting(true);
    
    try {
      const XLSX = await import("xlsx");
      
      // Usar datos filtrados
      const exportData = movimientosFiltrados.map((mov) => ({
        "ID": mov.id_movimiento,
        "Tipo": mov.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso",
        "Categoría": mov.categoria?.nombre_categoria || "Sin categoría",
        "Descripción": mov.descripcion,
        "Monto": Number(mov.monto).toFixed(2),
        "Fecha": new Date(mov.fecha_movimiento).toLocaleDateString('es-PE'),
        "Usuario": mov.usuario?.nombre_completo || "N/A"
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      ws["!cols"] = [
        { wch: 10 },  // ID
        { wch: 12 },  // Tipo
        { wch: 25 },  // Categoría
        { wch: 40 },  // Descripción
        { wch: 15 },  // Monto
        { wch: 15 },  // Fecha
        { wch: 30 },  // Usuario
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Movimientos Financieros");

      const fecha = new Date();
      const fechaFormato = `${fecha.getDate().toString().padStart(2, '0')}${(fecha.getMonth() + 1).toString().padStart(2, '0')}${fecha.getFullYear()}`;
      const fileName = `movimientos_financieros_${fechaFormato}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
      alert("Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Movimientos Financieros
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Gestión de ingresos y egresos del sistema
        </p>
      </div>

      {/* Tarjetas de totales */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
            Monto Total de Ingresos
          </p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
            S/ {formatNumber(totales.montoIngresos)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
            Monto Total de Egresos
          </p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
            S/ {formatNumber(totales.montoEgresos)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            Total de Registros
          </p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
            {totales.totalRegistros.toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fecha Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <CalendarIcon className="w-4 h-4 inline mr-1" />
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Tipo de Movimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Movimiento
            </label>
            <select
              value={tipoMovimientoFiltro}
              onChange={(e) => setTipoMovimientoFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoría
            </label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              {categorias.map(cat => (
                <option key={cat.id_categoria_financiera} value={cat.id_categoria_financiera}>
                  {cat.nombre_categoria}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Botones de acción */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: <span className="font-semibold">{movimientosOrdenados.length.toLocaleString('es-PE')}</span> registros
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              disabled={exporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ExportIcon className="w-4 h-4" />
              {exporting ? "Exportando..." : "Exportar"}
            </button>
            <button
              onClick={openNewModal}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Nuevo Registro
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando movimientos...</p>
          </div>
        ) : movimientosPaginados.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No se encontraron movimientos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      onClick={() => handleSort("id_movimiento")}
                    >
                      ID Movimiento
                      <SortIcon direction={sortColumn === "id_movimiento" ? sortDirection : null} />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      onClick={() => handleSort("tipo_movimiento")}
                    >
                      Tipo
                      <SortIcon direction={sortColumn === "tipo_movimiento" ? sortDirection : null} />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      onClick={() => handleSort("categoria")}
                    >
                      Categoría
                      <SortIcon direction={sortColumn === "categoria" ? sortDirection : null} />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th 
                      className="px-4 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      onClick={() => handleSort("monto")}
                    >
                      Monto
                      <SortIcon direction={sortColumn === "monto" ? sortDirection : null} />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                      onClick={() => handleSort("fecha_movimiento")}
                    >
                      Fecha
                      <SortIcon direction={sortColumn === "fecha_movimiento" ? sortDirection : null} />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {movimientosPaginados.map((mov) => (
                    <tr key={mov.id_movimiento} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {/* ID Movimiento */}
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                        #{mov.id_movimiento}
                      </td>

                      {/* Tipo Movimiento */}
                      <td className="px-4 py-3 text-sm">
                        {editingRow === mov.id_movimiento ? (
                          <select
                            value={editData.tipo_movimiento}
                            onChange={(e) => setEditData({ ...editData, tipo_movimiento: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="ingreso">Ingreso</option>
                            <option value="egreso">Egreso</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            mov.tipo_movimiento === "ingreso" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {mov.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                          </span>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {editingRow === mov.id_movimiento ? (
                          <select
                            value={editData.id_categoria_financiera ?? ""}
                            onChange={(e) => setEditData({ ...editData, id_categoria_financiera: e.target.value ? Number(e.target.value) : null })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="">Sin categoría</option>
                            {categorias.map(cat => (
                              <option key={cat.id_categoria_financiera} value={cat.id_categoria_financiera}>
                                {cat.nombre_categoria}
                              </option>
                            ))}
                          </select>
                        ) : (
                          mov.categoria?.nombre_categoria ?? "Sin categoría"
                        )}
                      </td>

                      {/* Descripción */}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {editingRow === mov.id_movimiento ? (
                          <input
                            type="text"
                            value={editData.descripcion}
                            onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        ) : (
                          <div className="max-w-xs truncate" title={mov.descripcion}>
                            {mov.descripcion}
                          </div>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3 text-sm text-right">
                        {editingRow === mov.id_movimiento ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editData.monto}
                            onChange={(e) => setEditData({ ...editData, monto: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right"
                          />
                        ) : (
                          <span className={`font-semibold ${
                            mov.tipo_movimiento === "ingreso"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}>
                            {mov.tipo_movimiento === "ingreso" ? "+" : "-"} S/ {formatNumber(mov.monto)}
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {editingRow === mov.id_movimiento ? (
                          <input
                            type="date"
                            value={editData.fecha_movimiento?.split('T')[0]}
                            onChange={(e) => setEditData({ ...editData, fecha_movimiento: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        ) : (
                          formatDate(mov.fecha_movimiento)
                        )}
                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {mov.usuario?.nombre_completo ?? "N/A"}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-sm">
                        {editingRow === mov.id_movimiento ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => saveEdit(mov.id_movimiento)}
                              className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              title="Guardar"
                            >
                              <CheckIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                              title="Cancelar"
                            >
                              <XIcon className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => startEdit(mov)}
                              className="p-1 text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
                              title="Editar"
                            >
                              <PencilIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(mov)}
                              className="p-1 text-error-600 hover:text-error-800 dark:text-error-400 dark:hover:text-error-300"
                              title="Eliminar"
                            >
                              <TrashBinIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => openComprobantesModal(mov.comprobantes)}
                              className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Ver comprobantes"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 px-4 pb-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando {((currentPage - 1) * itemsPerPage + 1).toLocaleString('es-PE')} a{" "}
                  {Math.min(currentPage * itemsPerPage, movimientosOrdenados.length).toLocaleString('es-PE')} de{" "}
                  {movimientosOrdenados.length.toLocaleString('es-PE')} registros
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
      {showDeleteModal && movimientoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar Eliminación
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                ¿Está seguro de eliminar el siguiente movimiento?
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ID Movimiento:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">#{movimientoToDelete.id_movimiento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tipo:</span>
                  <span className={`text-sm font-semibold ${
                    movimientoToDelete.tipo_movimiento === "ingreso"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {movimientoToDelete.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Monto:</span>
                  <span className={`text-sm font-semibold ${
                    movimientoToDelete.tipo_movimiento === "ingreso"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    S/ {formatNumber(movimientoToDelete.monto)}
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

      {/* Modal de comprobantes */}
      {showComprobantesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comprobantes
              </h3>
              <button
                onClick={closeComprobantesModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {comprobantesActuales.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No se tienen comprobantes adjuntos para este movimiento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comprobantesActuales.map((comp) => (
                  <div key={comp.id_comprobante} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="aspect-video bg-gray-100 dark:bg-gray-900 rounded mb-3 flex items-center justify-center overflow-hidden">
                      <img
                        src={comp.ruta_archivo}
                        alt={comp.nombre_archivo}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<p class="text-gray-500 text-sm">No se puede mostrar la imagen</p>';
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 truncate" title={comp.nombre_archivo}>
                      {comp.nombre_archivo}
                    </p>
                    <button
                      onClick={() => downloadComprobante(comp.ruta_archivo, comp.nombre_archivo)}
                      className="w-full px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <DownloadIcon className="w-4 h-4" />
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de nuevo registro */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Nuevo Movimiento Financiero
                </h3>
                <button
                  onClick={closeNewModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tipo de Movimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Movimiento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newMovimiento.tipo_movimiento}
                    onChange={(e) => setNewMovimiento({ ...newMovimiento, tipo_movimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newMovimiento.id_categoria_financiera}
                    onChange={(e) => setNewMovimiento({ ...newMovimiento, id_categoria_financiera: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="">Seleccione una categoría</option>
                    {categorias.map(cat => (
                      <option key={cat.id_categoria_financiera} value={cat.id_categoria_financiera}>
                        {cat.nombre_categoria}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newMovimiento.monto}
                    onChange={(e) => setNewMovimiento({ ...newMovimiento, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha de Movimiento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newMovimiento.fecha_movimiento}
                    onChange={(e) => setNewMovimiento({ ...newMovimiento, fecha_movimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newMovimiento.descripcion}
                    onChange={(e) => setNewMovimiento({ ...newMovimiento, descripcion: e.target.value })}
                    rows={4}
                    placeholder="Ingrese una descripción detallada del movimiento..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={closeNewModal}
                  className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNewMovimiento}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}