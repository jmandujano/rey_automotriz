/**
 * NewProductPage
 *
 * Página para crear un nuevo producto con importaciones
 * Misma estructura que EditProductPage pero sin datos precargados
 */

"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

interface Category {
  id_categoria: number;
  nombre_categoria: string;
}

interface Provider {
  id_proveedor: number;
  nombre_proveedor: string;
}

// ✏️ AGREGADO: Interface para importaciones temporales
interface TempImportation {
  id_temp: number; // ID temporal para manejo en frontend
  id_proveedor: number;
  fecha_importacion: string;
  cantidad: number;
  precio_compra: number;
  margen_a: number;
  precio_venta_a: number;
  comision_a: number;
  precio_venta_comision_a: number;
  margen_b: number;
  precio_venta_b: number;
  comision_b: number;
  precio_venta_comision_b: number;
  // Campos adicionales para grupos C y D
  margen_c: number;
  precio_venta_c: number;
  comision_c: number;
  precio_venta_comision_c: number;
  margen_d: number;
  precio_venta_d: number;
  comision_d: number;
  precio_venta_comision_d: number;
  is_active: boolean;
}

interface NewImportationData {
  id_proveedor: number;
  fecha_importacion: string;
  cantidad: number;
  precio_compra: number;
  margen_a: number;
  comision_a: number;
  margen_b: number;
  comision_b: number;
  margen_c: number;
  comision_c: number;
  margen_d: number;
  comision_d: number;
}

export default function NewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // ✏️ Datos básicos del producto
  const [productData, setProductData] = useState({
    codigo_producto: "",
    descripcion: "",
    id_categoria: 0,
    estado: "activo",
  });

  // ✏️ Lista de importaciones temporales (antes de guardar)
  const [importaciones, setImportaciones] = useState<TempImportation[]>([]);
  const [selectedImportationId, setSelectedImportationId] = useState<number | null>(null);
  const [nextTempId, setNextTempId] = useState(1);

  // ✏️ Datos de la importación seleccionada para editar
  const [importationData, setImportationData] = useState<{
    id_proveedor: number;
    fecha_importacion: string;
    cantidad: number;
    precio_compra: number;
    margen_a: number;
    comision_a: number;
    margen_b: number;
    comision_b: number;
    margen_c: number;
    comision_c: number;
    margen_d: number;
    comision_d: number;
  } | null>(null);

  // ✏️ Modal para nueva importación
  const [showNewImportModal, setShowNewImportModal] = useState(false);
  const [newImportData, setNewImportData] = useState<NewImportationData>({
    id_proveedor: 0,
    fecha_importacion: new Date().toISOString().substring(0, 10),
    cantidad: 0,
    precio_compra: 0,
    margen_a: 0,
    comision_a: 0,
    margen_b: 0,
    comision_b: 0,
    margen_c: 0,
    comision_c: 0,
    margen_d: 0,
    comision_d: 0,
  });

  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [categoriesRes, providersRes] = await Promise.all([
          axios.get<Category[]>("/api/categories"),
          axios.get<Provider[]>("/api/providers")
        ]);
        
        setCategories(categoriesRes.data);
        setProviders(providersRes.data);
        setCategoriesLoaded(true);
        setLoading(false);
      } catch (err: any) {
        console.error('Error al cargar datos:', err);
        setErrorMessage('Error al cargar categorías y proveedores');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // ✏️ Calcular stock total basado en importaciones
  const calculateTotalStock = (): number => {
    return importaciones.reduce((total, imp) => total + imp.cantidad, 0);
  };

  const handleProductChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const parsedValue = name === 'id_categoria' ? Number(value) : value;
    setProductData({ ...productData, [name]: parsedValue });
  };

  const handleImportationChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!importationData) return;
    const { name, value } = e.target;
    
    let parsedValue: number | string;
    
    if (name === 'fecha_importacion') {
      parsedValue = value;
    } else if (name === 'id_proveedor' || name === 'cantidad') {
      parsedValue = parseInt(value) || 0;
    } else {
      parsedValue = parseFloat(value) || 0;
    }
    
    setImportationData({ 
      ...importationData, 
      [name]: parsedValue 
    });
  };

  const handleImportationSelect = (tempId: number) => {
    setSelectedImportationId(tempId);
    
    const selectedImport = importaciones.find((imp) => imp.id_temp === tempId);
    
    if (selectedImport) {
      setImportationData({
        id_proveedor: selectedImport.id_proveedor,
        fecha_importacion: selectedImport.fecha_importacion,
        cantidad: selectedImport.cantidad,
        precio_compra: selectedImport.precio_compra,
        margen_a: selectedImport.margen_a,
        comision_a: selectedImport.comision_a,
        margen_b: selectedImport.margen_b,
        comision_b: selectedImport.comision_b,
        margen_c: selectedImport.margen_c ?? 0,
        comision_c: selectedImport.comision_c ?? 0,
        margen_d: selectedImport.margen_d ?? 0,
        comision_d: selectedImport.comision_d ?? 0,
      });
      setFormKey(prev => prev + 1);
    }
  };

  const handleNewImportChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    let parsedValue: number | string;
    
    if (name === 'fecha_importacion') {
      parsedValue = value;
    } else if (name === 'id_proveedor' || name === 'cantidad') {
      parsedValue = parseInt(value) || 0;
    } else {
      parsedValue = parseFloat(value) || 0;
    }
    
    setNewImportData({ 
      ...newImportData, 
      [name]: parsedValue 
    });
  };

  const handleOpenNewImportModal = () => {
    setNewImportData({
      id_proveedor: 0,
      fecha_importacion: new Date().toISOString().substring(0, 10),
      cantidad: 0,
      precio_compra: 0,
      margen_a: 0,
      comision_a: 0,
      margen_b: 0,
      comision_b: 0,
      margen_c: 0,
      comision_c: 0,
      margen_d: 0,
      comision_d: 0,
    });
    setShowNewImportModal(true);
  };

  const handleCloseNewImportModal = () => {
    setShowNewImportModal(false);
  };

  // ✏️ Agregar nueva importación temporal
  const handleSaveNewImport = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!newImportData.id_proveedor) {
      setErrorMessage('Por favor seleccione un proveedor');
      return;
    }

    const calculatedNewPrices = calculateNewImportPrices();
    
    // Desactivar todas las importaciones existentes
    const updatedImportaciones = importaciones.map(imp => ({
      ...imp,
      is_active: false
    }));

    // Crear nueva importación como activa
    const newImport: TempImportation = {
      id_temp: nextTempId,
      id_proveedor: Number(newImportData.id_proveedor),
      fecha_importacion: newImportData.fecha_importacion,
      cantidad: Number(newImportData.cantidad),
      precio_compra: Number(newImportData.precio_compra),
      margen_a: Number(newImportData.margen_a),
      comision_a: Number(newImportData.comision_a),
      margen_b: Number(newImportData.margen_b),
      comision_b: Number(newImportData.comision_b),
      margen_c: Number(newImportData.margen_c),
      comision_c: Number(newImportData.comision_c),
      margen_d: Number(newImportData.margen_d),
      comision_d: Number(newImportData.comision_d),
      precio_venta_a: calculatedNewPrices.precio_venta_a,
      precio_venta_comision_a: calculatedNewPrices.precio_venta_comision_a,
      precio_venta_b: calculatedNewPrices.precio_venta_b,
      precio_venta_comision_b: calculatedNewPrices.precio_venta_comision_b,
      precio_venta_c: calculatedNewPrices.precio_venta_c,
      precio_venta_comision_c: calculatedNewPrices.precio_venta_comision_c,
      precio_venta_d: calculatedNewPrices.precio_venta_d,
      precio_venta_comision_d: calculatedNewPrices.precio_venta_comision_d,
      is_active: true,
    };

    setImportaciones([...updatedImportaciones, newImport]);
    setSelectedImportationId(nextTempId);
    setNextTempId(nextTempId + 1);
    
    // Seleccionar la nueva importación
    setImportationData({
      id_proveedor: newImport.id_proveedor,
      fecha_importacion: newImport.fecha_importacion,
      cantidad: newImport.cantidad,
      precio_compra: newImport.precio_compra,
      margen_a: newImport.margen_a,
      comision_a: newImport.comision_a,
      margen_b: newImport.margen_b,
      comision_b: newImport.comision_b,
      margen_c: newImport.margen_c,
      comision_c: newImport.comision_c,
      margen_d: newImport.margen_d,
      comision_d: newImport.comision_d,
    });

    setShowNewImportModal(false);
    setErrorMessage(null);
  };

  // ✏️ Eliminar importación temporal
  const handleDeleteImportation = (tempId: number) => {
    if (importaciones.length <= 1) {
      alert('Debe haber al menos una importación');
      return;
    }

    const importToDelete = importaciones.find(imp => imp.id_temp === tempId);
    if (importToDelete?.is_active) {
      alert('No se puede eliminar la importación activa. Active otra importación primero.');
      return;
    }

    if (!confirm('¿Está seguro de eliminar esta importación?')) return;

    const updatedImportaciones = importaciones.filter(imp => imp.id_temp !== tempId);
    setImportaciones(updatedImportaciones);

    // Si era la seleccionada, seleccionar la primera
    if (selectedImportationId === tempId && updatedImportaciones.length > 0) {
      handleImportationSelect(updatedImportaciones[0].id_temp);
    }
  };

  // ✏️ Actualizar importación seleccionada
  const handleUpdateSelectedImportation = () => {
    if (!importationData || selectedImportationId === null) return;

    const calculatedPrices = calculatePrices();

    const updatedImportaciones = importaciones.map(imp => {
      if (imp.id_temp === selectedImportationId) {
        return {
          ...imp,
          id_proveedor: importationData.id_proveedor,
          fecha_importacion: importationData.fecha_importacion,
          cantidad: importationData.cantidad,
          precio_compra: importationData.precio_compra,
          margen_a: importationData.margen_a,
          comision_a: importationData.comision_a,
          margen_b: importationData.margen_b,
          comision_b: importationData.comision_b,
          margen_c: importationData.margen_c,
          comision_c: importationData.comision_c,
          margen_d: importationData.margen_d,
          comision_d: importationData.comision_d,
          precio_venta_a: calculatedPrices.precio_venta_a,
          precio_venta_comision_a: calculatedPrices.precio_venta_comision_a,
          precio_venta_b: calculatedPrices.precio_venta_b,
          precio_venta_comision_b: calculatedPrices.precio_venta_comision_b,
          precio_venta_c: calculatedPrices.precio_venta_c,
          precio_venta_comision_c: calculatedPrices.precio_venta_comision_c,
          precio_venta_d: calculatedPrices.precio_venta_d,
          precio_venta_comision_d: calculatedPrices.precio_venta_comision_d,
        };
      }
      return imp;
    });

    setImportaciones(updatedImportaciones);
  };

  // ✏️ Actualizar cuando cambian los datos de importación
  useEffect(() => {
    if (importationData && selectedImportationId !== null) {
      handleUpdateSelectedImportation();
    }
  }, [importationData]);

  /**
   * Calcula los precios de venta y comisiones para la importación activa.
   *
   * Devuelve un objeto con precios de venta, precios de venta con comisión y
   * los valores de margen y comisión para los grupos A, B, C y D.
   */
  const calculatePrices = () => {
    // Si no hay datos de importación, devolver ceros para todos los campos
    if (!importationData) {
      return {
        precio_venta_a: 0,
        precio_venta_comision_a: 0,
        precio_venta_b: 0,
        precio_venta_comision_b: 0,
        precio_venta_c: 0,
        precio_venta_comision_c: 0,
        precio_venta_d: 0,
        precio_venta_comision_d: 0,
        valor_margen_a: 0,
        valor_margen_b: 0,
        valor_margen_c: 0,
        valor_margen_d: 0,
        valor_comision_a: 0,
        valor_comision_b: 0,
        valor_comision_c: 0,
        valor_comision_d: 0,
      };
    }

    // Extraer valores numéricos de la importación
    const precio_compra = Number(importationData.precio_compra) || 0;
    const margen_a = Number(importationData.margen_a) || 0;
    const comision_a = Number(importationData.comision_a) || 0;
    const margen_b = Number(importationData.margen_b) || 0;
    const comision_b = Number(importationData.comision_b) || 0;
    const margen_c = Number(importationData.margen_c) || 0;
    const comision_c = Number(importationData.comision_c) || 0;
    const margen_d = Number(importationData.margen_d) || 0;
    const comision_d = Number(importationData.comision_d) || 0;

    // Precios de venta para cada grupo (sin comisión)
    const precio_venta_a = precio_compra * (1 + margen_a / 100);
    const precio_venta_b = precio_compra * (1 + margen_b / 100);
    const precio_venta_c = precio_compra * (1 + margen_c / 100);
    const precio_venta_d = precio_compra * (1 + margen_d / 100);

    // Precios de venta con comisión
    const precio_venta_comision_a = precio_venta_a * (1 + comision_a / 100);
    const precio_venta_comision_b = precio_venta_b * (1 + comision_b / 100);
    const precio_venta_comision_c = precio_venta_c * (1 + comision_c / 100);
    const precio_venta_comision_d = precio_venta_d * (1 + comision_d / 100);

    // Valores absolutos de margen y comisión
    const valor_margen_a = precio_compra * (margen_a / 100);
    const valor_margen_b = precio_compra * (margen_b / 100);
    const valor_margen_c = precio_compra * (margen_c / 100);
    const valor_margen_d = precio_compra * (margen_d / 100);

    const valor_comision_a = precio_venta_comision_a - precio_venta_a;
    const valor_comision_b = precio_venta_comision_b - precio_venta_b;
    const valor_comision_c = precio_venta_comision_c - precio_venta_c;
    const valor_comision_d = precio_venta_comision_d - precio_venta_d;

    return {
      precio_venta_a,
      precio_venta_comision_a,
      precio_venta_b,
      precio_venta_comision_b,
      precio_venta_c,
      precio_venta_comision_c,
      precio_venta_d,
      precio_venta_comision_d,
      valor_margen_a,
      valor_margen_b,
      valor_margen_c,
      valor_margen_d,
      valor_comision_a,
      valor_comision_b,
      valor_comision_c,
      valor_comision_d,
    };
  };

  /**
   * Calcula los precios y valores para la importación en el modal de nueva importación.
   *
   * Devuelve un objeto con precios de venta, precios de venta con comisión y
   * valores de margen y comisión para los grupos A, B, C y D.
   */
  const calculateNewImportPrices = () => {
    const precio_compra = Number(newImportData.precio_compra) || 0;
    const margen_a = Number(newImportData.margen_a) || 0;
    const comision_a = Number(newImportData.comision_a) || 0;
    const margen_b = Number(newImportData.margen_b) || 0;
    const comision_b = Number(newImportData.comision_b) || 0;
    const margen_c = Number(newImportData.margen_c) || 0;
    const comision_c = Number(newImportData.comision_c) || 0;
    const margen_d = Number(newImportData.margen_d) || 0;
    const comision_d = Number(newImportData.comision_d) || 0;

    // Precios de venta sin comisión
    const precio_venta_a = precio_compra * (1 + margen_a / 100);
    const precio_venta_b = precio_compra * (1 + margen_b / 100);
    const precio_venta_c = precio_compra * (1 + margen_c / 100);
    const precio_venta_d = precio_compra * (1 + margen_d / 100);

    // Precios de venta con comisión
    const precio_venta_comision_a = precio_venta_a * (1 + comision_a / 100);
    const precio_venta_comision_b = precio_venta_b * (1 + comision_b / 100);
    const precio_venta_comision_c = precio_venta_c * (1 + comision_c / 100);
    const precio_venta_comision_d = precio_venta_d * (1 + comision_d / 100);

    // Valores de margen y comisión
    const valor_margen_a = precio_compra * (margen_a / 100);
    const valor_margen_b = precio_compra * (margen_b / 100);
    const valor_margen_c = precio_compra * (margen_c / 100);
    const valor_margen_d = precio_compra * (margen_d / 100);

    const valor_comision_a = precio_venta_comision_a - precio_venta_a;
    const valor_comision_b = precio_venta_comision_b - precio_venta_b;
    const valor_comision_c = precio_venta_comision_c - precio_venta_c;
    const valor_comision_d = precio_venta_comision_d - precio_venta_d;

    return {
      precio_venta_a,
      precio_venta_comision_a,
      precio_venta_b,
      precio_venta_comision_b,
      precio_venta_c,
      precio_venta_comision_c,
      precio_venta_d,
      precio_venta_comision_d,
      valor_margen_a,
      valor_margen_b,
      valor_margen_c,
      valor_margen_d,
      valor_comision_a,
      valor_comision_b,
      valor_comision_c,
      valor_comision_d,
    };
  };

  const calculatedPrices = calculatePrices();
  const calculatedNewPrices = calculateNewImportPrices();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // ✏️ Validar que tenga al menos una importación
    if (importaciones.length === 0) {
      setErrorMessage('Debe agregar al menos una importación antes de guardar');
      return;
    }

    if (!productData.codigo_producto || !productData.descripcion || !productData.id_categoria) {
      setErrorMessage('Complete todos los campos obligatorios del producto');
      return;
    }

    try {
      setLoading(true);

      // ✏️ Buscar la importación activa
      const activeImport = importaciones.find(imp => imp.is_active) || importaciones[0];

      const payload = {
        codigo_producto: productData.codigo_producto,
        descripcion: productData.descripcion,
        id_categoria: Number(productData.id_categoria),
        estado: productData.estado,
        stock: calculateTotalStock(), // Stock inicial sumando todas las importaciones
        advertencia_stock: 0,
        alerta_stock: 0,
        // Datos de la importación activa (para compatibilidad)
        id_proveedor: activeImport.id_proveedor,
        precio_compra: activeImport.precio_compra,
        cantidad: activeImport.cantidad,
        fecha_importacion: activeImport.fecha_importacion,
        margen_a: activeImport.margen_a,
        comision_a: activeImport.comision_a,
        margen_b: activeImport.margen_b,
        comision_b: activeImport.comision_b,
        margen_c: activeImport.margen_c,
        comision_c: activeImport.comision_c,
        margen_d: activeImport.margen_d,
        comision_d: activeImport.comision_d,
        precio_venta_a: activeImport.precio_venta_a,
        precio_venta_comision_a: activeImport.precio_venta_comision_a,
        precio_venta_b: activeImport.precio_venta_b,
        precio_venta_comision_b: activeImport.precio_venta_comision_b,
        precio_venta_c: activeImport.precio_venta_c,
        precio_venta_comision_c: activeImport.precio_venta_comision_c,
        precio_venta_d: activeImport.precio_venta_d,
        precio_venta_comision_d: activeImport.precio_venta_comision_d,
        // Todas las importaciones (incluyendo inactivas)
        importaciones: importaciones.map((imp) => ({
          id_proveedor: imp.id_proveedor,
          fecha_importacion: imp.fecha_importacion,
          cantidad: imp.cantidad,
          precio_compra: imp.precio_compra,
          margen_a: imp.margen_a,
          comision_a: imp.comision_a,
          margen_b: imp.margen_b,
          comision_b: imp.comision_b,
          margen_c: imp.margen_c,
          comision_c: imp.comision_c,
          margen_d: imp.margen_d,
          comision_d: imp.comision_d,
          precio_venta_a: imp.precio_venta_a,
          precio_venta_comision_a: imp.precio_venta_comision_a,
          precio_venta_b: imp.precio_venta_b,
          precio_venta_comision_b: imp.precio_venta_comision_b,
          precio_venta_c: imp.precio_venta_c,
          precio_venta_comision_c: imp.precio_venta_comision_c,
          precio_venta_d: imp.precio_venta_d,
          precio_venta_comision_d: imp.precio_venta_comision_d,
          estado_importacion: imp.is_active ? 'activa' : 'inactiva',
        })),
      };

      await axios.post("/api/products", payload);
      router.push("/productos");
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setErrorMessage(err.response?.data?.error || "Error al crear el producto");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/productos");
  };

  const getProviderName = (id_proveedor: number): string => {
    const provider = providers.find(p => p.id_proveedor === id_proveedor);
    return provider?.nombre_proveedor || 'Proveedor desconocido';
  };

  const formatDecimal = (value: number): string => {
    return isNaN(value) ? '0.00' : value.toFixed(2);
  };

  if (loading && !categoriesLoaded) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Nuevo Producto" />
        <ComponentCard title="Nuevo producto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando datos...</p>
            </div>
          </div>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Nuevo Producto" />
      <ComponentCard title="Registrar nuevo producto">
        {errorMessage && (
          <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg text-error-700 dark:text-error-400">
            {errorMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* DATOS BÁSICOS DEL PRODUCTO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Información del Producto
            </h3>
            
            <div>
              <Label htmlFor="codigo_producto">Código de producto *</Label>
              <input
                id="codigo_producto"
                name="codigo_producto"
                type="text"
                value={productData.codigo_producto}
                onChange={handleProductChange}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>              
			  <input
                id="descripcion"
                name="descripcion"
                type="text"
                value={productData.descripcion}
                onChange={handleProductChange}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="id_categoria">Categoría *</Label>
              {categories.length > 0 ? (
                <select
                  id="id_categoria"
                  name="id_categoria"
                  value={productData.id_categoria}
                  onChange={handleProductChange}
                  className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                  required
                >
                  <option value="">Seleccione categoría</option>
                  {categories.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nombre_categoria}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-500">
                  Cargando categorías...
                </div>
              )}
            </div>

            {/* ✏️ Stock calculado automáticamente */}
            <div>
              <Label htmlFor="stock">Stock inicial (calculado)</Label>
              <div className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                {calculateTotalStock()} unidades
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                El stock se calcula automáticamente sumando las cantidades de todas las importaciones
              </p>
            </div>

            <div>
              <Label htmlFor="estado">Estado del producto</Label>
              <select
                id="estado"
                name="estado"
                value={productData.estado}
                onChange={handleProductChange}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="fallado">Fallado</option>
              </select>
            </div>
          </div>

          {/* IMPORTACIONES */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Importaciones {importaciones.length === 0 && <span className="text-red-500">*</span>}
              </h3>
              <button
                type="button"
                onClick={handleOpenNewImportModal}
                className="inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                + Nueva Importación
              </button>
            </div>

            {importaciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-lg">
                <p>No hay importaciones agregadas.</p>
                <p className="text-sm mt-2">Debe agregar al menos una importación para poder guardar el producto.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {importaciones.map((importacion) => (
                  <div
                    key={importacion.id_temp}
                    className={`p-3 border rounded-lg transition-all ${
                      selectedImportationId === importacion.id_temp
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <label className="flex items-start space-x-3 cursor-pointer flex-1"
                        onClick={() => handleImportationSelect(importacion.id_temp)}
                      >
                        <input
                          type="radio"
                          name="importacion_activa"
                          value={importacion.id_temp}
                          checked={selectedImportationId === importacion.id_temp}
                          onChange={() => handleImportationSelect(importacion.id_temp)}
                          className="mt-1 h-4 w-4 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getProviderName(importacion.id_proveedor)}
                            {importacion.is_active && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                Activa
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Cantidad: {importacion.cantidad} | 
                            Precio: S/ {formatDecimal(importacion.precio_compra)} | 
                            Fecha: {new Date(importacion.fecha_importacion).toLocaleDateString('es-PE')}
                          </div>
                        </div>
                      </label>

                      {importaciones.length > 1 && !importacion.is_active && (
                        <button
                          type="button"
                          onClick={() => handleDeleteImportation(importacion.id_temp)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Eliminar importación"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EDICIÓN DE IMPORTACIÓN SELECCIONADA */}
          {importationData && selectedImportationId !== null && (
            <div key={formKey} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Datos de la Importación Activa
              </h3>

              <div>
                <Label htmlFor="id_proveedor">Proveedor *</Label>
                <select
                  id="id_proveedor"
                  name="id_proveedor"
                  value={importationData.id_proveedor}
                  onChange={handleImportationChange}
                  className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                  required
                >
                  <option value="">Seleccione proveedor</option>
                  {providers.map((prov) => (
                    <option key={prov.id_proveedor} value={prov.id_proveedor}>
                      {prov.nombre_proveedor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_importacion">Fecha de importación *</Label>
                  <input
                    id="fecha_importacion"
                    name="fecha_importacion"
                    type="date"
                    value={importationData.fecha_importacion}
                    onChange={handleImportationChange}
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cantidad">Cantidad *</Label>
                  <input
                    id="cantidad"
                    name="cantidad"
                    type="number"
                    min="0"
                    value={importationData.cantidad}
                    onChange={handleImportationChange}
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    El stock se actualiza automáticamente al cambiar la cantidad
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="precio_compra">Precio de compra (S/) *</Label>
                <input
                  id="precio_compra"
                  name="precio_compra"
                  type="number"
                  step="0.1"
                  min="0"
                  value={importationData.precio_compra}
                  onChange={handleImportationChange}
                  className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              {/* GRUPO A */}
              <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Precios A
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="margen_a">Margen A (%)</Label>
                    <input
                      id="margen_a"
                      name="margen_a"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.margen_a}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_margen_a.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_a">Precio venta A (S/)</Label>
                    <div className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_a.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_compra × (1 + margen_a)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="comision_a">Comisión A (%)</Label>
                    <input
                      id="comision_a"
                      name="comision_a"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.comision_a}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_comision_a.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_comision_a">Precio venta + comisión A (S/)</Label>
                    <div className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_comision_a.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_venta_a × (1 + comision_a)
                    </p>
                  </div>
                </div>
              </div>

              {/* GRUPO B */}
              <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Precios B
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="margen_b">Margen B (%)</Label>
                    <input
                      id="margen_b"
                      name="margen_b"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.margen_b}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_margen_b.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_b">Precio venta B (S/)</Label>
                    <div className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_b.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_compra × (1 + margen_b)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="comision_b">Comisión B (%)</Label>
                    <input
                      id="comision_b"
                      name="comision_b"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.comision_b}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_comision_b.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_comision_b">Precio venta + comisión B (S/)</Label>
                    <div className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_comision_b.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_venta_b × (1 + comision_b)
                    </p>
                  </div>
                </div>
              </div>

              {/* GRUPO C */}
              <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Precios C
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="margen_c">Margen C (%)</Label>
                    <input
                      id="margen_c"
                      name="margen_c"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.margen_c}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_margen_c.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_c">Precio venta C (S/)</Label>
                    <div className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_c.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_compra × (1 + margen_c)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="comision_c">Comisión C (%)</Label>
                    <input
                      id="comision_c"
                      name="comision_c"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.comision_c}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_comision_c.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_comision_c">Precio venta + comisión C (S/)</Label>
                    <div className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_comision_c.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_venta_c × (1 + comision_c)
                    </p>
                  </div>
                </div>
              </div>

              {/* GRUPO D */}
              <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                  Precios D
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="margen_d">Margen D (%)</Label>
                    <input
                      id="margen_d"
                      name="margen_d"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.margen_d}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_margen_d.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_d">Precio venta D (S/)</Label>
                    <div className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_d.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_compra × (1 + margen_d)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="comision_d">Comisión D (%)</Label>
                    <input
                      id="comision_d"
                      name="comision_d"
                      type="number"
                      step="0.1"
                      min="0"
                      value={importationData.comision_d}
                      onChange={handleImportationChange}
                      className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valor: {calculatedPrices.valor_comision_d.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="precio_venta_comision_d">Precio venta + comisión D (S/)</Label>
                    <div className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg">
                      S/ {calculatedPrices.precio_venta_comision_d.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calculado: precio_venta_d × (1 + comision_d)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOTONES DE ACCIÓN */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading || importaciones.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
            
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </ComponentCard>

      {/* MODAL: NUEVA IMPORTACIÓN */}
      {showNewImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Nueva Importación
              </h2>

              <form onSubmit={handleSaveNewImport} className="space-y-4">
                <div>
                  <Label htmlFor="new_id_proveedor">Proveedor *</Label>
                  <select
                    id="new_id_proveedor"
                    name="id_proveedor"
                    value={newImportData.id_proveedor}
                    onChange={handleNewImportChange}
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                    required
                  >
                    <option value="">Seleccione proveedor</option>
                    {providers.map((prov) => (
                      <option key={prov.id_proveedor} value={prov.id_proveedor}>
                        {prov.nombre_proveedor}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new_fecha_importacion">Fecha de importación *</Label>
                    <input
                      id="new_fecha_importacion"
                      name="fecha_importacion"
                      type="date"
                      value={newImportData.fecha_importacion}
                      onChange={handleNewImportChange}
                      className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_cantidad">Cantidad *</Label>
                    <input
                      id="new_cantidad"
                      name="cantidad"
                      type="number"
                      min="0"
                      value={newImportData.cantidad}
                      onChange={handleNewImportChange}
                      className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="new_precio_compra">Precio de compra (S/) *</Label>
                  <input
                    id="new_precio_compra"
                    name="precio_compra"
                    type="number"
                    step="0.1"
                    min="0"
                    value={newImportData.precio_compra}
                    onChange={handleNewImportChange}
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                {/* GRUPOS A, B, C y D */}
                {/*
                  En esta sección se muestran las tablas de márgenes, precios y comisiones para
                  los grupos A, B, C y D. Cada grupo ocupa 4 columnas en dispositivos medianos
                  y superiores: margen (%), precio de venta sin comisión, comisión (%) y
                  precio de venta con comisión. Se utilizan fondos de color para diferenciar
                  visualmente cada grupo y se muestra el valor de margen o comisión debajo
                  de cada campo.
                */}
                {/* Grupo A */}
                <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Precios Tipo A
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="new_margen_a">Margen A (%) *</Label>
                      <input
                        id="new_margen_a"
                        name="margen_a"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.margen_a}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg"
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_margen_a.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_a">Precio venta A (S/)</Label>
                      <div className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_a.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_compra × (1 + (margen_a/100))
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_comision_a">Comisión A (%) *</Label>
                      <input
                        id="new_comision_a"
                        name="comision_a"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.comision_a}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg"
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_comision_a.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_comision_a">Precio venta + comisión A (S/)</Label>
                      <div className="h-11 w-full bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_comision_a.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_venta_a × (1 + (comision_a/100))
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grupo B */}
                <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Precios Tipo B
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="new_margen_b">Margen B (%)</Label>
                      <input
                        id="new_margen_b"
                        name="margen_b"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.margen_b}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_margen_b.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_b">Precio venta B (S/)</Label>
                      <div className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_b.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_compra × (1 + (margen_b/100))
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_comision_b">Comisión B (%)</Label>
                      <input
                        id="new_comision_b"
                        name="comision_b"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.comision_b}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_comision_b.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_comision_b">Precio venta + comisión B (S/)</Label>
                      <div className="h-11 w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_comision_b.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_venta_b × (1 + (comision_b/100))
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grupo C */}
                <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Precios Tipo C
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="new_margen_c">Margen C (%)</Label>
                      <input
                        id="new_margen_c"
                        name="margen_c"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.margen_c}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_margen_c.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_c">Precio venta C (S/)</Label>
                      <div className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_c.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_compra × (1 + (margen_c/100))
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_comision_c">Comisión C (%)</Label>
                      <input
                        id="new_comision_c"
                        name="comision_c"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.comision_c}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_comision_c.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_comision_c">Precio venta + comisión C (S/)</Label>
                      <div className="h-11 w-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_comision_c.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_venta_c × (1 + (comision_c/100))
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grupo D */}
                <div className="pt-4 border-t border-gray-300 dark:border-gray-600">
                  <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">
                    Precios Tipo D
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="new_margen_d">Margen D (%)</Label>
                      <input
                        id="new_margen_d"
                        name="margen_d"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.margen_d}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_margen_d.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_d">Precio venta D (S/)</Label>
                      <div className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_d.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_compra × (1 + (margen_d/100))
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_comision_d">Comisión D (%)</Label>
                      <input
                        id="new_comision_d"
                        name="comision_d"
                        type="number"
                        step="0.1"
                        min="0"
                        value={newImportData.comision_d}
                        onChange={handleNewImportChange}
                        className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Valor: {calculatedNewPrices.valor_comision_d.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="new_precio_venta_comision_d">Precio venta + comisión D (S/)</Label>
                      <div className="h-11 w-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-4 py-2.5 rounded-lg">
                        S/ {calculatedNewPrices.precio_venta_comision_d.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Calculado: precio_venta_d × (1 + (comision_d/100))
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-6 border-t">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Agregar Importación
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCloseNewImportModal}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}