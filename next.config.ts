import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep ONLY Prisma external so its generated query-engine binary is loaded
  // correctly on Vercel's Node.js functions. The Neon adapter, the Neon
  // serverless driver, and `ws` are pure JS and must be *bundled* into the
  // function (marking them external can make them unresolvable in the Lambda,
  // causing a server-side exception at runtime).
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Limit build parallelism to keep memory usage modest on constrained
  // machines. Vercel's build environment is unaffected by this lower bound.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
