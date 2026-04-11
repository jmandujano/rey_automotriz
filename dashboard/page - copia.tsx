import type { Metadata } from "next";
import React from "react";
import FinancialStatisticsChart from "@/components/ecommerce/FinancialStatisticsChart";
import OrdersByMonthChart from "@/components/ecommerce/OrdersByMonthChart";
import DashboardMetrics from "@/components/ecommerce/DashboardMetrics";
import TopVendorsChart from "@/components/ecommerce/TopVendorsChart";
import TopClientsChart from "@/components/ecommerce/TopClientsChart";

/**
 * Dashboard page
 *
 * This page is the primary entry point for authenticated users. It displays
 * summary metrics, the financial statistics line chart and the top vendors
 * bar chart. By placing this component under the (admin) route group,
 * the dashboard automatically inherits the admin layout without affecting
 * the route path. The route for this page is `/dashboard`.
 */
export const metadata: Metadata = {
  title: "Dashboard | Rey Automotriz - Sistema de Gestión Empresarial",
  description:
    "Panel principal del Sistema de Gestión Empresarial de Rey Automotriz",
};

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      {/* Summary metrics */}
      <div className="col-span-12">
        <DashboardMetrics />
      </div>
      {/* Financial summary chart */}
      <div className="col-span-12 xl:col-span-6">
        <FinancialStatisticsChart />
      </div>
      {/* Orders per month chart */}
      <div className="col-span-12 xl:col-span-6">
        <OrdersByMonthChart />
      </div>
      {/* Top clients bar chart */}
      <div className="col-span-12 xl:col-span-6">
        <TopClientsChart />
      </div>
      {/* Top sellers bar chart */}
      <div className="col-span-12 xl:col-span-6">
        <TopVendorsChart />
      </div>
    </div>
  );
}
