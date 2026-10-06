import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mesocycle/shared', '@mesocycle/volume-engine'],
  // The e2e dev server uses its own build dir so it never clashes with `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
