// lib/withCampaignMeta.js
import React from 'react';
import Meta from '../components/Meta';

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

  WrappedComponent.displayName = `withCampaignMeta(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}