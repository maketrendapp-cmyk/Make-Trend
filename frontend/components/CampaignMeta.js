// components/CampaignMeta.js
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Meta from './Meta';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

export default function CampaignMeta({ 
  children, 
  defaultTitle, 
  defaultDescription, 
  defaultImage = 'https://maketrend.vercel.app/og-default.jpg',
  defaultSlug 
}) {
  const router = useRouter();
  const campaignId = router.query.id || router.query.campaign;
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaignId) {
      fetch(`${BACKEND}/api/campaigns/${campaignId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setCampaign(data.campaign);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [campaignId]);

  const meta = campaign
    ? {
        title: campaign.title,
        description: campaign.description,
        image: campaign.image || defaultImage,
        url: `https://maketrend.vercel.app/${defaultSlug || 'campaign'}?id=${campaign.id}`,
      }
    : {
        title: defaultTitle || 'Make Trend',
        description: defaultDescription || 'Create and share trending campaigns.',
        image: defaultImage,
        url: `https://maketrend.vercel.app/${defaultSlug || ''}`,
      };

  return (
    <>
      <Meta {...meta} />
      {children}
    </>
  );
}