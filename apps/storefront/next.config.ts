import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vee/ui', '@vee/shared', '@vee/core', '@vee/db'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
