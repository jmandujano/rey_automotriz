import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/categorias-financieras
 * Obtiene todas las categorías financieras
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener todas las categorías financieras
    const categorias = await prisma.categoriaFinanciera.findMany({
      select: {
        id_categoria_financiera: true,
        nombre_categoria: true
      },
      orderBy: {
        nombre_categoria: 'asc'
      }
    });

    return NextResponse.json(categorias);
  } catch (error) {
    console.error("Error al obtener categorías financieras:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}