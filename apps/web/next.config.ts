import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@plexo/ui"],
  turbopack: {
    root: "../../",
  },
};

export default nextConfig;
