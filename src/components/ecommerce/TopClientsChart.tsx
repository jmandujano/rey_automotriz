"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

// Dynamically import ApexChart to avoid SSR issues.  This ensures that
// the chart library is only loaded on the client, preventing
// hydration errors.
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ClientData {
  id_cliente: number;
  nombre_cliente: string;
  monto_total: number;
}

/**
 * TopClientsChart
 *
 * Displays a horizontal bar chart showing the top 5 clients by total
 * sales. Data is fetched from `/api/reports/top-clients`. Values
 * are rounded to the nearest integer for clarity. The bar colours
 * follow the Rey Automotriz corporate palette. When there are no
 * sales data available a simple message is displayed.
 */
export default function TopClientsChart() {
  const [series, setSeries] = useState<any[]>([{ name: "Ventas", data: [] }]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/reports/top-clients");
        if (!res.ok) throw new Error("Error al cargar ventas por cliente");
        const data: ClientData[] = await res.json();
        setCategories(data.map((d) => d.nombre_cliente));
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
    colors: ["#C7002E"],
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
        Top 5 clientes por ventas
      </h3>
      {series[0].data.length > 0 ? (
        <ReactApexChart options={options} series={series} type="bar" height={320} />
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de ventas.</p>
      )}
    </div>
  );
}