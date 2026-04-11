"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { ColumnDef } from "@tanstack/react-table";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import { DataTable } from "@/components/tables/DataTable";
import { PencilIcon, TrashBinIcon, LockIcon } from "@/icons";

interface User {
  id_usuario: number;
  correo_electronico: string;
  nombre_completo: string;
  estado: string;
  rol?: { id_rol: number; nombre_rol: string };
  fecha_ultimo_acceso?: string | null;
}

/**
 * UsuariosPage
 *
 * Displays a list of system users using DataTable component powered by @tanstack/react-table.
 * Features: sorting, filtering, pagination, role-based permissions, and password reset.
 * Data is loaded from `/api/users`.
 */
export default function UsuariosPage() {
  const { data: session } = useSession();
  const roleId = session?.user?.roleId as number | undefined;
  const isAdmin = roleId === 1;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<User[]>("/api/users")
      .then((res) => {
        setUsers(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("¿Desea eliminar este usuario?")) return;
    try {
      await axios.delete(`/api/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id_usuario !== id));
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el usuario");
    }
  }

  /*async function handleResetPassword(id: number) {
    if (!confirm("¿Desea restablecer la contraseña de este usuario?")) return;
    try {
      const res = await axios.post(`/api/users/${id}/reset-password`);
      const { tempPassword } = res.data;
      alert(
        `La contraseña temporal del usuario es: ${tempPassword}.\nPídale que inicie sesión y cambie su contraseña.`
      );
    } catch (err: any) {
      const msg = err.response?.data?.error || "No se pudo restablecer la contraseña";
      alert(msg);
    }
  }*/

  // Column definitions for DataTable
  const columns: ColumnDef<User, any>[] = [
    {
      accessorKey: "correo_electronico",
      header: "Correo",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      accessorKey: "nombre_completo",
      header: "Nombre",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      id: "rol",
      accessorFn: (row) => row.rol?.nombre_rol ?? "",
      header: "Rol",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      accessorKey: "estado",
      header: "Estado",
      enableSorting: true,
      enableColumnFilter: true,
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const user = row.original;

        return isAdmin ? (
          <div className="flex space-x-2">
            <Link
              href={`/usuarios/${user.id_usuario}/edit`}
              className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              aria-label="Editar usuario"
            >
              <PencilIcon className="w-5 h-5" />
            </Link>
            <button
              //onClick={() => handleResetPassword(user.id_usuario)}
              title="Restablecer contraseña"
              className="text-warning-500 hover:text-warning-600"
              aria-label="Restablecer contraseña"
            >
              <LockIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleDelete(user.id_usuario)}
              className="text-error-500 hover:text-error-600"
              aria-label="Eliminar usuario"
            >
              <TrashBinIcon className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex space-x-2 opacity-50 cursor-not-allowed">
            <span title="Editar usuario">
              <PencilIcon className="w-5 h-5" />
            </span>
            <span title="Restablecer contraseña">
              <LockIcon className="w-5 h-5" />
            </span>
            <span title="Eliminar usuario">
              <TrashBinIcon className="w-5 h-5" />
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageBreadcrumb pageTitle="Usuarios" />

      {isAdmin && (
        <div className="mb-4">
          <Link
            href="/usuarios/nuevo"
            className="inline-block rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Nuevo usuario
          </Link>
        </div>
      )}

      <ComponentCard title="Lista de usuarios">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Cargando usuarios...
          </div>
        ) : (
          <DataTable
            data={users}
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