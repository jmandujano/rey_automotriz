import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/movimientos-financieros/export
 * Exporta los movimientos financieros a un archivo CSV
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener datos del body
    const body = await req.json();
    const { movimientos } = body;

    if (!movimientos || !Array.isArray(movimientos)) {
      return NextResponse.json(
        { error: "Datos de movimientos inválidos" },
        { status: 400 }
      );
    }

    // Crear encabezados CSV
    const headers = [
      "ID",
      "Tipo",
      "Categoría",
      "Descripción",
      "Monto",
      "Fecha",
      "Usuario"
    ];

    // Convertir movimientos a filas CSV
    const rows = movimientos.map((mov: any) => [
      mov.id_movimiento,
      mov.tipo_movimiento === "ingreso" ? "Ingreso" : "Egreso",
      mov.categoria?.nombre_categoria || "Sin categoría",
      mov.descripcion,
      Number(mov.monto).toFixed(2),
      new Date(mov.fecha_movimiento).toLocaleDateString('es-PE'),
      mov.usuario?.nombre_completo || "N/A"
    ]);

    // Calcular totales
    const totalIngresos = movimientos
      .filter((m: any) => m.tipo_movimiento === "ingreso")
      .reduce((sum: number, m: any) => sum + Number(m.monto), 0);

    const totalEgresos = movimientos
      .filter((m: any) => m.tipo_movimiento === "egreso")
      .reduce((sum: number, m: any) => sum + Number(m.monto), 0);

    const balance = totalIngresos - totalEgresos;

    // Agregar filas de resumen
    rows.push([]);
    rows.push(["", "", "", "RESUMEN", "", "", ""]);
    rows.push(["", "", "", "Total Ingresos:", totalIngresos.toFixed(2), "", ""]);
    rows.push(["", "", "", "Total Egresos:", totalEgresos.toFixed(2), "", ""]);
    rows.push(["", "", "", "Balance:", balance.toFixed(2), "", ""]);

    // Función para escapar valores CSV
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Construir contenido CSV
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(","))
    ].join("\n");

    // Agregar BOM para soporte de caracteres especiales en Excel
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    // Generar nombre de archivo con fecha
    const fecha = new Date();
    const fechaFormato = `${fecha.getDate().toString().padStart(2, '0')}${(fecha.getMonth() + 1).toString().padStart(2, '0')}${fecha.getFullYear()}`;
    const filename = `movimientos_financieros_${fechaFormato}.csv`;

    // Retornar el archivo CSV
    return new NextResponse(csvWithBom, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("Error al exportar movimientos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}