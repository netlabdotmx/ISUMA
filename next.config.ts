import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
