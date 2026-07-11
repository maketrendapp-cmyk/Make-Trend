// frontend/next.config.js
async rewrites() {
  return [
    // More specific route first
    {
      source: '/ncell-reward-v1/:campaignId',
      destination: '/templates/ncell-reward-v1?id=:campaignId',
    },
    // Less specific route last
    {
      source: '/ncell-reward-v1',
      destination: '/templates/ncell-reward-v1',
    },
    // Task and share rewrites
    {
      source: '/task/:id',
      destination: '/tasks?id=:id',
    },
    {
      source: '/share/:id',
      destination: '/share?id=:id',
    },
  ];
}