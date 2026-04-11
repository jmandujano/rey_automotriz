"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

// Dynamically import the ReactApexChart component so that the chart
// library is only loaded on the client. Without this the chart
// library would be included in the server bundle, which can
// increase build size and cause hydration mismatches.
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface FinanceSummaryItem {
  month: number;
  ingresos: number;
  egresos: number;
}

/**
 * FinancialStatisticsChart
 *
 * Displays a line/area chart comparing monthly ingresos and egresos
 * (income vs expenses) for the current year. Data is fetched from
 * the `/api/finances/summary` endpoint which returns an array of
 * 12 objects (one per month) with aggregated totals. The chart
 * styling is inspired by the TailAdmin Statistics component but
 * uses the Rey Automotriz corporate colours (#0042dc and #C7002E).
 */
export default function FinancialStatisticsChart() {
  // Initialise series state with empty arrays.  ApexCharts expects
  // numbers so we default to zeros which will be replaced once
  // data has been fetched.
  const [series, setSeries] = useState([
    { name: "Ingresos", data: Array(12).fill(0) },
    { name: "Egresos", data: Array(12).fill(0) },
  ]);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/finances/summary");
        if (!res.ok) throw new Error("Network error");
        const data: FinanceSummaryItem[] = await res.json();
        // Convert the summary into separate arrays for ingresos and egresos.
        // Round values to the nearest integer to avoid displaying
        // decimals in the chart. ApexCharts can still display
        // floating values on the y‑axis, but we want a cleaner look.
        const ingresos = data.map((item) => Math.round(item.ingresos));
        const egresos = data.map((item) => Math.round(item.egresos));
        setSeries([
          { name: "Ingresos", data: ingresos },
          { name: "Egresos", data: egresos },
        ]);
      } catch (err) {
        console.error(err);
        // If the fetch fails, leave the default zero data so the chart
        // renders an empty baseline instead of crashing.
      }
    }
    loadSummary();
  }, []);

  const options: ApexOptions = {
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#0042dc", "#C7002E"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      x: {
        formatter: (val: any) => {
          // Show month names in tooltip rather than numeric indices
          const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
          return months[val] ?? val;
        },
      },
    },
    xaxis: {
      type: "category",
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: ["#6B7280"],
        },
        // Round the tick values to integers
        formatter: (value: number) => Math.round(value).toString(),
      },
      title: {
        text: "",
        style: {
          fontSize: "0px",
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Resumen Financiero
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Evolución de ingresos y egresos mensuales
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