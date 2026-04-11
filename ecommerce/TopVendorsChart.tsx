"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

// Dynamically import ApexChart to avoid SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface VendorData {
  id_vendedor: number;
  nombre_vendedor: string;
  monto_total: number;
}

/**
 * TopVendorsChart
 *
 * Displays a horizontal bar chart showing the top 5 vendedores by
 * total sales amount. Data is fetched from `/api/reports/top-vendors`.
 * Values are rounded to the nearest integer and rendered using
 * ApexCharts. The colour palette uses the Rey Automotriz corporate
 * colours. If no sales data is available the chart shows empty bars.
 */
export default function TopVendorsChart() {
  const [series, setSeries] = useState<any[]>([{ name: "Ventas", data: [] }]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/reports/top-vendors");
        if (!res.ok) throw new Error("Error al cargar ventas por vendedor");
        const data: VendorData[] = await res.json();
        // Extract vendor names and totals (rounded)
        setCategories(data.map((d) => d.nombre_vendedor));
        setSeries([{ name: "Ventas", data: data.map((d) => Math.round(d.monto_total)) }]);
      } catch (error) {
        console.error(error);
      }
    }
    fetchData();
  }, []);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      height: 320,
      toolbar: { show: false },
    },
    colors: ["#0042dc"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "40%",
      },
    },
    xaxis: {
      categories,
      labels: {
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: categories.map(() => "#6B7280"),
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => `S/ ${Math.round(val)}`,
      },
    },
    grid: {
      borderColor: "rgba(200,200,200,0.1)",
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        Top 5 vendedores por ventas
      </h3>
      {series[0].data.length > 0 ? (
        <ReactApexChart options={options} series={series} type="bar" height={320} />
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de ventas.</p>
      )}
    </div>
  );
}