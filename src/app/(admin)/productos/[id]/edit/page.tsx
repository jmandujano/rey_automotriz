/**
 * EditProductPage
 *
 * Página de edición de productos con modal para nueva importación y eliminar
 */

"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface ProductImportation {
  id_importacion: number;
  id_proveedor: number;
  fecha_importacion: string;
  precio_compra: string | number;
  cantidad: number;
  margen_a: string | number;
  precio_venta_a: string | number;
  comision_a: string | number;
  precio_venta_comision_a: string | number;
  margen_b: string | number | null;
  precio_venta_b: string | number | null;
  comision_b: string | number | null;
  precio_venta_comision_b: string | number | null;
  margen_c: string | number | null;
  precio_venta_c: string | number | null;
  comision_c: string | number | null;
  precio_venta_comision_c: string | number | null;
  margen_d: string | number | null;
  precio_venta_d: string | number | null;
  comision_d: string | number | null;
  precio_venta_comision_d: string | number | null;
  estado_importacion: string;
  proveedores?: Provider;
  proveedor?: Provider;
}

interface Product {
  id_producto: number;
  codigo_producto: string;
  descripcion: string;
  estado: string;
  id_categoria: number;
  stock: number;
  advertencia_stock: number;
  alerta_stock: number;
  importaciones?: ProductImportation[];
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

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedImportationId, setSelectedImportationId] = useState<number | null>(null);
  
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

  const [formKey, setFormKey] = useState(0);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

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
  const [savingNewImport, setSavingNewImport] = useState(false);

  useEffect(() => {
    if (!productId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setCategoriesLoaded(false);
        
        const [categoriesRes, providersRes] = await Promise.all([
          axios.get<Category[]>("/api/categories"),
          axios.get<Provider[]>("/api/providers")
        ]);
        
        setCategories(categoriesRes.data);
        setProviders(providersRes.data);
        setCategoriesLoaded(true);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const productRes = await axios.get(`/api/products/${productId}`);
        const data = productRes.data;
        
        const productData = {
          ...data,
          id_categoria: Number(data.id_categoria)
        };
        
        setProduct(productData);
        
        setTimeout(() => {
          setFormKey(prev => prev + 1);
        }, 100);
        
        if (data.importaciones && data.importaciones.length > 0) {
          const activeImport = data.importaciones.find(
            (imp: ProductImportation) => imp.estado_importacion === 'activa'
          ) || data.importaciones[0];
          
          if (activeImport) {
            setSelectedImportationId(activeImport.id_importacion);
            
            const newImportData = {
              id_proveedor: Number(activeImport.id_proveedor),
              fecha_importacion: activeImport.fecha_importacion 
                ? new Date(activeImport.fecha_importacion).toISOString().substring(0, 10)
                : new Date().toISOString().substring(0, 10),
              cantidad: Number(activeImport.cantidad) || 0,
              precio_compra: Number(activeImport.precio_compra) || 0,
              margen_a: Number(activeImport.margen_a) || 0,
              comision_a: Number(activeImport.comision_a) || 0,
              margen_b: Number(activeImport.margen_b) || 0,
              comision_b: Number(activeImport.comision_b) || 0,
              margen_c: Number(activeImport.margen_c) || 0,
              comision_c: Number(activeImport.comision_c) || 0,
              margen_d: Number(activeImport.margen_d) || 0,
              comision_d: Number(activeImport.comision_d) || 0,
            };
            
            setImportationData(newImportData);
          }
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error al cargar datos:', err);
        setErrorMessage('Error al cargar los datos del producto');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [productId]);

  const handleProductChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!product) return;
    const { name, value } = e.target;
    
    const parsedValue = name === 'id_categoria' ? Number(value) : value;
    
    setProduct({ ...product, [name]: parsedValue });
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

  const handleImportationSelect = (importId: number) => {
    setSelectedImportationId(importId);
    
    const selectedImport = product?.importaciones?.find(
      (imp) => imp.id_importacion === importId
    );
    
    if (selectedImport) {
      const newImportData = {
        id_proveedor: Number(selectedImport.id_proveedor),
        fecha_importacion: selectedImport.fecha_importacion
          ? new Date(selectedImport.fecha_importacion).toISOString().substring(0, 10)
          : new Date().toISOString().substring(0, 10),
        cantidad: Number(selectedImport.cantidad) || 0,
        precio_compra: Number(selectedImport.precio_compra) || 0,
        margen_a: Number(selectedImport.margen_a) || 0,
        comision_a: Number(selectedImport.comision_a) || 0,
        margen_b: Number(selectedImport.margen_b) || 0,
        comision_b: Number(selectedImport.comision_b) || 0,
        margen_c: Number(selectedImport.margen_c) || 0,
        comision_c: Number(selectedImport.comision_c) || 0,
        margen_d: Number(selectedImport.margen_d) || 0,
        comision_d: Number(selectedImport.comision_d) || 0,
      };
      
      setImportationData(newImportData);
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
      margen_a: 15.0,
      comision_a: 1.5,
      margen_b: 18.0,
      comision_b: 3.0,
      margen_c: 21.0,
      comision_c: 4.5,
      margen_d: 24.0,
      comision_d: 6.0,
    });
    setShowNewImportModal(true);
  };

  const handleCloseNewImportModal = () => {
    setShowNewImportModal(false);
  };

  const handleSaveNewImport = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!productId || !newImportData.id_proveedor) {
      setErrorMessage('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      setSavingNewImport(true);
      
      const calculatedNewPrices = calculateNewImportPrices();
      
      const payload = {
        id_producto: Number(productId),
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
      };

      await axios.post(`/api/products/${productId}/importaciones`, payload);
      
      const productRes = await axios.get(`/api/products/${productId}`);
      const data = productRes.data;
      
      setProduct({
        ...data,
        id_categoria: Number(data.id_categoria)
      });
      
      setShowNewImportModal(false);
      setSavingNewImport(false);
      
      alert('Importación agregada exitosamente');
      
    } catch (err: any) {
      console.error('Error al guardar importación:', err);
      setErrorMessage(err.response?.data?.error || 'Error al guardar la importación');
      setSavingNewImport(false);
    }
  };

  // ✏️ AGREGADO: Función para eliminar importación
  const handleDeleteImportation = async (importId: number) => {
    if (!productId || !product) return;

    // Validar que no sea la última importación
    if (product.importaciones && product.importaciones.length <= 1) {
      alert('No se puede eliminar la última importación. Debe haber al menos una importación.');
      return;
    }

    // Validar que no sea la importación activa
    const importToDelete = product.importaciones?.find(imp => imp.id_importacion === importId);
    if (importToDelete?.estado_importacion === 'activa') {
      alert('No se puede eliminar la importación activa. Por favor, active otra importación primero.');
      return;
    }

    // Confirmar eliminación
    const cantidad = importToDelete?.cantidad || 0;
    const confirmMsg = `¿Está seguro de eliminar esta importación?\n\nSe restará ${cantidad} unidades del stock actual.`;
    
    if (!confirm(confirmMsg)) return;

    try {
      setLoading(true);

      await axios.delete(`/api/products/${productId}/importaciones/${importId}`);
      
      // Recargar producto
      const productRes = await axios.get(`/api/products/${productId}`);
      const data = productRes.data;
      
      setProduct({
        ...data,
        id_categoria: Number(data.id_categoria)
      });
      
      alert('Importación eliminada exitosamente');
      setLoading(false);
      
    } catch (err: any) {
      console.error('Error al eliminar importación:', err);
      setErrorMessage(err.response?.data?.error || 'Error al eliminar la importación');
      setLoading(false);
    }
  };

  const calculatePrices = () => {
    if (!importationData) return {
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

    const precio_compra = Number(importationData.precio_compra) || 0;
    const margen_a = Number(importationData.margen_a) || 0;
    const comision_a = Number(importationData.comision_a) || 0;
    const margen_b = Number(importationData.margen_b) || 0;
    const comision_b = Number(importationData.comision_b) || 0;
    const margen_c = Number(importationData.margen_c) || 0;
    const comision_c = Number(importationData.comision_c) || 0;
    const margen_d = Number(importationData.margen_d) || 0;
    const comision_d = Number(importationData.comision_d) || 0;

    const precio_venta_a = precio_compra * (1 + (margen_a / 100));
    const precio_venta_b = precio_compra * (1 + (margen_b / 100));
    const precio_venta_c = precio_compra * (1 + (margen_c / 100));
    const precio_venta_d = precio_compra * (1 + (margen_d / 100));

    const precio_venta_comision_a = precio_venta_a * (1 + (comision_a / 100));
    const precio_venta_comision_b = precio_venta_b * (1 + (comision_b / 100));
    const precio_venta_comision_c = precio_venta_c * (1 + (comision_c / 100));
    const precio_venta_comision_d = precio_venta_d * (1 + (comision_d / 100));
	
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

    const precio_venta_a = precio_compra * (1 + (margen_a / 100));
    const precio_venta_b = precio_compra * (1 + (margen_b / 100));
    const precio_venta_c = precio_compra * (1 + (margen_c / 100));
    const precio_venta_d = precio_compra * (1 + (margen_d / 100));

    const precio_venta_comision_a = precio_venta_a * (1 + (comision_a / 100));
    const precio_venta_comision_b = precio_venta_b * (1 + (comision_b / 100));
    const precio_venta_comision_c = precio_venta_c * (1 + (comision_c / 100));
    const precio_venta_comision_d = precio_venta_d * (1 + (comision_d / 100));
	
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
    if (!productId || !product || !importationData || !selectedImportationId) {
      setErrorMessage('Faltan datos requeridos para guardar');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        codigo_producto: product.codigo_producto,
        descripcion: product.descripcion,
        id_categoria: Number(product.id_categoria),
        estado: product.estado,
        id_importacion_activa: selectedImportationId,
        importacion: {
          id_proveedor: Number(importationData.id_proveedor),
          fecha_importacion: importationData.fecha_importacion,
          cantidad: Number(importationData.cantidad),
          precio_compra: Number(importationData.precio_compra),
          margen_a: Number(importationData.margen_a),
          comision_a: Number(importationData.comision_a),
          margen_b: Number(importationData.margen_b),
          comision_b: Number(importationData.comision_b),
          margen_c: Number(importationData.margen_c),
          comision_c: Number(importationData.comision_c),
          margen_d: Number(importationData.margen_d),
          comision_d: Number(importationData.comision_d),
          precio_venta_a: Number(calculatedPrices.precio_venta_a),
          precio_venta_comision_a: Number(calculatedPrices.precio_venta_comision_a),
          precio_venta_b: Number(calculatedPrices.precio_venta_b),
          precio_venta_comision_b: Number(calculatedPrices.precio_venta_comision_b),
          precio_venta_c: Number(calculatedPrices.precio_venta_c),
          precio_venta_comision_c: Number(calculatedPrices.precio_venta_comision_c),
          precio_venta_d: Number(calculatedPrices.precio_venta_d),
          precio_venta_comision_d: Number(calculatedPrices.precio_venta_comision_d),
        }
      };

      await axios.put(`/api/products/${productId}`, payload);
      router.push("/productos");
    } catch (err: any) {
      console.error('Error al guardar:', err);
      setErrorMessage(err.response?.data?.error || "Error al actualizar el producto");
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

  const formatDecimal = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '0.00';
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Editar Producto" />
        <ComponentCard title="Editar producto">
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

  if (!product || !categoriesLoaded) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Editar Producto" />
        <ComponentCard title="Editar producto">
          <p className="text-gray-500 dark:text-gray-400">No se pudo cargar el producto</p>
        </ComponentCard>
      </div>
    );
  }

  return (
    <div>
      
      <ComponentCard title={`Editar producto #${product.id_producto}`}>
        {errorMessage && (
          <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg text-error-700 dark:text-error-400">
            {errorMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* DATOS BÁSICOS DEL PRODUCTO */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
              Información del Producto
          </h3>
		  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 space-y-4">
            
            
            <div>
              <Label htmlFor="codigo_producto">Código de producto</Label>
              <div className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                {product.codigo_producto}
              </div>
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>              
			  <input
                id="descripcion"
                name="descripcion"
                type="text"
                value={product.descripcion}
                onChange={handleProductChange}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <Label htmlFor="id_categoria">Categoría</Label>
              {categories.length > 0 ? (
                <select
                  key={`categoria-select-${formKey}`}
                  id="id_categoria"
                  name="id_categoria"
                  value={product.id_categoria}
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

            <div>
              <Label htmlFor="stock">Stock actual</Label>
              <div className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                {product.stock} unidades
              </div>
            </div>
			
			
			{/*
            <div>
              <Label htmlFor="estado">Estado del producto</Label>
              <select
                id="estado"
                name="estado"
                value={product.estado}
                onChange={handleProductChange}
                className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 focus:ring-2 focus:ring-brand-500"
                required
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                
              </select>
            </div>
			*/}
          </div>
		  

          

          {/* EDICIÓN DE IMPORTACIÓN ACTIVA */}
          {importationData && (
            <div key={formKey} className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Información de precios
              </h3>

              {/*<div>
                <Label htmlFor="id_proveedor">Proveedor</Label>
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
                  <Label htmlFor="fecha_importacion">Fecha de importación</Label>
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
                  <Label htmlFor="cantidad">Cantidad</Label>
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
                </div>
              </div>*/}

              <div>
                <Label htmlFor="precio_compra">Precio de compra (S/)</Label>
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
                    <Label htmlFor="comision_a">Comisión A (1.5%)</Label>
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
                    <Label htmlFor="comision_b">Comisión B (3%)</Label>
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
		  
		  {/* IMPORTACIONES (RADIO BUTTONS) */}
          {product.importaciones && product.importaciones.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Historial de Importaciones
                </h3>
                <button
                  type="button"
                  onClick={handleOpenNewImportModal}
                  className="inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  + Nueva Importación
                </button>
              </div>
              <div className="space-y-2">
                {product.importaciones.map((importacion) => (
                  <div
                    key={importacion.id_importacion}
                    className={`p-3 border rounded-lg transition-all ${
                      selectedImportationId === importacion.id_importacion
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-300 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Radio button */}
                      <label className="flex items-start space-x-3 flex-1">                        
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {getProviderName(importacion.id_proveedor)}
                            
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Cantidad: {importacion.cantidad} | 
                            Precio: S/ {formatDecimal(importacion.precio_compra)} | 
                            Fecha: {new Date(importacion.fecha_importacion).toLocaleDateString('es-PE')}
                          </div>
                        </div>
                      </label>

                      {/* ✏️ AGREGADO: Botón eliminar */}
                      {product.importaciones && product.importaciones.length > 1 && 
                       importacion.estado_importacion !== 'activa' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteImportation(importacion.id_importacion)}
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
            </div>
          )}

          {/* BOTONES DE ACCIÓN */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
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

      {/* ✏️ CORREGIDO: MODAL CON PADDING TOP Y SCROLL */}
      {showNewImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-20 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Nueva Importación
              </h2>

              <form onSubmit={handleSaveNewImport} className="space-y-4">
                {/* Proveedor */}
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

                {/* Fecha y Cantidad */}
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

                {/* Precio de compra */}
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

                {/* GRUPO A */}
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
                      <Label htmlFor="new_comision_a">Comisión A (1.5%) *</Label>
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

                {/* GRUPO B */}
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
                      <Label htmlFor="new_comision_b">Comisión B (3%)</Label>
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

                {/* GRUPO C */}
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

                {/* GRUPO D */}
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

                {/* Botones del modal */}
                <div className="flex space-x-3 pt-6 border-t">
                  <button
                    type="submit"
                    disabled={savingNewImport}
                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingNewImport ? 'Guardando...' : 'Guardar Importación'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCloseNewImportModal}
                    disabled={savingNewImport}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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