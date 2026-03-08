import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3002", "gateway-admin.getplexo.com"],
    },
  },
};

export default nextConfig;
