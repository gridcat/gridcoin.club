import type { GetServerSideProps } from 'next';
import { SITE_URL } from '@/components/Seo';

interface Entry {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
}

const ENTRIES: Entry[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/tools', changefreq: 'weekly', priority: '0.8' },
  { path: '/nodes', changefreq: 'daily', priority: '0.8' },
  // The full inventory is indexable; the per-node pages are not — see the
  // noindex in routes/nodes/detail.tsx.
  { path: '/nodes/all', changefreq: 'daily', priority: '0.6' },
  { path: '/projects', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
];

function buildXml(): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ENTRIES.map((e) => (
    `  <url>
    <loc>${SITE_URL}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.write(buildXml());
  res.end();
  return { props: {} };
};

export default function Sitemap() {
  return null;
}
