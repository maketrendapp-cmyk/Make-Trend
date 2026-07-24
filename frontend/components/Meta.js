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
  const metaImage = image || 'https://maketrend.app/og-image.png';
  const metaUrl = url || 'https://maketrend.app/';

  return (
    <Head key="page-meta">
      <title key="title">{siteTitle}</title>
      <meta key="description" name="description" content={metaDesc} />

      {/* ── Open Graph ── */}
      <meta key="og-title" property="og:title" content={siteTitle} />
      <meta key="og-desc" property="og:description" content={metaDesc} />
      <meta key="og-image" property="og:image" content={metaImage} />
      <meta key="og-url" property="og:url" content={metaUrl} />
      <meta key="og-type" property="og:type" content="website" />

      {/* ── Twitter Card ── */}
      <meta key="twitter-card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter-title" name="twitter:title" content={siteTitle} />
      <meta key="twitter-desc" name="twitter:description" content={metaDesc} />
      <meta key="twitter-image" name="twitter:image" content={metaImage} />
    </Head>
  );
}