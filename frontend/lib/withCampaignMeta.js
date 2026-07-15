// lib/withCampaignMeta.js
import React from 'react';
import Meta from '../components/Meta';

// ── Internal helper (not exported) ──
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

async function fetchCampaign(id) {
  if (!id) return null;
  try {
    const res = await fetch(`${BACKEND}/api/campaigns/${id}`);
    const data = await res.json();
    return data.success ? data.campaign : null;
  } catch {
    return null;
  }
}

// ── Main HOC ──
export function withCampaignMeta(Component, defaultMeta) {
  const WrappedComponent = ({ campaign, ...props }) => {
    const meta = campaign
      ? {
          title: campaign.title,
          description: campaign.description,
          image: campaign.image || defaultMeta.image,
          url: defaultMeta.url.replace('{id}', campaign.id),
        }
      : defaultMeta;

    return (
      <>
        <Meta {...meta} />
        <Component {...props} campaign={campaign} />
      </>
    );
  };

  WrappedComponent.getServerSideProps = async ({ query }) => {
    const campaignId = query.id || query.campaign || null;
    const campaign = campaignId ? await fetchCampaign(campaignId) : null;
    return { props: { campaign } };
  };

  WrappedComponent.displayName = `withCampaignMeta(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}