import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'standalone', // descomente se for usar Docker ao invés de Netlify
  reactStrictMode: false, // evita double-render em dev
};

export default nextConfig;
