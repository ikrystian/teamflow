import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ['nexus.studio-ai.com.pl', 'omarchy-2.tail01dfc7.ts.net'],
  poweredByHeader: false,
  reactStrictMode: true,
  // Obraz Docker może korzystać z samodzielnego serwera Next.js (NEXT_OUTPUT=standalone).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: {
    // Szyfrogramy załączników sejfu i importów CSV mogą przekraczać domyślny 1 MB.
    serverActions: { bodySizeLimit: "16mb" },
  },
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

export default withNextIntl(nextConfig);
