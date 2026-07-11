/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/templates/ncell-reward-v1/:campaignId',
        destination: '/templates/ncell-reward-v1?id=:campaignId',
      },
      // If you also want the shorter version:
      {
        source: '/ncell-reward-v1/:campaignId',
        destination: '/templates/ncell-reward-v1?id=:campaignId',
      },
    ];
  },
};

module.exports = nextConfig;