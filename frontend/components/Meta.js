// components/Meta.js
import Head from 'next/head';

export default function Meta({ title, description, image, url, extraKeywords }) {
  const siteTitle = title ? `${title} | Make Trend` : 'Make Trend';
  let metaDesc = description || 'Create and share trending campaigns with Make Trend.';
  // ── Append template names to description if provided ──
  if (extraKeywords && extraKeywords.length > 0) {
    const keywordsStr = extraKeywords.slice(0, 10).join(', ');
    metaDesc = `${metaDesc} Templates: ${keywordsStr}.`;
  }
  const metaImage = image || 'https://maketrend.vercel.app/og-default.jpg';
  const metaUrl = url || 'https://maketrend.vercel.app';

  return (
    <Head>
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