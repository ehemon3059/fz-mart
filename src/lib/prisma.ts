import { PrismaClient } from "@prisma/client";

// Singleton Prisma client.
//
// Next.js dev mode hot-reloads modules on every change. A fresh
// `new PrismaClient()` per reload opens a new connection pool each time and
// quickly exhausts MySQL's connection limit. Caching the instance on
// `globalThis` keeps exactly one client alive across reloads in development.
// In production the module is evaluated once, so the global cache is a no-op.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
