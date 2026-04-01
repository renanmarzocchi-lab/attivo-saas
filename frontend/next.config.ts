import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false, // evita double-render em dev
};

export default nextConfig;
