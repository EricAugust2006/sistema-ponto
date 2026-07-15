import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-pg-migrate"],
};

export default nextConfig;
