import type { Metadata } from "next";
import React from "react";
import FinancialStatisticsChart from "@/components/ecommerce/FinancialStatisticsChart";
import DashboardMetrics from "@/components/ecommerce/DashboardMetrics";
import TopVendorsChart from "@/components/ecommerce/TopVendorsChart";

export const metadata: Metadata = {
  // Updated metadata to reflect Rey Automotriz branding
  title: "Dashboard | Rey Automotriz - Sistema de Gestión Empresarial",
  description:
    "Panel principal del Sistema de Gestión Empresarial de Rey Automotriz",
};

export default function Ecommerce() {
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
      {/* Top sellers bar chart */}
      <div className="col-span-12 xl:col-span-6">
        <TopVendorsChart />
      </div>
    </div>
  );
}
