import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@orbitscan/shared-types"],
};

export default nextConfig;
