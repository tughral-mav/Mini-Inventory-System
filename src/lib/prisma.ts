import { PrismaClient } from "@prisma/client";

/**
 * Database layer: a single shared PrismaClient instance.
 *
 * In serverless/dev environments modules are reloaded frequently, which would
 * otherwise create a new connection pool on every reload and exhaust the
 * database. We cache the client on `globalThis` to reuse it across reloads.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
