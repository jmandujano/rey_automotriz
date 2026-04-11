"use client";

// EditOrderPage
//
// Esta página permite editar un pedido existente. Reutiliza la misma
// estructura y diseño que la página de creación de pedidos, pero
// precarga los datos del pedido seleccionado y envía una solicitud
// PUT a `/api/orders/[id]` en lugar de POST. También ajusta el stock
// de los productos según las diferencias de cantidad y actualiza las
// cuotas de pago si el pedido es a crédito.

import React, { useEffect, useState, FormEvent, useRef, useMemo } from "react";
import axios from "axios";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

interface Client {
  id_cliente: number;
  razon_social: string;
  ruc?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  id_vendedor_asignado: number;
}

interface Category {
  id_categoria: number;
  nombre_categoria: string;
  estado?: string;
}

interface Importacion {
  id_importacion: number;
  precio_compra: number;
  precio_venta_a: number;
  precio_venta_b: number | null;
  recio_venta_c: number | null;
  recio_venta_d: number | null;
  precio_venta_comision_a: number;
  precio_venta_comision_b: number | null;
  precio_venta_comision_c: number | null;
  precio_venta_comision_d: number | null;
  comision_a: number;
  comision_b: number | null;
  comision_c: number | null;
  comision_d: number | null;
  estado_importacion: string;
  precio_venta_c?: number | null;
  precio_venta_d?: number | null;
  precio_venta_e?: number | null;
  precio_venta_f?: number | null;
  precio_venta_comision_c?: number | null;
  precio_venta_comision_d?: number | null;
  precio_venta_comision_e?: number | null;
  precio_venta_comision_f?: number | null;
  comision_c?: number | null;
  comision_d?: number | null;
  comision_e?: number | null;
  comision_f?: number | null;
}

interface Product {
  id_producto: number;
  codigo_producto: string;
  descripcion: string;
  stock: number;
  id_categoria: number;
  importaciones: Importacion[];
}

interface User {
  id_usuario: number;
  nombre_completo: string;
  rol?: { nombre_rol: string };
}

interface ProductInCart {
  id_producto: number;
  codigo_producto: string;
  descripcion: string;
  id_importacion: number;
  cantidad: number;
  precio_seleccionado: "a" | "b" | "c" | "d" | "otro";
  precio: number;
  subtotal: number;
  precio_personalizado?: number;
  stock: number;
}

export default function EditOrderPage() {
  const params = useParams();
  // Obtenemos el ID del pedido desde la URL dinámica
  const orderId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { data: session } = useSession();

  // Listas de datos cargados desde el servidor
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<User[]>([]);
  const [cart, setCart] = useState<ProductInCart[]>([]);

  // Formulario de datos generales del pedido
  const [form, setForm] = useState({
    numero_comprobante: "",
    tipo_comprobante: "boleta",
    id_cliente: "",
    id_vendedor: "",
    tipo_pago: "contado",
    fecha_entrega: "",
	estado_actual: "",
    observaciones: "",
    fecha_pago_programada: "",
  });

  // Estados para crédito
  const [creditForm, setCreditForm] = useState({
    pago_inicial: 0,
    tipo_credito: 1,
    nro_cuotas: 1,
  });

  // Formulario de producto para el modal de selección
  const [productForm, setProductForm] = useState({
    id_categoria: "",
    id_producto: "",
    precio_seleccionado: "a" as "a" | "b" | "c" | "d" | "otro",
    cantidad: 1,
    precio_personalizado: "",
  });

  // Estados para el combobox de categoría
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Estados para el combobox de producto
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const productInputRef = useRef<HTMLInputElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImportacion, setActiveImportacion] = useState<Importacion | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<ProductInCart | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [currentDate] = useState(
    new Date().toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  );

  // Cargar datos iniciales y del pedido
  useEffect(() => {
    if (!session) return;
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, orderId]);

  // Actualizar fecha de pago programada cuando cambia la fecha de entrega o el tipo de pago
  useEffect(() => {
    if (form.tipo_pago === "contado" && form.fecha_entrega) {
      setForm((prev) => ({ ...prev, fecha_pago_programada: prev.fecha_entrega }));
    }
  }, [form.fecha_entrega, form.tipo_pago]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node) &&
        categoryInputRef.current &&
        !categoryInputRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
      if (
        productDropdownRef.current &&
        !productDropdownRef.current.contains(event.target as Node) &&
        productInputRef.current &&
        !productInputRef.current.contains(event.target as Node)
      ) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrado dinámico de vendedores según cliente seleccionado
  const filteredSellers = useMemo(() => {
    if (!form.id_cliente) {
      // Si no hay cliente seleccionado, mostrar todos los vendedores
      return sellers;
    }
    // Si hay cliente seleccionado, mostrar solo su vendedor asignado
    const selectedClient = clients.find(c => c.id_cliente === Number(form.id_cliente));
    if (selectedClient) {
      return sellers.filter(s => s.id_usuario === selectedClient.id_vendedor_asignado);
    }
    return sellers;
  }, [form.id_cliente, clients, sellers]);

  // Filtrado dinámico de clientes según vendedor seleccionado
  const filteredClients = useMemo(() => {
    if (!form.id_vendedor) {
      // Si no hay vendedor seleccionado, mostrar todos los clientes
      return clients;
    }
    // Si hay vendedor seleccionado, mostrar solo sus clientes asignados
    return clients.filter(c => c.id_vendedor_asignado === Number(form.id_vendedor));
  }, [form.id_vendedor, clients]);

  // Función para cargar clientes, categorías, productos, vendedores y el pedido
  async function loadInitialData() {
    try {
      setLoadingData(true);
      // 1. Cargar clientes
      const clientsRes = await axios.get<Client[]>("/api/clients");
      setClients(clientsRes.data);
      // 2. Cargar categorías activas
      const categoriesRes = await axios.get<Category[]>("/api/categories");
      const activeCats = categoriesRes.data.filter((c) => !c.estado || c.estado === "activo");
      setCategories(activeCats);
      setFilteredCategories(activeCats);
      // 3. Cargar productos activos con importaciones
      const productsRes = await axios.get<Product[]>("/api/products?include=importaciones");
      const activeProducts = productsRes.data.filter((p: any) => p.estado === "activo");
      setProducts(activeProducts);
      setFilteredProducts(activeProducts);
      // 4. Cargar usuarios (vendedores)
      const usersRes = await axios.get<User[]>("/api/users");
      const sellersList = usersRes.data.filter(
        (u) => u.rol?.nombre_rol?.toLowerCase() === "vendedor",
      );
      setSellers(sellersList);
      // Si el usuario logueado es vendedor, preseleccionar su ID
      if (session?.user) {
        const roleName = (session.user as any)?.roleName?.toLowerCase?.() ?? "";
        if (roleName === "vendedor") {
          const userId = (session.user as any)?.id || (session.user as any)?.email;
          if (userId) {
            setForm((prev) => ({ ...prev, id_vendedor: String(userId) }));
          }
        }
      }
      // 5. Si hay un ID de pedido, cargar los datos de ese pedido
      if (orderId) {
        const orderRes = await axios.get(`/api/orders/${orderId}`);
        const ord = orderRes.data;
        // Establecer datos generales del pedido
        setForm((prev) => ({
          ...prev,
          tipo_comprobante: ord.tipo_comprobante || "boleta",
          id_cliente: String(ord.id_cliente),
          id_vendedor: String(ord.id_vendedor),
          tipo_pago: ord.tipo_pago || "contado",
          fecha_entrega: ord.fecha_entrega ? ord.fecha_entrega.substring(0, 10) : "",
          estado_actual: ord.estado_actual || "",
		  observaciones: ord.observaciones || "",
          // Para contado, usar la misma fecha de entrega como fecha de pago programada
          fecha_pago_programada:
            ord.tipo_pago?.toLowerCase() === "contado"
              ? ord.fecha_entrega
                ? ord.fecha_entrega.substring(0, 10)
                : ""
              : "",
        }));
        // Establecer datos de crédito si corresponde
        if (ord.tipo_pago?.toLowerCase() === "credito") {
          const cuotas = ord.cuotas ?? [];
          let dias = 7;
          
          // Calcular los días de crédito basado en las cuotas existentes
          if (cuotas.length > 1) {
            const diffMs =
              new Date(cuotas[1].fecha_pago_programada).getTime() -
              new Date(cuotas[0].fecha_pago_programada).getTime();
            dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
          } else if (cuotas.length === 1) {
            const fechaEntregaDate = ord.fecha_entrega
              ? new Date(ord.fecha_entrega)
              : new Date();
            const diffMs =
              new Date(cuotas[0].fecha_pago_programada).getTime() -
              fechaEntregaDate.getTime();
            dias = Math.round(diffMs / (1000 * 60 * 60 * 24));
          }
          
          setCreditForm({
            pago_inicial: Number(ord.pago_inicial || 0),
            tipo_credito: dias,
            nro_cuotas: cuotas.length || 1,
          });
        }
        // Construir el carrito a partir de los detalles del pedido
        const cartItems: ProductInCart[] = [];
        for (const det of ord.detalles) {
          // Buscar el producto en la lista de productos cargados
          const prod = activeProducts.find((p) => p.id_producto === det.id_producto);
          if (!prod) continue;
          // Buscar la importación activa para determinar id_importacion y precios
          const actImp = prod.importaciones?.find((imp) => imp.estado_importacion === "activa") || null;
          let priceSel: "a" | "b" | "c" | "d" | "otro" = "otro";
          const precioCom = Number(det.precio_venta_comision);
          if (actImp) {
            if (
              actImp.precio_venta_comision_a &&
              Number(actImp.precio_venta_comision_a) === precioCom
            ) {
              priceSel = "a";
            } else if (
              actImp.precio_venta_comision_b &&
              Number(actImp.precio_venta_comision_b) === precioCom
            ) {
              priceSel = "b";
            } else if (
              actImp.precio_venta_comision_c &&
              Number(actImp.precio_venta_comision_c) === precioCom
            ) {
              priceSel = "c";
            } else if (
              actImp.precio_venta_comision_d &&
              Number(actImp.precio_venta_comision_d) === precioCom
            ) {
              priceSel = "d";
            }
          }
          cartItems.push({
            id_producto: det.id_producto,
            codigo_producto: prod.codigo_producto,
            descripcion: prod.descripcion,
            id_importacion: det.id_importacion || (actImp?.id_importacion ?? 0),
            cantidad: det.cantidad,
            precio_seleccionado: priceSel,
            precio: precioCom,
            subtotal: Number(det.subtotal_venta_comision),
            precio_personalizado: priceSel === "otro" ? precioCom : undefined,
            stock: prod.stock,
          });
        }
        setCart(cartItems);
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setErrorMessage("Error al cargar los datos iniciales");
    } finally {
      setLoadingData(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCreditFormChange(field: string, value: any) {
    setCreditForm((prev) => ({ ...prev, [field]: value }));
  }

  // Manejo de búsqueda y selección de categoría
  function handleCategorySearchChange(value: string) {
    setCategorySearch(value);
    setShowCategoryDropdown(true);
    if (value.trim() === "") {
      setFilteredCategories(categories);
      // Mostrar todos los productos que no están en el carrito
      const productsNotInCart = products.filter(
        (product) =>
          !cart.some((cartItem) => cartItem.id_producto === product.id_producto),
      );
      setFilteredProducts(productsNotInCart);
      setDisplayProducts(productsNotInCart);
      setProductForm((prev) => ({ ...prev, id_categoria: "" }));
    } else {
      const filtered = categories.filter((cat) =>
        cat.nombre_categoria.toLowerCase().includes(value.toLowerCase()),
      );
      setFilteredCategories(filtered);
    }
  }

  function selectCategory(categoryId: number, categoryName: string) {
    setCategorySearch(categoryName);
    setProductForm((prev) => ({ ...prev, id_categoria: String(categoryId) }));
    // Filtrar productos por categoría y que no estén en el carrito
    const filtered = products.filter(
      (p) =>
        p.id_categoria === Number(categoryId) &&
        !cart.some((cartItem) => cartItem.id_producto === p.id_producto),
    );
    setFilteredProducts(filtered);
    setDisplayProducts(filtered);
    // Reiniciar selección de producto
    setProductSearch("");
    setProductForm((prev) => ({ ...prev, id_producto: "" }));
    setSelectedProduct(null);
    setActiveImportacion(null);
    setShowCategoryDropdown(false);
  }

  // Manejo de búsqueda y selección de producto
  function handleProductSearchChange(value: string) {
    setProductSearch(value);
    setShowProductDropdown(true);
    if (value.trim() === "") {
      setDisplayProducts(filteredProducts);
    } else {
      const filtered = filteredProducts.filter((prod) => {
        const searchLower = value.toLowerCase();
        return prod.codigo_producto.toLowerCase().includes(searchLower);
      });
      setDisplayProducts(filtered);
    }
  }

  function selectProduct(productId: number) {
    const product = products.find((p) => p.id_producto === productId);
    if (product) {
      setProductSearch(product.codigo_producto);
      setProductForm((prev) => ({ ...prev, id_producto: String(productId) }));
      setSelectedProduct(product);
      if (product.importaciones) {
        const activeImp = product.importaciones.find(
          (imp) => imp.estado_importacion === "activa",
        );
        setActiveImportacion(activeImp || null);
      } else {
        setActiveImportacion(null);
      }
      setShowProductDropdown(false);
    }
  }

  function handleProductFormChange(field: string, value: any) {
    setProductForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Cuando se selecciona "otro" precio, establecer el precio personalizado con precio_venta_comision_a
      if (field === "precio_seleccionado" && value === "otro" && activeImportacion) {
        updated.precio_personalizado = String(
          activeImportacion.precio_venta_comision_a,
        );
      }
      return updated;
    });
  }

  function calculateProductSubtotal(): number {
    if (!activeImportacion) return 0;
    
    const cantidad = productForm.cantidad;
    let precio = 0;

    if (productForm.precio_seleccionado === "a") {
      precio = Number(activeImportacion.precio_venta_comision_a);
    } else if (productForm.precio_seleccionado === "b" && activeImportacion.precio_venta_comision_b) {
      precio = Number(activeImportacion.precio_venta_comision_b);
	} else if (productForm.precio_seleccionado === "c" && activeImportacion.precio_venta_comision_c) {
      precio = Number(activeImportacion.precio_venta_comision_c);
    } else if (productForm.precio_seleccionado === "d" && activeImportacion.precio_venta_comision_d) {
      precio = Number(activeImportacion.precio_venta_comision_d);
	} else if (productForm.precio_seleccionado === "otro" && productForm.precio_personalizado) {
      precio = Number(productForm.precio_personalizado);
    }

    return precio * cantidad;
  }

  function addProductToCart() {
    if (!selectedProduct || !activeImportacion) {
      setErrorMessage("Debe seleccionar un producto válido");
      return;
    }
    if (productForm.cantidad <= 0) {
      setErrorMessage("La cantidad debe ser mayor a cero");
      return;
    }
    if (productForm.precio_seleccionado === "otro") {
      const precioPersonalizado = Number(productForm.precio_personalizado);
      if (!precioPersonalizado || isNaN(precioPersonalizado) || precioPersonalizado <= 0) {
        setErrorMessage("Debe ingresar un precio personalizado válido");
        return;
      }
      const precioMinimo = Number(activeImportacion.precio_venta_comision_a);
      if (precioPersonalizado < precioMinimo) {
        setErrorMessage(`El precio personalizado debe ser al menos S/ ${precioMinimo.toFixed(2)}`);
        return;
      }
    }

    let precio = 0;
    if (productForm.precio_seleccionado === "a") {
      precio = Number(activeImportacion.precio_venta_comision_a);
    } else if (productForm.precio_seleccionado === "b") {
      precio = Number(activeImportacion.precio_venta_comision_b);
    } else if (productForm.precio_seleccionado === "c") {
      precio = Number(activeImportacion.precio_venta_comision_c);
    } else if (productForm.precio_seleccionado === "d") {
      precio = Number(activeImportacion.precio_venta_comision_d);
    } else if (productForm.precio_seleccionado === "otro") {
      precio = Number(productForm.precio_personalizado);
    }

    const newItem: ProductInCart = {
      id_producto: selectedProduct.id_producto,
      codigo_producto: selectedProduct.codigo_producto,
      descripcion: selectedProduct.descripcion,
      id_importacion: activeImportacion.id_importacion,
      cantidad: productForm.cantidad,
      precio_seleccionado: productForm.precio_seleccionado,
      precio: precio,
      subtotal: precio * productForm.cantidad,
      precio_personalizado: productForm.precio_seleccionado === "otro" ? precio : undefined,
      stock: selectedProduct.stock,
    };

    // Verificar si excede stock
    if (newItem.cantidad > selectedProduct.stock) {
      setPendingProduct(newItem);
      setShowStockWarning(true);
      return;
    }

    setCart((prev) => [...prev, newItem]);
    setShowProductModal(false);
    setErrorMessage(null);
  }

  function confirmAddWithStockWarning() {
    if (pendingProduct) {
      setCart((prev) => [...prev, pendingProduct]);
      setPendingProduct(null);
      setShowStockWarning(false);
      setShowProductModal(false);
      setErrorMessage(null);
    }
  }

  function updateCartItemQuantity(index: number, newQuantity: number) {
    if (newQuantity <= 0) return;
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        cantidad: newQuantity,
        subtotal: updated[index].precio * newQuantity,
      };
      return updated;
    });
  }

  function removeCartItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
    setProductToDelete(null);
  }

  function calculateTotal(): number {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  function generateFechasPago(): string[] {
    if (!form.fecha_entrega || form.tipo_pago !== "credito") {
      return [];
    }
    const fechas: string[] = [];
    const fechaBase = new Date(form.fecha_entrega);
    const diasCredito = Number(creditForm.tipo_credito);
    for (let i = 0; i < creditForm.nro_cuotas; i++) {
      const fecha = new Date(fechaBase);
      fecha.setDate(fecha.getDate() + diasCredito * (i + 1));
      fechas.push(fecha.toISOString().split("T")[0]);
    }
    return fechas;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    if (!form.id_cliente) {
      setErrorMessage("Debe seleccionar un cliente");
      return;
    }
    if (!form.id_vendedor) {
      setErrorMessage("Debe seleccionar un vendedor");
      return;
    }
    if (!form.fecha_entrega) {
      setErrorMessage("Debe seleccionar una fecha de entrega");
      return;
    }
    if (cart.length === 0) {
      setErrorMessage("Debe agregar al menos un producto al pedido");
      return;
    }
    if (form.tipo_pago === "contado" && !form.fecha_pago_programada) {
      setErrorMessage("Debe seleccionar una fecha de pago programada");
      return;
    }
    if (form.tipo_pago === "credito") {
      const total = calculateTotal();
      if (creditForm.pago_inicial >= total) {
        setErrorMessage("El pago inicial debe ser menor al total del pedido");
        return;
      }
      if (creditForm.nro_cuotas <= 0) {
        setErrorMessage("Debe especificar el número de cuotas");
        return;
      }
    }
    setLoading(true);
    try {
      const payload: any = {
        tipo_comprobante: form.tipo_comprobante,
        id_cliente: Number(form.id_cliente),
        id_vendedor: Number(form.id_vendedor),
        tipo_pago: form.tipo_pago,
        fecha_entrega: form.fecha_entrega,
		estado_actual: form.estado_actual || null,
        observaciones: form.observaciones || null,
        items: cart.map((item) => ({
          id_producto: item.id_producto,
          id_importacion: item.id_importacion,
          cantidad: item.cantidad,
          precio_seleccionado: item.precio_seleccionado,
          precio_personalizado: item.precio_seleccionado === "otro" ? item.precio_personalizado : undefined,
        })),
      };
      if (form.tipo_pago === "contado") {
        payload.fecha_pago_programada = form.fecha_pago_programada;
      } else if (form.tipo_pago === "credito") {
        payload.pago_inicial = creditForm.pago_inicial;
        payload.tipo_credito = Number(creditForm.tipo_credito);
        payload.nro_cuotas = creditForm.nro_cuotas;
        payload.fechas_pago = generateFechasPago();
      }
      if (!orderId) {
        throw new Error("El ID del pedido no es válido");
      }
      await axios.put(`/api/orders/${orderId}`, payload);
      router.push("/pedidos");
    } catch (err: any) {
      console.error("Error al actualizar pedido:", err);
      setErrorMessage(err.response?.data?.error || "Error al actualizar el pedido");
    } finally {
      setLoading(false);
    }
  }

  // Obtener información del cliente seleccionado
  const selectedClient = clients.find(
    (c) => c.id_cliente === Number(form.id_cliente),
  );
  const clientRuc = selectedClient?.ruc || "No especificado";
  const clientAddress = selectedClient
    ? [selectedClient.direccion, selectedClient.distrito, selectedClient.provincia]
        .filter(Boolean)
        .join(", ") ||
      "No especificado"
    : "No especificado";

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            Cargando datos del pedido...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Editar Pedido {orderId ? `#${orderId}` : ""}
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">{currentDate}</div>
      </div>
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: Información del pedido */}
          <div className="lg:col-span-2 space-y-6">
            <ComponentCard
              title="Datos del Cliente *"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            >
              <div className="space-y-4">
                <div>
                  <select
                    id="id_cliente"
                    name="id_cliente"
                    value={form.id_cliente}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                  >
                    <option value="">Seleccionar cliente</option>
                    {filteredClients.map((client) => (
                      <option key={client.id_cliente} value={client.id_cliente}>
                        {client.razon_social}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClient && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>RUC:</strong> {clientRuc}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Dirección:</strong> {clientAddress}
                    </p>
                  </div>
                )}
              </div>
            </ComponentCard>
            <ComponentCard
              title="Productos"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              }
            >
              <div className="space-y-4">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  onClick={() => {
                    // Reiniciar formulario de producto y mostrar modal
                    setProductForm({
                      id_categoria: "",
                      id_producto: "",
                      precio_seleccionado: "a",
                      cantidad: 1,
                      precio_personalizado: "",
                    });
                    setCategorySearch("");
                    setProductSearch("");
                    setSelectedProduct(null);
                    setActiveImportacion(null);
                    setErrorMessage(null);
                    const productsNotInCart = products.filter(
                      (product) =>
                        !cart.some(
                          (cartItem) => cartItem.id_producto === product.id_producto,
                        ),
                    );
                    setFilteredProducts(productsNotInCart);
                    setDisplayProducts(productsNotInCart);
                    setFilteredCategories(categories);
                    setShowProductModal(true);
                  }}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Añadir Productos
                </button>
                {cart.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                            Producto
                          </th>
                          <th className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                            Cantidad
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                            Precio
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                            Subtotal
                          </th>
                          <th className="text-center py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map((item, index) => (
                          <tr
                            key={index}
                            className="border-b dark:border-gray-700"
                          >
                            <td className="py-3 px-2">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {item.descripcion}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {item.codigo_producto}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  value={item.cantidad}
                                  onChange={(e) =>
                                    updateCartItemQuantity(
                                      index,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="h-9 w-20 text-center rounded border px-2 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                                />
                                {item.cantidad > item.stock && (
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                    ⚠️ Límite de stock {item.stock} excedido
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right text-gray-900 dark:text-white">
                              S/ {item.precio.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-right font-semibold text-gray-900 dark:text-white">
                              S/ {item.subtotal.toFixed(2)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => setProductToDelete(index)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Monto total */}
                    <div className="mt-6 flex justify-end">
                      <div className="rounded-lg p-4 min-w-[300px]">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                            Total:
                          </span>
                          <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                            S/ {calculateTotal().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {cart.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No hay productos agregados
                  </div>
                )}
              </div>
            </ComponentCard>
            <ComponentCard
              title="Detalles del pedido"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tipo_comprobante">Comprobante *</Label>
                  <select
                    id="tipo_comprobante"
                    name="tipo_comprobante"
                    value={form.tipo_comprobante}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                  >
                    <option value="boleta">Boleta</option>
                    <option value="factura">Factura</option>
                    <option value="guia">Guía de Remisión</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="id_vendedor">Vendedor *</Label>
                  <select
                    id="id_vendedor"
                    name="id_vendedor"
                    value={form.id_vendedor}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                  >
                    <option value="">Seleccionar vendedor</option>
                    {filteredSellers.map((seller) => (
                      <option key={seller.id_usuario} value={seller.id_usuario}>
                        {seller.nombre_completo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="fecha_entrega">Fecha de Entrega *</Label>
                  <input
                    type="date"
                    id="fecha_entrega"
                    name="fecha_entrega"
                    value={form.fecha_entrega}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                  />
                </div>
				<div>
                  <Label htmlFor="estado_actual">Estado de Entrega *</Label>
                  <select
                    id="estado_actual"
                    name="estado_actual"
                    value={form.estado_actual}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                  >
                    <option value="registrado">Registrado</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            </ComponentCard>
            <ComponentCard
              title="Observaciones"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
              }
            >
              <textarea
                id="observaciones"
                name="observaciones"
                value={form.observaciones}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                placeholder="Observaciones adicionales (opcional)"
              />
            </ComponentCard>
          </div>
          {/* Columna derecha: Tipo de pago y resumen */}
          <div className="space-y-6">
            <ComponentCard
              title="Tipo de Pago"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              }
            >
              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo_pago"
                      value="contado"
                      checked={form.tipo_pago === "contado"}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Contado
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo_pago"
                      value="credito"
                      checked={form.tipo_pago === "credito"}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Crédito
                    </span>
                  </label>
                </div>
                {form.tipo_pago === "contado" && (
                  <div>
                    <Label htmlFor="fecha_pago_programada">
                      Fecha de Pago Programada *
                    </Label>
                    <input
                      type="date"
                      id="fecha_pago_programada"
                      name="fecha_pago_programada"
                      value={form.fecha_pago_programada}
                      onChange={handleChange}
                      required
                      className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                    />
                  </div>
                )}
                {form.tipo_pago === "credito" && (
                  <div className="space-y-4">
                    {/*<div>
                      <Label htmlFor="pago_inicial">Pago Inicial (S/) *</Label>
                      <input
                        type="number"
                        id="pago_inicial"
                        min={0}
                        step={0.1}
                        value={creditForm.pago_inicial}
                        onChange={(e) =>
                          handleCreditFormChange(
                            "pago_inicial",
                            Number(e.target.value),
                          )
                        }
                        className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                      />
                    </div>*/}
                    <div>
                      <Label htmlFor="tipo_credito">
                        Crédito a (días) *
                      </Label>
                      <input
                        type="number"
                        id="tipo_credito"
                        min={1}
                        value={creditForm.tipo_credito}
                        onChange={(e) =>
                          handleCreditFormChange(
                            "tipo_credito",
                            Number(e.target.value),
                          )
                        }
                        className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nro_cuotas">
                        Número de Cuotas *
                      </Label>
                      <input
                        type="number"
                        id="nro_cuotas"
                        min={1}
                        value={creditForm.nro_cuotas}
                        onChange={(e) =>
                          handleCreditFormChange(
                            "nro_cuotas",
                            Number(e.target.value),
                          )
                        }
                        className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                      />
                    </div>
                    {form.fecha_entrega && creditForm.nro_cuotas > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                          Cronograma de Pagos:
                        </p>
                        <div className="space-y-1">
                          <div className="space-y-2 mt-2">
                            {generateFechasPago().map((fecha, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-700"
                              >
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Cuota {index + 1}:
                                </span>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  S/ {((calculateTotal() - creditForm.pago_inicial) / creditForm.nro_cuotas).toFixed(2)}
                                </span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {new Date(fecha + "T00:00:00").toLocaleDateString('es-PE', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ComponentCard>
            <ComponentCard
              title="Resumen del Pedido"
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              }
            >
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Productos:
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {cart.length}
                  </span>
                </div>
                <div className="border-t dark:border-gray-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                      S/ {calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
                {form.tipo_pago === "credito" && creditForm.pago_inicial > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Pago Inicial:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        S/ {creditForm.pago_inicial.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Saldo Pendiente:
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        S/ {(calculateTotal() - creditForm.pago_inicial).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ComponentCard>
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading || cart.length === 0}
              >
                {loading ? "Actualizando..." : "Actualizar Pedido"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/pedidos")}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Modal para agregar productos */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Añadir Producto
                </h3>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {errorMessage}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {/* Búsqueda de categoría */}
                <div className="relative" ref={categoryInputRef}>
                  <Label htmlFor="category_search">Categoría</Label>
                  <input
                    type="text"
                    id="category_search"
                    value={categorySearch}
                    onChange={(e) => handleCategorySearchChange(e.target.value)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    placeholder="Buscar categoría..."
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                  />
                  {showCategoryDropdown && filteredCategories.length > 0 && (
                    <div
                      ref={categoryDropdownRef}
                      className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {filteredCategories.map((cat) => (
                        <button
                          key={cat.id_categoria}
                          type="button"
                          onClick={() =>
                            selectCategory(cat.id_categoria, cat.nombre_categoria)
                          }
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white"
                        >
                          {cat.nombre_categoria}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Búsqueda de producto */}
                <div className="relative" ref={productInputRef}>
                  <Label htmlFor="product_search">Producto *</Label>
                  <input
                    type="text"
                    id="product_search"
                    value={productSearch}
                    onChange={(e) => handleProductSearchChange(e.target.value)}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Buscar por código..."
                    disabled={!productForm.id_categoria}
                    className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {showProductDropdown && displayProducts.length > 0 && (
                    <div
                      ref={productDropdownRef}
                      className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {displayProducts.map((prod) => (
                        <button
                          key={prod.id_producto}
                          type="button"
                          onClick={() => selectProduct(prod.id_producto)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {prod.codigo_producto}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {prod.descripcion}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProduct && activeImportacion && (
                  <>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Stock disponible:</strong> {selectedProduct.stock}{" "}
                        unidades
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="precio_seleccionado">
                        Precio de Venta *
                      </Label>
                      <select
                        id="precio_seleccionado"
                        value={productForm.precio_seleccionado}
                        onChange={(e) =>
                          handleProductFormChange(
                            "precio_seleccionado",
                            e.target.value,
                          )
                        }
                        className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                      >
                        <option value="a">
                          Precio A - S/{" "}
                          {Number(
                            activeImportacion.precio_venta_comision_a,
                          ).toFixed(2)}
                        </option>
                        {activeImportacion.precio_venta_comision_b && (
                          <option value="b">
                            Precio B - S/{" "}
                            {Number(
                              activeImportacion.precio_venta_comision_b,
                            ).toFixed(2)}
                          </option>
                        )}
						{activeImportacion.precio_venta_comision_c && (
                          <option value="c">
                            Precio C - S/{" "}
                            {Number(
                              activeImportacion.precio_venta_comision_c,
                            ).toFixed(2)}
                          </option>
                        )}
						{activeImportacion.precio_venta_comision_d && (
                          <option value="d">
                            Precio D - S/{" "}
                            {Number(
                              activeImportacion.precio_venta_comision_d,
                            ).toFixed(2)}
                          </option>
                        )}
                        <option value="otro">Precio Personalizado</option>
                      </select>
                    </div>

                    {productForm.precio_seleccionado === "otro" && (
                      <div>
                        <Label htmlFor="precio_personalizado">
                          Precio Personalizado (S/) *
                        </Label>
                        <input
                          type="number"
                          id="precio_personalizado"
                          min={Number(activeImportacion.precio_venta_comision_a)}
                          step={0.01}
                          value={productForm.precio_personalizado}
                          onChange={(e) =>
                            handleProductFormChange(
                              "precio_personalizado",
                              e.target.value,
                            )
                          }
                          className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                        />
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Precio mínimo: S/{" "}
                          {Number(
                            activeImportacion.precio_venta_comision_a,
                          ).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="cantidad">Cantidad *</Label>
                      <input
                        type="number"
                        id="cantidad"
                        min={1}
                        value={productForm.cantidad}
                        onChange={(e) =>
                          handleProductFormChange(
                            "cantidad",
                            Number(e.target.value),
                          )
                        }
                        className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white/90 dark:border-gray-700"
                      />
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Subtotal:
                        </span>
                        <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                          S/ {calculateProductSubtotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
                <Button
                  type="button"
                  variant="primary"
                  onClick={addProductToCart}
                  className="flex-1"
                  disabled={!selectedProduct || !activeImportacion}
                >
                  Añadir al Pedido
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProductModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de advertencia de stock */}
      {showStockWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Advertencia de Stock
                </h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                La cantidad solicitada ({pendingProduct?.cantidad}) excede el
                stock disponible ({pendingProduct?.stock}). ¿Desea continuar de
                todos modos?
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={confirmAddWithStockWarning}
                className="flex-1"
              >
                Continuar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowStockWarning(false);
                  setPendingProduct(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar producto */}
      {productToDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Confirmar Eliminación
                </h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                ¿Está seguro de que desea eliminar este producto del pedido?
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={() => removeCartItem(productToDelete)}
                className="flex-1"
              >
                Eliminar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductToDelete(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}