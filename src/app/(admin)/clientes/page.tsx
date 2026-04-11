"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { PencilIcon, TrashBinIcon, CheckCircleIcon } from "@/icons";

interface Client {
  id_cliente: number;
  razon_social: string;
  ruc?: string | null;
  correo_electronico: string;
  telefono_principal?: string | null;
  vendedor: { id_usuario: number; nombre_completo: string };
  estado: string;
}

interface Visit {
  id_cliente: number;
  id_vendedor: number;
  fecha_visita: string;
  hora_visita: string;
}

/**
 * ClientesPage
 *
 * Displays a list of clients using DataTable component powered by @tanstack/react-table.
 * Features: sorting, filtering, pagination, role-based permissions, and visit tracking.
 * Data is loaded from `/api/clients` and `/api/visits`.
 */
export default function ClientesPage() {
  const { data: session } = useSession();
  const roleId = (session?.user as any)?.roleId as number | undefined;
  const isAdmin = roleId === 1;
  const isVendor = roleId === 2;
  const isOperator = roleId === 3;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitsCount, setVisitsCount] = useState<Record<number, number>>({});
  const [visitedToday, setVisitedToday] = useState<Record<number, boolean>>({});

  useEffect(() => {
    Promise.all([
      axios.get<Client[]>("/api/clients"),
      axios.get<Visit[]>("/api/visits"),
    ])
      .then(([clientsRes, visitsRes]) => {
        setClients(clientsRes.data);

        const counts: Record<number, number> = {};
        const visited: Record<number, boolean> = {};
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        visitsRes.data.forEach((visit) => {
          const clientId = visit.id_cliente;
          counts[clientId] = (counts[clientId] || 0) + 1;
          const visitDate = new Date(visit.fecha_visita);
          if (visitDate.getTime() === startOfDay.getTime()) {
            visited[clientId] = true;
          }
        });

        setVisitsCount(counts);
        setVisitedToday(visited);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("¿Desea eliminar este cliente?")) return;
    try {
      await axios.delete(`/api/clients/${id}`);
      setClients((prev) => prev.filter((c) => c.id_cliente !== id));
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el cliente");
    }
  }

  /*async function handleRegisterVisit(clientId: number) {
    try {
      await axios.post("/api/visits", { id_cliente: clientId });
      setVisitsCount((prev) => ({
        ...prev,
        [clientId]: (prev[clientId] || 0) + 1,
      }));
      setVisitedToday((prev) => ({ ...prev, [clientId]: true }));
    } catch (err: any) {
      const msg = err.response?.data?.error || "Error al registrar visita";
      alert(msg);
    }
  }*/

  // Column definitions for DataTable
  const columns: ColumnDef<Client, any>[] = [
    {
      accessorKey: "razon_social",
      header: "Razón social",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      id: "ruc",
      accessorFn: (row) => row.ruc ?? "",
      header: "RUC",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      accessorKey: "correo_electronico",
      header: "Correo",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      id: "vendedor",
      accessorFn: (row) => row.vendedor?.nombre_completo ?? "",
      header: "Vendedor",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      id: "visitas",
      accessorFn: (row) => visitsCount[row.id_cliente] ?? 0,
      header: "Visitas",
      cell: ({ row }) => (
        <div className="text-center">{visitsCount[row.original.id_cliente] ?? 0}</div>
      ),
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const client = row.original;
        const canEdit = isAdmin || (isVendor && client.vendedor?.id_usuario === Number((session?.user as any)?.id));
        const canDelete = isAdmin;
        const canVisit = isVendor && client.vendedor?.id_usuario === Number((session?.user as any)?.id);
        const alreadyVisitedToday = visitedToday[client.id_cliente];

        return (
          <div className="flex space-x-2">
            {canEdit ? (
              <Link
                href={`/clientes/${client.id_cliente}/edit`}
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                aria-label="Editar cliente"
              >
                <PencilIcon className="w-5 h-5" />
              </Link>
            ) : (
              <span className="opacity-50 cursor-not-allowed" title="No autorizado">
                <PencilIcon className="w-5 h-5" />
              </span>
            )}

            {canDelete ? (
              <button
                onClick={() => handleDelete(client.id_cliente)}
                className="text-error-500 hover:text-error-600"
                aria-label="Eliminar cliente"
                title="Eliminar cliente"
              >
                <TrashBinIcon className="w-5 h-5" />
              </button>
            ) : (
              <span className="opacity-50 cursor-not-allowed" title="No autorizado">
                <TrashBinIcon className="w-5 h-5" />
              </span>
            )}

            {canVisit ? (
              alreadyVisitedToday ? (
                <span
                  className="opacity-50 cursor-not-allowed"
                  title="Ya registró una visita hoy"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                </span>
              ) : (
                <button
                  //onClick={() => handleRegisterVisit(client.id_cliente)}
                  className="text-success-500 hover:text-success-600"
                  aria-label="Registrar visita"
                  title="Registrar visita"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                </button>
              )
            ) : (
              <span className="opacity-50 cursor-not-allowed" title="No autorizado">
                <CheckCircleIcon className="w-5 h-5" />
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Clientes" />

      {(isAdmin || isVendor) && (
        <div className="mb-4">
          <Link
            href="/clientes/nuevo"
            className="inline-block rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Nuevo cliente
          </Link>
        </div>
      )}

      <ComponentCard title="Lista de clientes">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Cargando clientes...
          </div>
        ) : (
          <DataTable
            data={clients}
            columns={columns}
            enableFilters={true}
            enablePagination={true}
            pageSize={10}
          />
        )}
      </ComponentCard>
    </div>
  );
}