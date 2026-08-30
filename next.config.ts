import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Temporary during prototype replacement: CI runs lint as an independent gate.
  // Remove this once the legacy prototype is deleted in Task 6.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
