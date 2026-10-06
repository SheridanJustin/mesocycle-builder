import type { NextConfig } from 'next';

const nextConfig: NextConfig = { transpilePackages: ['@mesocycle/shared', '@mesocycle/volume-engine'] };

export default nextConfig;
