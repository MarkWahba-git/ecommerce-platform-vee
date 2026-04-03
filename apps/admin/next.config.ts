import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vee/ui', '@vee/shared', '@vee/core', '@vee/db'],
};

export default nextConfig;
