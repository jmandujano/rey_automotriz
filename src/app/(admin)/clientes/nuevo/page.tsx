"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import { useLoading } from "@/context/LoadingContext";

interface Seller {
  id_usuario: number;
  nombre_completo: string;
}

/**
 * NewClientPage
 *
 * Allows administrators and vendors to register new clients. If the
 * current user is a vendor, the client is automatically associated
 * with them. Administrators can select any vendor from a dropdown.
 */
export default function NewClientPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const roleId = (session?.user as any)?.roleId as number | undefined;
  const isAdmin = roleId === 1;
  const isVendor = roleId === 2;
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { startLoading, stopLoading } = useLoading();
  const [form, setForm] = useState({
    id_vendedor_asignado: "",
    ruc: "",
    razon_social: "",
    nombre_representante: "",
    cumpleanos_representante: "",
    correo_electronico: "",
    telefono_principal: "",
    telefono_secundario: "",
    dni_representante: "",
    tipo_cliente: "",
    departamento: "",
    provincia: "",
    distrito: "",
    direccion: "",
  });

  useEffect(() => {
    if (isAdmin) {
      // Fetch sellers to populate dropdown
      axios
        .get<Seller[]>("/api/users?rol=Vendedor")
        .then((res) => setSellers(res.data.map((u) => ({ id_usuario: u.id_usuario, nombre_completo: u.nombre_completo }))) )
        .catch((err) => console.error(err));
    }
  }, [isAdmin]);

  if (!isAdmin && !isVendor) {
    return <div className="p-4">No autorizado</div>;
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación de campos requeridos
    if (!form.razon_social.trim()) {
      setError("La razón social es requerida");
      return;
    }
    if (!form.correo_electronico.trim()) {
      setError("El correo electrónico es requerido");
      return;
    }
    if (isAdmin && !form.id_vendedor_asignado) {
      setError("Debe seleccionar un vendedor");
      return;
    }

    try {
      const payload: any = {
        ...form,
      };
      // Convert empty strings to undefined so API can handle correctly
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") payload[key] = undefined;
      });
      if (isAdmin) {
        payload.id_vendedor_asignado = form.id_vendedor_asignado ? Number(form.id_vendedor_asignado) : undefined;
      } else if (isVendor) {
        payload.id_vendedor_asignado = Number((session?.user as any)?.id);
      }
      // Start global loading
      startLoading();
      await axios.post("/api/clients", payload);
      router.push("/clientes");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Error al crear cliente";
      setError(msg);
    } finally {
      // Stop global loading
      stopLoading();
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Nuevo Cliente" />
      <ComponentCard title="Registrar nuevo cliente">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-error-100 p-2 text-error-700 dark:bg-error-500 dark:text-white">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="razon_social">Razón social *</Label>
            <input
              id="razon_social"
              name="razon_social"
              type="text"
              value={form.razon_social}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="ruc">RUC</Label>
            <input
              id="ruc"
              name="ruc"
              type="text"
              value={form.ruc}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="correo_electronico">Correo electrónico *</Label>
            <input
              id="correo_electronico"
              name="correo_electronico"
              type="email"
              value={form.correo_electronico}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="telefono_principal">Teléfono principal</Label>
            <input
              id="telefono_principal"
              name="telefono_principal"
              type="text"
              value={form.telefono_principal}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="telefono_secundario">Teléfono secundario</Label>
            <input
              id="telefono_secundario"
              name="telefono_secundario"
              type="text"
              value={form.telefono_secundario}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="nombre_representante">Nombre del representante</Label>
            <input
              id="nombre_representante"
              name="nombre_representante"
              type="text"
              value={form.nombre_representante}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="cumpleanos_representante">Cumpleaños del representante</Label>
            <input
              id="cumpleanos_representante"
              name="cumpleanos_representante"
              type="date"
              value={form.cumpleanos_representante}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="dni_representante">DNI del representante</Label>
            <input
              id="dni_representante"
              name="dni_representante"
              type="text"
              value={form.dni_representante}
              onChange={handleChange}
              maxLength={8}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="tipo_cliente">Tipo de cliente</Label>
            <select
              id="tipo_cliente"
              name="tipo_cliente"
              value={form.tipo_cliente}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccione</option>
              <option value="natural">Persona natural</option>
              <option value="juridica">Persona jurídica</option>
            </select>
          </div>
          <div>
            <Label htmlFor="departamento">Departamento</Label>
            <input
              id="departamento"
              name="departamento"
              type="text"
              value={form.departamento}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="provincia">Provincia</Label>
            <input
              id="provincia"
              name="provincia"
              type="text"
              value={form.provincia}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="distrito">Distrito</Label>
            <input
              id="distrito"
              name="distrito"
              type="text"
              value={form.distrito}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              value={form.direccion}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {isAdmin && (
            <div>
              <Label htmlFor="id_vendedor_asignado">Vendedor asignado *</Label>
              <select
                id="id_vendedor_asignado"
                name="id_vendedor_asignado"
                value={form.id_vendedor_asignado}
                onChange={handleChange}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Seleccione vendedor</option>
                {sellers.map((s) => (
                  <option key={s.id_usuario} value={s.id_usuario}>
                    {s.nombre_completo}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex space-x-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              Crear cliente
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}