import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['team.studio-ai.com.pl'],
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
