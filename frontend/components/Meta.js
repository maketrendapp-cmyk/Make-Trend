// components/Meta.js
import Head from 'next/head';

export default function Meta({ title, description, image, url }) {
  const siteTitle = title ? `${title} | Make Trend` : 'Make Trend';
  const metaDesc = description || 'Create and share trending campaigns with Make Trend.';
  const metaImage = image || 'https://maketrend.vercel.app/og-default.jpg';
  const metaUrl = url || 'https://maketrend.vercel.app';

  return (
    <Head>
      {/* Global Resources */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />
      <link rel="icon" href="/favicon.ico" />

      {/* Dynamic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={metaDesc} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={metaImage} />
    </Head>
  );
}