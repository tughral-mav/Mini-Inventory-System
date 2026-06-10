import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/**
 * Database layer: a single shared PrismaClient backed by Neon's serverless
 * driver adapter.
 *
 * Why the adapter (instead of Prisma's default TCP connection):
 * On serverless platforms (Vercel functions) a raw TCP connection to Postgres
 * on port 5432 is unreliable — it hits IPv6-egress and cold-start timeouts and
 * fails with `P1001: Can't reach database server`. The Neon adapter instead
 * talks to Neon over HTTPS/WebSocket (port 443): simple queries go over an HTTP
 * `fetch` and transactions over a WebSocket, both of which serverless runtimes
 * support cleanly. This is the recommended Prisma + Neon + Vercel setup.
 */

// Neon's WebSocket transport needs a WebSocket implementation in Node runtimes
// (local dev + Vercel Node functions have no global WebSocket).
neonConfig.webSocketConstructor = ws;
// Send non-transactional queries over HTTPS fetch — faster cold starts and the
// most reliable transport on serverless. Transactions still use the WebSocket.
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to your environment / .env.");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
