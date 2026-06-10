import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Prisma client external in serverless/edge bundling so the
  // generated engine is loaded correctly on Vercel Node.js functions.
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
