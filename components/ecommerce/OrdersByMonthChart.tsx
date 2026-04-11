"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

// Dynamically import ApexChart to avoid SSR issues.  Without this
// deferral, the ApexCharts library would be bundled into the server
// output and cause hydration mismatches.
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface OrdersPerMonth {
  month: number;
  orders: number;
}

/**
 * OrdersByMonthChart
 *
 * Renders a smooth line chart showing the number of orders per
 * month for the current year. Data is retrieved from
 * `/api/orders/summary`, which returns an array of 12 objects
 * `{ month: number, orders: number }`. Missing months are
 * represented as zeros. The chart uses Rey Automotriz corporate
 * colours and the same styling conventions as the financial
 * statistics component.
 */
export default function OrdersByMonthChart() {
  const [series, setSeries] = useState<{ name: string; data: number[] }[]>([
    { name: "Pedidos", data: Array(12).fill(0) },
  ]);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch("/api/orders/summary");
        if (!res.ok) throw new Error("Error al cargar los pedidos mensuales");
        const data: OrdersPerMonth[] = await res.json();
        const counts = data.map((item) => item.orders);
        setSeries([{ name: "Pedidos", data: counts }]);
      } catch (err) {
        console.error(err);
      }
    }
    fetchSummary();
  }, []);

  // Define the chart options.  A minimal set of options is
  // configured here to align with the design guidelines used on
  // other charts.  The chart height matches that of the
  // FinancialStatisticsChart for visual consistency.
  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: { show: false },
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    colors: ["#0042dc"],
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      x: {
        formatter: (val: any) => {
          const months = [
            "Ene",
            "Feb",
            "Mar",
            "Abr",
            "May",
            "Jun",
            "Jul",
            "Ago",
            "Sep",
            "Oct",
            "Nov",
            "Dic",
          ];
          return months[val] ?? val;
        },
      },
      y: {
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    xaxis: {
      type: "category",
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    legend: { show: false },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Pedidos por mes
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Número de pedidos realizados por mes en el año
          </p>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <ReactApexChart options={options} series={series} type="area" height={310} />
        </div>
      </div>
    </div>
  );
}