import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages must NOT be bundled by webpack:
  //  - `@prisma/client` / `prisma`: load the generated query-engine binary.
  //  - `ws`: bundling mangles its internal frame-masking code, causing
  //    `TypeError: b.mask is not a function` when the Neon adapter opens a
  //    WebSocket. It must be loaded intact from node_modules.
  //  - `@neondatabase/serverless` / `@prisma/adapter-neon`: keep alongside `ws`
  //    so the driver and its WebSocket dependency resolve consistently.
  // Next.js still traces these into the Vercel function via output tracing.
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
    "ws",
  ],
  // Limit build parallelism to keep memory usage modest on constrained
  // machines. Vercel's build environment is unaffected by this lower bound.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
