import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@vee/ui', '@vee/shared', '@vee/core', '@vee/db'],
};

export default nextConfig;
