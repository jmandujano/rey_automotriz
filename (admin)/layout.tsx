import type { Metadata } from "next";
import AdminShell from "@/components/layout/AdminShell";
import React from "react";

export const metadata: Metadata = {
  title: "Dashboard | Rey Automotriz - Sistema de Gestión Empresarial",
  description:
    "Panel principal del Sistema de Gestión Empresarial de Rey Automotriz",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
