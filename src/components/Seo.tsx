import Head from 'next/head';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gridcoin.club';
export const SITE_NAME = 'Gridcoin Club';

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  ogImagePath?: string;
  // Optional JSON-LD payload(s) emitted as one or more script blocks. Pass
  // a plain object or an array; built via the helpers below to keep the
  // identity payloads consistent across pages.
  jsonLd?: object | object[];
}

export function Seo({
  title,
  description,
  path,
  ogType = 'website',
  noindex,
  ogImagePath,
  jsonLd,
}: SeoProps) {
  const canonicalUrl = `${SITE_URL}${path}`;
  const ogImageUrl = ogImagePath
    ? `${SITE_URL}${ogImagePath}`
    : `${SITE_URL}/og-image.png`;

  const ldBlocks = jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    : [];

  return (
    <Head>
      <title>{title}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={canonicalUrl} />

      <link
        key="icon-svg"
        rel="icon"
        type="image/svg+xml"
        href="/ic-logo.svg"
      />
      <link
        key="icon"
        rel="icon"
        type="image/x-icon"
        href="/favicon.ico"
      />

      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:type" property="og:type" content={ogType} />
      <meta key="og:url" property="og:url" content={canonicalUrl} />
      <meta key="og:image" property="og:image" content={ogImageUrl} />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:locale" property="og:locale" content="en_US" />

      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={ogImageUrl} />

      {noindex && <meta key="robots" name="robots" content="noindex, nofollow" />}

      {ldBlocks.map((block, idx) => (
        <script
          // JSON.stringify on a server-built object: not user input, no XSS
          // surface. Standard Next.js pattern for schema.org markup.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
          key={`ld-${idx}`}
          type="application/ld+json"
        />
      ))}
    </Head>
  );
}

// --- JSON-LD helpers ---------------------------------------------------------
// Schema.org shapes used across the hub. Centralized so every page emits
// the same Organization/WebSite identity, and so ItemList payloads stay in
// sync with the visible directory.

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#org`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/ic-logo.svg`,
    sameAs: [
      'https://github.com/gridcat',
      'https://github.com/gridcoin-community',
    ],
  };
}

export function websiteLd(description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description,
    publisher: { '@id': `${SITE_URL}/#org` },
  };
}

interface ItemListEntry {
  name: string;
  url: string;
  description?: string;
}

export function itemListLd(name: string, items: ItemListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: item.url,
      name: item.name,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}
