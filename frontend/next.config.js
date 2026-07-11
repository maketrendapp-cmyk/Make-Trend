// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      // Template preview: /ncell-reward-v1
      {
        source: '/ncell-reward-v1',
        destination: '/templates/ncell-reward-v1',
      },
      // Campaign: /ncell-reward-v1/abc123
      {
        source: '/ncell-reward-v1/:campaignId',
        destination: '/templates/ncell-reward-v1?id=:campaignId',
      },
      // Task: /task/abc123
      {
        source: '/task/:id',
        destination: '/tasks?id=:id',
      },
      // Share: /share/abc123
      {
        source: '/share/:id',
        destination: '/share?id=:id',
      },
    ];
  },
};

module.exports = nextConfig;