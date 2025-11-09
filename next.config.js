/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Optimize images
  images: {
    domains: [], // Add any image hosting domains if used
  },
  // Enable compression for better performance
  compress: true,
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
};

module.exports = nextConfig;