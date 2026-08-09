// frontend/next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // ── Custom service worker for FCM push notifications ──
  // This tells next-pwa to build a custom worker from the 'worker' folder
  // and output it to 'public' (the built file will be firebase-messaging-sw.js)
  customWorkerSrc: 'worker',
  customWorkerDest: 'public',
  // If you have multiple custom workers, you can specify a file instead:
  // customWorkerSrc: 'worker/firebase-messaging-sw.js',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
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
      // ── Cloudinary ──
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  async rewrites() {
    return [
      // ── ✅ Exclude ProductTrend from rewrites ──
      {
        source: '/productstrend/:path*',
        destination: '/productstrend/:path*',
      },
      // ── ✅ Exclude Grow Together from rewrites ──
      {
        source: '/groweachother/:path*',
        destination: '/groweachother/:path*',
      },
      // ── Community page ──
      {
        source: '/community/:path*',
        destination: '/community/:path*',
      },
      // ── User profile ──
      {
        source: '/userinfo/:path*',
        destination: '/userinfo/:path*',
      },
      // ── Existing catch‑all rules ──
      {
        source: '/:slug',
        destination: '/templates/:slug',
      },
      {
        source: '/:slug/:campaignId',
        destination: '/templates/:slug?id=:campaignId',
      },
      {
        source: '/task/:id',
        destination: '/tasks?id=:id',
      },
      {
        source: '/share/:id',
        destination: '/share?id=:id',
      },
    ];
  },
};

module.exports = withPWA(nextConfig);