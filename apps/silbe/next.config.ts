import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.silbe.at' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      { source: '/collections/alle-werke', destination: '/editionen', permanent: true },
      { source: '/blogs/journal/:slug*', destination: '/bibliothek/:slug*', permanent: true },
      { source: '/blogs/journal', destination: '/bibliothek', permanent: true },
      { source: '/pages/journal', destination: '/bibliothek', permanent: true },
      { source: '/pages/ueber-uns', destination: '/werkstatt', permanent: true },
      { source: '/pages/autoren', destination: '/stimmen', permanent: true },
      { source: '/pages/widerruf', destination: '/widerrufsrecht', permanent: true },
    ];
  },
};

export default nextConfig;
