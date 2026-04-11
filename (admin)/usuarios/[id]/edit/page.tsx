"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react";

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

interface User {
  id_usuario: number;
  correo_electronico: string;
  nombre_completo: string;
  estado: string;
  id_rol?: number;
  rol?: Role;
  dni?: string | null;
  fecha_nacimiento?: string | null;
  telefono_principal?: string | null;
  telefono_secundario?: string | null;
}

/**
 * EditUserPage
 *
 * This page fetches a user by ID from `/api/users/[id]` and
 * prepopulates a form allowing administrators to update the user's
 * basic information. Upon submission, it sends a PUT request to
 * `/api/users/[id]` and navigates back to the users list.
 */
export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Determine current user role to enforce UI restrictions
  const { data: session } = useSession();
  const isAdmin = session?.user?.roleId === 1;
  const { startLoading, stopLoading } = useLoading();

  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (!userId) return;
    // Fetch user details
    axios.get(`/api/users/${userId}`).then((res) => {
      setUser(res.data);
    });
    // Fetch roles
    axios.get<Role[]>("/api/roles").then((res) => setRoles(res.data));
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!user) return;
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      // Iniciar indicador de carga
      startLoading();
      await axios.put(`/api/users/${userId}`, {
        correo_electronico: user.correo_electronico,
        nombre_completo: user.nombre_completo,
        id_rol: user.id_rol ? Number(user.id_rol) : undefined,
        estado: user.estado,
        dni: user.dni || undefined,
        fecha_nacimiento: user.fecha_nacimiento || undefined,
        telefono_principal: user.telefono_principal || undefined,
        telefono_secundario: user.telefono_secundario || undefined,
      });
      router.push("/usuarios");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el usuario");
    } finally {
      // Detener indicador de carga
      stopLoading();
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Editar Usuario" />
      <ComponentCard title={`Editar usuario #${user.id_usuario}`}> 
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="correo_electronico">Correo electrónico</Label>
            <Input
              id="correo_electronico"
              name="correo_electronico"
              type="email"
              defaultValue={user.correo_electronico}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="nombre_completo">Nombre completo</Label>
            <Input
              id="nombre_completo"
              name="nombre_completo"
              type="text"
              defaultValue={user.nombre_completo}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="id_rol">Rol</Label>
            <select
            id="id_rol"
            name="id_rol"
            defaultValue={user.id_rol}
            onChange={handleChange}
            className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 disabled:opacity-50"
            disabled={!isAdmin}
          >
              <option value="">Seleccione rol</option>
              {roles.map((role) => (
                <option key={role.id_rol} value={role.id_rol}>
                  {role.nombre_rol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="estado">Estado</Label>
            <select
              id="estado"
              name="estado"
              defaultValue={user.estado}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 disabled:opacity-50"
             disabled={!isAdmin}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          {/* Additional personal fields */}
          <div>
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              name="dni"
              type="text"
              defaultValue={user.dni ?? ""}
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
              defaultValue={user.fecha_nacimiento ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_principal">Teléfono principal</Label>
            <Input
              id="telefono_principal"
              name="telefono_principal"
              type="text"
              defaultValue={user.telefono_principal ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_secundario">Teléfono secundario</Label>
            <Input
              id="telefono_secundario"
              name="telefono_secundario"
              type="text"
              defaultValue={user.telefono_secundario ?? ""}
              onChange={handleChange}
            />
          </div>
          <div className="flex space-x-2">
            <Button type="submit" size="sm">Guardar cambios</Button>
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