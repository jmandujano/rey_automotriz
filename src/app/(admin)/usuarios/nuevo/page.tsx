"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import axios from "axios";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useLoading } from "@/context/LoadingContext";

interface Role {
  id_rol: number;
  nombre_rol: string;
}

/**
 * NewUserPage
 *
 * Allows administrators to create new internal users. A form is
 * displayed with fields for email, full name, password and role. The
 * roles are fetched from the API. Only users with administrator role
 * (roleId === 1) can access this page; others will see an
 * unauthorized message.
 */
export default function NewUserPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({
    correo_electronico: "",
    nombre_completo: "",
    contrasena: "",
    confirmar: "",
    id_rol: "",
    dni: "",
    fecha_nacimiento: "",
    telefono_principal: "",
    telefono_secundario: "",
    estado: "activo",
  });
  const [error, setError] = useState<string | null>(null);
  const { startLoading, stopLoading } = useLoading();
  const isAdmin = session?.user?.roleId === 1;

  useEffect(() => {
    if (isAdmin) {
      axios.get<Role[]>("/api/roles").then((res) => setRoles(res.data));
    }
  }, [isAdmin]);

  if (!isAdmin) {
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
    if (form.contrasena !== form.confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      // Iniciar indicador de carga global
      startLoading();
      await axios.post("/api/users", {
        correo_electronico: form.correo_electronico,
        nombre_completo: form.nombre_completo,
        contrasena: form.contrasena,
        id_rol: Number(form.id_rol),
        dni: form.dni || undefined,
        fecha_nacimiento: form.fecha_nacimiento || undefined,
        telefono_principal: form.telefono_principal || undefined,
        telefono_secundario: form.telefono_secundario || undefined,
        estado: form.estado,
      });
      router.push("/usuarios");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Error al crear el usuario";
      setError(msg);
    } finally {
      // Detener indicador de carga global
      stopLoading();
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Nuevo Usuario" />
      <ComponentCard title="Registrar nuevo usuario">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-error-100 p-2 text-error-700 dark:bg-error-500 dark:text-white">
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="correo_electronico">Correo electrónico</Label>
            <Input
              id="correo_electronico"
              name="correo_electronico"
              type="email"
              required
              value={form.correo_electronico}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="nombre_completo">Nombre completo</Label>
            <Input
              id="nombre_completo"
              name="nombre_completo"
              type="text"
              required
              value={form.nombre_completo}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              name="contrasena"
              type="password"
              required
              value={form.contrasena}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="confirmar">Confirmar contraseña</Label>
            <Input
              id="confirmar"
              name="confirmar"
              type="password"
              required
              value={form.confirmar}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="id_rol">Rol</Label>
            <select
              id="id_rol"
              name="id_rol"
              required
              value={form.id_rol}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
            >
              <option value="">Seleccione rol</option>
              {roles.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre_rol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              name="dni"
              type="text"
              value={form.dni}
              onChange={handleChange}
              maxLength={8}
            />
          </div>
          <div>
            <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
            <Input
              id="fecha_nacimiento"
              name="fecha_nacimiento"
              type="date"
              value={form.fecha_nacimiento}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_principal">Teléfono principal</Label>
            <Input
              id="telefono_principal"
              name="telefono_principal"
              type="text"
              value={form.telefono_principal}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_secundario">Teléfono secundario</Label>
            <Input
              id="telefono_secundario"
              name="telefono_secundario"
              type="text"
              value={form.telefono_secundario}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              name="estado"
              value={form.estado}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <Button type="submit" size="sm">Crear usuario</Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </ComponentCard>
    </div>
  );
}