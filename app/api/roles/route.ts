import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/roles
// Returns the list of roles available in the system.
export async function GET() {
  const roles = await prisma.role.findMany({ orderBy: { id_rol: 'asc' } });
  return NextResponse.json(roles);
}