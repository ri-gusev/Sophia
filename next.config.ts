import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { agentUpgrade: "security" },
  outputFileTracingIncludes: {
    "/api/reader/**": ["./src/features/reader/corpus/**/*.json"],
  },
};
export default nextConfig;
