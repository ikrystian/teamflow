import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['nexus.studio-ai.com.pl', 'omarchy-2.tail01dfc7.ts.net'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
};

export default nextConfig;
