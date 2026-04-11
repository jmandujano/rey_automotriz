"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";

interface UserDetail {
  id_usuario: number;
  correo_electronico: string;
  nombre_completo: string;
  telefono_principal?: string | null;
  telefono_secundario?: string | null;
  fecha_nacimiento?: string | null;
  dni?: string | null;
}

/**
 * PerfilPage
 *
 * Displays and allows editing of the current user's own profile
 * information. Users can update their name, email, phone numbers, DNI
 * and password. Role and estado cannot be modified here.
 */
export default function PerfilPage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const id = session.user.id;
    axios.get(`/api/users/${id}`).then((res) => {
      setUser(res.data);
      setForm({
        correo_electronico: res.data.correo_electronico,
        nombre_completo: res.data.nombre_completo,
        telefono_principal: res.data.telefono_principal ?? "",
        telefono_secundario: res.data.telefono_secundario ?? "",
        dni: res.data.dni ?? "",
      });
    });
  }, [session]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const payload: any = { ...form };
      // Remove empty strings
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") payload[key] = undefined;
      });
      // If user changed password, include contrasena
      if (payload.contrasena && payload.contrasena !== "") {
        payload.contrasena = payload.contrasena;
      } else {
        delete payload.contrasena;
      }
      await axios.put(`/api/users/${session?.user?.id}`, payload);
      setMessage("Perfil actualizado correctamente");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Error al actualizar el perfil";
      setError(msg);
    }
  };

  if (!session?.user?.id) return <div className="p-4">Cargando...</div>;
  if (!user) return <div className="p-4">Cargando...</div>;

  return (
    <div>
      <PageBreadcrumb pageTitle="Perfil" />
      <ComponentCard title="Mi Perfil">
        {message && (
          <div className="mb-2 rounded bg-success-100 p-2 text-success-700 dark:bg-success-500 dark:text-white">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-2 rounded bg-error-100 p-2 text-error-700 dark:bg-error-500 dark:text-white">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="correo_electronico">Correo electrónico</Label>
            <Input
              id="correo_electronico"
              name="correo_electronico"
              type="email"
              required
              value={form.correo_electronico || ""}
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
              value={form.nombre_completo || ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_principal">Teléfono principal</Label>
            <Input
              id="telefono_principal"
              name="telefono_principal"
              type="text"
              value={form.telefono_principal || ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_secundario">Teléfono secundario</Label>
            <Input
              id="telefono_secundario"
              name="telefono_secundario"
              type="text"
              value={form.telefono_secundario || ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              name="dni"
              type="text"
              value={form.dni || ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="contrasena">Nueva contraseña</Label>
            <Input
              id="contrasena"
              name="contrasena"
              type="password"
              value={form.contrasena || ""}
              onChange={handleChange}
            />
          </div>
          <Button type="submit" size="sm">Guardar cambios</Button>
        </form>
      </ComponentCard>
    </div>
  );
}