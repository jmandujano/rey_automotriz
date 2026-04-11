"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Badge from "@/components/ui/badge/Badge";
import { BoxIconLine, ArrowUpIcon, ArrowDownIcon } from "@/icons";

interface Summary {
  /** Número total de productos registrados */
  productsCount: number;
  /** Número total de usuarios registrados */
  usersCount: number;
  /** Número total de pedidos registrados */
  ordersCount: number;
  /** Número total de devoluciones registradas */
  returnsCount: number;
  /** Suma total de ingresos financieros */
  totalIngresos: number;
  /** Suma total de egresos financieros */
  totalEgresos: number;
}

/**
 * DashboardMetrics
 *
 * Fetches summary counts from `/api/reports/summary` and displays
 * cards for total pedidos, productos y devoluciones. These
 * statistics are presented similarly to the TailAdmin Ecommerce
 * metrics component but use the corporate colours of Rey
 * Automotriz. The percentage badges are placeholders and can be
 * enhanced with real comparative data in the future.
 */
export default function DashboardMetrics() {
  const [summary, setSummary] = useState<Summary | null>(null);

  // Fetch dashboard summary once on mount
  useEffect(() => {
    axios
      .get<Summary>("/api/reports/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => console.error(err));
  }, []);

  // Show placeholder skeletons while loading
  if (!summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
          >
            Cargando...
          </div>
        ))}
      </div>
    );
  }

  // Format numbers as integers with thousand separators
  const formatNumber = (value: number) =>
    new Intl.NumberFormat("es-PE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // Placeholder difference percentages (0%)
  const ordersDiff = 0;
  const ingresosDiff = 0;
  const egresosDiff = 0;
  const returnsDiff = 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      {/* Ingresos Metric */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Ingresos</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              S/ {formatNumber(summary.totalIngresos)}
            </h4>
          </div>
          <Badge color={ingresosDiff >= 0 ? "success" : "error"}>
            {ingresosDiff >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(ingresosDiff)}%
          </Badge>
        </div>
      </div>
      {/* Egresos Metric */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Egresos</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              S/ {formatNumber(summary.totalEgresos)}
            </h4>
          </div>
          <Badge color={egresosDiff >= 0 ? "success" : "error"}>
            {egresosDiff >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(egresosDiff)}%
          </Badge>
        </div>
      </div>
      {/* Pedidos Metric */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Pedidos</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatNumber(summary.ordersCount)}
            </h4>
          </div>
          <Badge color={ordersDiff >= 0 ? "success" : "error"}>
            {ordersDiff >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(ordersDiff)}%
          </Badge>
        </div>
      </div>
      {/* Devoluciones Metric */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Devoluciones</span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {formatNumber(summary.returnsCount)}
            </h4>
          </div>
          <Badge color={returnsDiff >= 0 ? "success" : "error"}>
            {returnsDiff >= 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {Math.abs(returnsDiff)}%
          </Badge>
        </div>
      </div>
    </div>
  );
}