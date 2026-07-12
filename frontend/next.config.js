// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
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

module.exports = nextConfig;