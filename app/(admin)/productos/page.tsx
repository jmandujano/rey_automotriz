"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable, createActionColumn } from "@/components/tables/DataTable";
import { PencilIcon, TrashBinIcon } from "@/icons";

// Interfaz para la importación activa
interface ProductoImportacion {
  id_importacion: number;
  precio_compra: number;
  precio_venta_comision_a: number;
  precio_venta_comision_b: number;
  precio_venta_comision_c: number;
  precio_venta_comision_d: number;
  cantidad: number;
  fecha_importacion: string;
  estado_importacion: string;
}

interface Product {
  id_producto: number;
  codigo_producto: string;
  descripcion: string;
  stock: number;
  alerta_stock: number;
  advertencia_stock: number;
  estado: string;
  categoria?: { nombre_categoria: string };
  importacionActiva?: ProductoImportacion | null;
}

/**
 * ProductosPage
 *
 * Displays a list of products using DataTable component powered by @tanstack/react-table.
 * Features: sorting, filtering, pagination, and row actions (edit/delete).
 * Data is loaded from `/api/products`.
 */
export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios
      .get<Product[]>("/api/products")
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Cerrar menú de exportación al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("¿Desea eliminar este producto?")) return;
    try {
      await axios.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id_producto !== id));
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el producto");
    }
  }

  // Función para exportar a Excel
  async function exportToExcel() {
    setExporting(true);
    setShowExportMenu(false);
    
    try {
      const XLSX = await import("xlsx");
      
      // Preparar datos para exportación
      const exportData = products.map((product) => ({
        "Código": product.codigo_producto,
        "Descripción": product.descripcion,
        "Stock": product.stock ?? 0,
        "Precio Compra": product.importacionActiva?.precio_compra ?? 0,
        "Precio A": product.importacionActiva?.precio_venta_comision_a ?? 0,
        "Precio B": product.importacionActiva?.precio_venta_comision_b ?? 0,
        "Precio C": product.importacionActiva?.precio_venta_comision_c ?? 0,
        "Precio D": product.importacionActiva?.precio_venta_comision_d ?? 0,
      }));

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Ajustar ancho de columnas
      ws["!cols"] = [
        { wch: 15 }, // Código
        { wch: 40 }, // Descripción
        { wch: 10 }, // Stock
        { wch: 15 }, // Precio Compra
        { wch: 12 }, // Precio A
        { wch: 12 }, // Precio B
        { wch: 12 }, // Precio C
        { wch: 12 }, // Precio D
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      // Generar nombre de archivo con fecha
      const fecha = new Date().toISOString().split("T")[0];
      const fileName = `productos_${fecha}.xlsx`;

      // Descargar archivo
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
      alert("Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  }

  // Función para obtener el estilo del stock según los umbrales
  function getStockStyle(stock: number, alertaStock: number, advertenciaStock: number) {
    if (stock <= alertaStock) {
      // Alerta crítica - Rojo
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-semibold px-2 py-1 rounded";
    } else if (stock <= advertenciaStock) {
      // Advertencia - Naranja
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 font-semibold px-2 py-1 rounded";
    }
    return "";
  }

  // Column definitions for DataTable
  const columns: ColumnDef<Product, any>[] = [    
    {
      accessorKey: "codigo_producto",
      header: () => <div className="text-center">Código</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <div className="text-center">{row.original.codigo_producto}</div>
      ),
    },
    {
      accessorKey: "descripcion",
      header: () => <div className="text-center">Descripción</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => (
        <div className="text-center">{row.original.descripcion}</div>
      ),
    },
    {
      accessorKey: "stock",
      header: () => <div className="text-center">Stock</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const stock = row.original.stock ?? 0;
        const alertaStock = row.original.alerta_stock ?? 0;
        const advertenciaStock = row.original.advertencia_stock ?? 0;
        const stockStyle = getStockStyle(stock, alertaStock, advertenciaStock);
        
        return (
          <div className="text-center">
            <span className={stockStyle}>{stock}</span>
          </div>
        );
      },
    },
    {
      id: "precio_compra",
      accessorFn: (row) => row.importacionActiva?.precio_compra ?? 0,
      header: () => <div className="text-center">Precio compra</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const precio = row.original.importacionActiva?.precio_compra;
        return <div className="text-center">{precio ?? 0}</div>;
      },
    },
    {
      id: "precio_venta_comision_a",
      accessorFn: (row) => row.importacionActiva?.precio_venta_comision_a ?? 0,
      header: () => <div className="text-center">Precio A</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const precio = row.original.importacionActiva?.precio_venta_comision_a;
        return (
          <div className="text-center">
            <span className="bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-1 rounded">
              {precio ?? 0}
            </span>
          </div>
        );
      },
    },
    {
      id: "precio_venta_comision_b",
      accessorFn: (row) => row.importacionActiva?.precio_venta_comision_b ?? 0,
      header: () => <div className="text-center">Precio B</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const precio = row.original.importacionActiva?.precio_venta_comision_b;
        return (
          <div className="text-center">
            <span className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded">
              {precio ?? 0}
            </span>
          </div>
        );
      },
    },
    {
      id: "precio_venta_comision_c",
      accessorFn: (row) => row.importacionActiva?.precio_venta_comision_c ?? 0,
      header: () => <div className="text-center">Precio C</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const precio = row.original.importacionActiva?.precio_venta_comision_c;
        return (
          <div className="text-center">
            <span className="bg-purple-50 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 px-2 py-1 rounded">
              {precio ?? 0}
            </span>
          </div>
        );
      },
    },
    {
      id: "precio_venta_comision_d",
      accessorFn: (row) => row.importacionActiva?.precio_venta_comision_d ?? 0,
      header: () => <div className="text-center">Precio D</div>,
      enableSorting: true,
      enableColumnFilter: true,
      cell: ({ row }) => {
        const precio = row.original.importacionActiva?.precio_venta_comision_d;
        return (
          <div className="text-center">
            <span className="bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 px-2 py-1 rounded">
              {precio ?? 0}
            </span>
          </div>
        );
      },
    },    
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div className="flex justify-center space-x-2">
          <Link
            href={`/productos/${row.original.id_producto}/edit`}
            className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
            aria-label="Editar producto"
          >
            <PencilIcon className="w-5 h-5" />
          </Link>
          <button
            onClick={() => handleDelete(row.original.id_producto)}
            className="text-error-500 hover:text-error-600"
            aria-label="Eliminar producto"
          >
            <TrashBinIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/95">
          Productos
        </h3>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header con título y botón de exportar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 sm:px-6 sm:py-5">
          <Link
            href="/productos/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Nuevo producto
          </Link>
          
          {/* Botón de exportar */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting || products.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exportar
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h1.8l1.2 2.4L12.7 13h1.8l-2.1 3 2.1 3h-1.8l-1.2-2.5-1.2 2.5H8.5l2.1-3-2.1-3z"/>
                    </svg>
                    Exportar a Excel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contenido de la tabla */}
        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Cargando productos...
            </div>
          ) : (
            <DataTable
              data={products}
              columns={columns}
              enableFilters={true}
              enablePagination={true}
              pageSize={10}
            />
          )}
        </div>
      </div>
    </div>
  );
}