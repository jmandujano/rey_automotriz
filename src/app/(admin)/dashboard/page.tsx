"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./dashboard-datepicker.css"; // Estilos personalizados

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface DashboardStats {
  finanzas: {
    totalVentas: number;
    ventasComputadas: number;
    creditosPendientes: number;
    totalGastos: number;
  };
  pedidos: {
    total: number;
    entregados: number;
    pendientes: number;
    cancelados: number;
  };
  graficos: {
    finanzasPorMes: {
      categorias: string[];
      series: Array<{ name: string; data: number[] }>;
    };
    ventasPorVendedor: {
      categorias: string[];
      series: Array<{ name: string; data: number[] }>;
    };
    top5Clientes: {
      categorias: string[];
      data: number[];
    };
    top5Vendedores: {
      categorias: string[];
      data: number[];
    };
  };
}

/**
 * Dashboard Component
 * 
 * Displays comprehensive business statistics including:
 * - Financial metrics (sales, computed sales, pending credits, expenses)
 * - Order metrics (total, delivered, pending, cancelled)
 * - Charts (financial trends, sales by vendor, top clients/vendors)
 */
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Default to last year
  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  // Estados para el filtro temporal (no ejecutan la búsqueda)
  const [tempFechaInicio, setTempFechaInicio] = useState<Date | null>(oneYearAgo);
  const [tempFechaFin, setTempFechaFin] = useState<Date | null>(now);
  
  // Estados para las fechas aplicadas (ejecutan la búsqueda)
  const [fechaInicio, setFechaInicio] = useState<Date>(oneYearAgo);
  const [fechaFin, setFechaFin] = useState<Date>(now);

  useEffect(() => {
    loadStats();
  }, [fechaInicio, fechaFin]);

  // Función para aplicar los filtros
  const aplicarFiltros = () => {
    if (tempFechaInicio && tempFechaFin) {
      setFechaInicio(tempFechaInicio);
      setFechaFin(tempFechaFin);
    }
  };

  async function loadStats() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
      });
      
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Formato de moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
    }).format(value);
  };

  // Opciones para gráfico de líneas - Finanzas
  const finanzasChartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      toolbar: { show: false },
    },
    colors: ["#0042dc", "#10B981", "#C7002E"],
    stroke: {
      curve: "smooth",
      width: [2, 2, 2],
    },
    markers: {
      size: 0,
      hover: { size: 6 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    legend: {
      position: "top",
      horizontalAlign: "left",
    },
    xaxis: {
      categories: stats?.graficos.finanzasPorMes.categorias || [],
      labels: {
        formatter: (val: string) => {
          if (!val || typeof val !== 'string') return '';
          const [year, month] = val.split('-');
          const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
          return monthNames[parseInt(month) - 1] || '';
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `S/ ${Math.round(value)}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
  };

  // Opciones para gráfico de líneas - Ventas por Vendedor
  const vendedoresChartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      toolbar: { show: false },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    markers: {
      size: 0,
      hover: { size: 6 },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    legend: {
      position: "top",
      horizontalAlign: "left",
    },
    xaxis: {
      categories: stats?.graficos.ventasPorVendedor.categorias || [],
      labels: {
        formatter: (val: string) => {
          if (!val || typeof val !== 'string') return '';
          const [year, month] = val.split('-');
          const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
          return monthNames[parseInt(month) - 1] || '';
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => `S/ ${Math.round(value)}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
  };

  // Opciones para gráfico de barras - Top Clientes
  const clientesChartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
      },
    },
    colors: ["#0042dc"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: stats?.graficos.top5Clientes.categorias || [],
      labels: {
        formatter: (value: string) => `S/ ${Math.round(Number(value))}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
  };

  // Opciones para gráfico de barras - Top Vendedores
  const vendedoresTopChartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
      },
    },
    colors: ["#C7002E"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: stats?.graficos.top5Vendedores.categorias || [],
      labels: {
        formatter: (value: string) => `S/ ${Math.round(Number(value))}`,
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => formatCurrency(value),
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Cargando estadísticas...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">Error al cargar estadísticas</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de Fecha */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          Filtros de Período
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha Inicio
            </label>
            <DatePicker
              selected={tempFechaInicio}
              onChange={(date) => setTempFechaInicio(date)}
              dateFormat="dd/MM/yyyy"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white cursor-pointer"
              customInput={
                <button type="button" className="w-full text-left flex items-center justify-between rounded-lg border border-gray-300 px-4 py-2 hover:border-blue-500 focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <span>{tempFechaInicio ? tempFechaInicio.toLocaleDateString('es-PE') : 'Seleccionar fecha'}</span>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha Fin
            </label>
            <DatePicker
              selected={tempFechaFin}
              onChange={(date) => setTempFechaFin(date)}
              dateFormat="dd/MM/yyyy"
              minDate={tempFechaInicio || undefined}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white cursor-pointer"
              customInput={
                <button type="button" className="w-full text-left flex items-center justify-between rounded-lg border border-gray-300 px-4 py-2 hover:border-blue-500 focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  <span>{tempFechaFin ? tempFechaFin.toLocaleDateString('es-PE') : 'Seleccionar fecha'}</span>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              }
            />
          </div>
          <div>
            <button
              onClick={aplicarFiltros}
              disabled={!tempFechaInicio || !tempFechaFin}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Sección de Finanzas */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">
          Resumen Financiero
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Ventas"
            value={formatCurrency(stats.finanzas.totalVentas)}
            icon="💰"
            color="blue"
          />
          <StatCard
            title="Ventas Computadas"
            value={formatCurrency(stats.finanzas.ventasComputadas)}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Créditos Pendientes"
            value={formatCurrency(stats.finanzas.creditosPendientes)}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            title="Total Gastos"
            value={formatCurrency(stats.finanzas.totalGastos)}
            icon="📉"
            color="red"
          />
        </div>
      </div>

      {/* Sección de Pedidos */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">
          Resumen de Pedidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Pedidos"
            value={stats.pedidos.total.toString()}
            icon="📦"
            color="blue"
          />
          <StatCard
            title="Entregados"
            value={stats.pedidos.entregados.toString()}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Pendientes"
            value={stats.pedidos.pendientes.toString()}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            title="Cancelados"
            value={stats.pedidos.cancelados.toString()}
            icon="❌"
            color="red"
          />
        </div>
      </div>

      {/* Gráfico: Finanzas por Mes */}
      {stats.graficos.finanzasPorMes.series.length > 0 && stats.graficos.finanzasPorMes.categorias.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Evolución Financiera Mensual
          </h3>
          <ReactApexChart
            options={finanzasChartOptions}
            series={stats.graficos.finanzasPorMes.series}
            type="line"
            height={350}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Evolución Financiera Mensual
          </h3>
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            No hay datos disponibles para el período seleccionado
          </div>
        </div>
      )}

      {/* Gráfico: Ventas por Vendedor */}
      {stats.graficos.ventasPorVendedor.series.length > 0 && stats.graficos.ventasPorVendedor.categorias.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Ventas Computadas por Vendedor
          </h3>
          <ReactApexChart
            options={vendedoresChartOptions}
            series={stats.graficos.ventasPorVendedor.series}
            type="line"
            height={350}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
            Ventas Computadas por Vendedor
          </h3>
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            No hay datos disponibles para el período seleccionado
          </div>
        </div>
      )}

      {/* Gráficos: Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Clientes */}
        {stats.graficos.top5Clientes.data.length > 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              Top 5 Clientes
            </h3>
            <ReactApexChart
              options={clientesChartOptions}
              series={[{ name: "Ventas Computadas", data: stats.graficos.top5Clientes.data }]}
              type="bar"
              height={350}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              Top 5 Clientes
            </h3>
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              No hay datos disponibles para el período seleccionado
            </div>
          </div>
        )}

        {/* Top 5 Vendedores */}
        {stats.graficos.top5Vendedores.data.length > 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              Top 5 Vendedores
            </h3>
            <ReactApexChart
              options={vendedoresTopChartOptions}
              series={[{ name: "Ventas Computadas", data: stats.graficos.top5Vendedores.data }]}
              type="bar"
              height={350}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
              Top 5 Vendedores
            </h3>
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              No hay datos disponibles para el período seleccionado
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de tarjeta estadística
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: "blue" | "green" | "yellow" | "red";
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`rounded-full p-3 ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}