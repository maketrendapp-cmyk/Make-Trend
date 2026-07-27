// frontend/next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',           // your static assets folder
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // ── Image Optimization Configuration ──
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'mms.businesswire.com',
      },
      {
        protocol: 'https',
        hostname: 'maketrend.app',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
      {
        protocol: 'https',
        hostname: 'staticg.sportskeeda.com',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'techgenyz.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  async rewrites() {
    return [
      // Template preview: /ncell-reward-v1 → /templates/ncell-reward-v1
      {
        source: '/:slug',
        destination: '/templates/:slug',
      },
      // Template campaign: /ncell-reward-v1/abc123 → /templates/ncell-reward-v1?id=abc123
      {
        source: '/:slug/:campaignId',
        destination: '/templates/:slug?id=:campaignId',
      },
      // Task: /task/abc123 → /tasks?id=abc123
      {
        source: '/task/:id',
        destination: '/tasks?id=:id',
      },
      // Share: /share/abc123 → /share?id=abc123
      {
        source: '/share/:id',
        destination: '/share?id=:id',
      },
    ];
  },
};

module.exports = withPWA(nextConfig);