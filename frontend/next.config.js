/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' },

  // Tree-shake icon/chart/date libraries so only imported symbols are bundled
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', 'fuse.js'],
  },
};

// Only strip console.* in production — SWC does not accept `false` as a value
if (process.env.NODE_ENV === 'production') {
  nextConfig.compiler = { removeConsole: { exclude: ['error', 'warn'] } };
}

module.exports = nextConfig;
