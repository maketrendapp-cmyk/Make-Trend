// frontend/components/Meta.js
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Meta({ 
  title, 
  description, 
  image, 
  type = 'website',
  keywords = 'viral campaigns, social media growth, share to unlock'
}) {
  const router = useRouter();
  const canonicalUrl = `https://maketrend.com${router.asPath}`;

  // Fallback values if not provided (DeepSeek-style branding)
  const siteTitle = 'MakeTrend - Viral Campaign Builder';
  const fullTitle = title ? `${title} | MakeTrend` : siteTitle;
  const fullDescription = description || 'Create share-to-unlock campaigns for Instagram, YouTube, TikTok, and more. Grow your social media in 2 minutes.';
  const fullImage = image || '/images/og-default.jpg'; // We'll set a default OG image later

  return (
    <Head>
      {/* Basic SEO */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Open Graph / Social Media (Facebook, LinkedIn, Discord) */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="MakeTrend" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />

      {/* Theme Color (DeepSeek uses #ffffff for light mode) */}
      <meta name="theme-color" content="#ffffff" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}