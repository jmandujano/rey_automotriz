"use client";

import React from "react";
import FinancialStatisticsChart from "@/components/ecommerce/FinancialStatisticsChart";
import DashboardMetrics from "@/components/ecommerce/DashboardMetrics";
import TopVendorsChart from "@/components/ecommerce/TopVendorsChart";

export default function DashboardContent() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <DashboardMetrics />
      </div>
      <div className="col-span-12 xl:col-span-6">
        <FinancialStatisticsChart />
      </div>
      <div className="col-span-12 xl:col-span-6">
        <TopVendorsChart />
      </div>
    </div>
  );
}
