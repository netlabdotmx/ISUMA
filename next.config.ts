import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xmlrpc"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sunny.pet",
      },
    ],
  },
};

export default nextConfig;
