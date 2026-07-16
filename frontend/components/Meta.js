// components/Meta.js
import Head from 'next/head';

export default function Meta({ title, description, image, url }) {
  const siteTitle = title ? `${title} | Make Trend` : 'Make Trend';
  const metaDesc = description || 'Create and share trending campaigns with Make Trend.';
  const metaImage = image || 'https://maketrend.vercel.app/og-default.jpg';
  const metaUrl = url || 'https://maketrend.vercel.app';

  return (
    <Head>
      {/* ── SEO Tags ── */}
      <title>{siteTitle}</title>
      <meta name="description" content={metaDesc} />

      {/* ── Open Graph (OG) Tags ── */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:type" content="website" />

      {/* ── Twitter Card Tags ── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={metaImage} />
    </Head>
  );
}