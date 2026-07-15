// lib/withCampaignMeta.js
import Meta from '../components/Meta';
import { fetchCampaign } from './fetchCampaign';

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

  // ── Server‑side data fetching ──
  WrappedComponent.getServerSideProps = async ({ query }) => {
    const campaignId = query.id || query.campaign || null;
    const campaign = campaignId ? await fetchCampaign(campaignId) : null;
    return { props: { campaign } };
  };

  WrappedComponent.displayName = `withCampaignMeta(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}