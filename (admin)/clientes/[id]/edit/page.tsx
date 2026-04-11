"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { useLoading } from "@/context/LoadingContext";

interface Client {
  id_cliente: number;
  razon_social: string;
  ruc?: string | null;
  correo_electronico: string;
  telefono_principal?: string | null;
  telefono_secundario?: string | null;
  id_vendedor_asignado: number;
  nombre_representante?: string | null;
  dni_representante?: string | null;
  tipo_cliente?: string | null;
  cumpleanos_representante?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  direccion?: string | null;
  cumpleanos_representante?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  direccion?: string | null;
  vendedor?: { id_usuario: number; nombre_completo: string };
  estado: string;
}

interface Seller {
  id_usuario: number;
  nombre_completo: string;
  rol?: { id_rol: number; nombre_rol: string };
}

/**
 * EditClientPage
 *
 * Presents a form to edit a client's information. The client data
 * and list of sellers are loaded from the API. When the form is
 * submitted, a PUT request is sent to `/api/clients/[id]` and the
 * user is redirected back to the clients list.
 */
export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data: session } = useSession();
  const isVendor = session?.user?.roleId === 2;

  const { startLoading, stopLoading } = useLoading();

  const [client, setClient] = useState<Client | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);

  useEffect(() => {
    if (!clientId) return;
    axios.get(`/api/clients/${clientId}`).then((res) => setClient(res.data));
    // Fetch all users and filter to sellers (rol nombre_rol === 'Vendedor')
    axios.get<Seller[]>("/api/users").then((res) => {
      const vendedores = res.data.filter((u) => u.rol?.nombre_rol?.toLowerCase() === "vendedor");
      setSellers(vendedores);
    });
  }, [clientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!client) return;
    const { name, value } = e.target;
    setClient({ ...client, [name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!client) return;
    try {
      // iniciar indicador de carga
      startLoading();
      await axios.put(`/api/clients/${clientId}`, {
        razon_social: client.razon_social,
        ruc: client.ruc,
        correo_electronico: client.correo_electronico,
        telefono_principal: client.telefono_principal,
        telefono_secundario: client.telefono_secundario,
        id_vendedor_asignado: Number(client.id_vendedor_asignado),
        nombre_representante: client.nombre_representante,
        dni_representante: client.dni_representante,
        cumpleanos_representante: client.cumpleanos_representante,
        tipo_cliente: client.tipo_cliente,
        departamento: client.departamento,
        provincia: client.provincia,
        distrito: client.distrito,
        direccion: client.direccion,
        estado: client.estado,
      });
      router.push("/clientes");
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el cliente");
    } finally {
      // detener indicador de carga
      stopLoading();
    }
  };

  if (!client) return <div>Loading...</div>;

  return (
    <div>
      <PageBreadcrumb pageTitle="Editar Cliente" />
      <ComponentCard title={`Editar cliente #${client.id_cliente}`}> 
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="razon_social">Razón social</Label>
            <Input
              id="razon_social"
              name="razon_social"
              type="text"
              defaultValue={client.razon_social}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="ruc">RUC</Label>
            <Input
              id="ruc"
              name="ruc"
              type="text"
              defaultValue={client.ruc ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="correo_electronico">Correo electrónico</Label>
            <Input
              id="correo_electronico"
              name="correo_electronico"
              type="email"
              defaultValue={client.correo_electronico}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_principal">Teléfono principal</Label>
            <Input
              id="telefono_principal"
              name="telefono_principal"
              type="text"
              defaultValue={client.telefono_principal ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="telefono_secundario">Teléfono secundario</Label>
            <Input
              id="telefono_secundario"
              name="telefono_secundario"
              type="text"
              defaultValue={client.telefono_secundario ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="nombre_representante">Nombre del representante</Label>
            <Input
              id="nombre_representante"
              name="nombre_representante"
              type="text"
              defaultValue={client.nombre_representante ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="cumpleanos_representante">Cumpleaños del representante</Label>
            <Input
              id="cumpleanos_representante"
              name="cumpleanos_representante"
              type="date"
              defaultValue={client.cumpleanos_representante ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="dni_representante">DNI del representante</Label>
            <Input
              id="dni_representante"
              name="dni_representante"
              type="text"
              defaultValue={client.dni_representante ?? ""}
              onChange={handleChange}
              maxLength={8}
            />
          </div>
          <div>
            <Label htmlFor="tipo_cliente">Tipo de cliente</Label>
            <select
              id="tipo_cliente"
              name="tipo_cliente"
              defaultValue={client.tipo_cliente ?? ""}
              onChange={handleChange}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
            >
              <option value="">Seleccione</option>
              <option value="natural">Persona natural</option>
              <option value="juridica">Persona jurídica</option>
            </select>
          </div>
          <div>
            <Label htmlFor="departamento">Departamento</Label>
            <Input
              id="departamento"
              name="departamento"
              type="text"
              defaultValue={client.departamento ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="provincia">Provincia</Label>
            <Input
              id="provincia"
              name="provincia"
              type="text"
              defaultValue={client.provincia ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="distrito">Distrito</Label>
            <Input
              id="distrito"
              name="distrito"
              type="text"
              defaultValue={client.distrito ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              type="text"
              defaultValue={client.direccion ?? ""}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="id_vendedor_asignado">Vendedor asignado</Label>
            <select
              id="id_vendedor_asignado"
              name="id_vendedor_asignado"
              defaultValue={client.id_vendedor_asignado}
              onChange={handleChange}
              disabled={isVendor}
              className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 disabled:opacity-50"
            >
              <option value="">Seleccione vendedor</option>
              {sellers.map((seller) => (
                <option key={seller.id_usuario} value={seller.id_usuario}>
                  {seller.nombre_completo}
                </option>
              ))}
            </select>
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