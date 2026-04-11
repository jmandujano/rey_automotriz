import { PrismaClient } from '@prisma/client';

/**
 * Singleton wrapper around the Prisma client.
 *
 * Creating a new Prisma client for every request is expensive and
 * can quickly exhaust the underlying PostgreSQL connection pool.
 * Instead we create a single shared client in the Node.js global
 * namespace when running on the server. In development this file
 * is hot‑reloaded by Next.js, so the client is cached on the
 * globalThis object to avoid repeatedly instantiating it.
 */
// Debería verse así:


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;