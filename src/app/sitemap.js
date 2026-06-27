import { fetchPropertiesListServer } from '@/lib/server/properties';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default async function sitemap() {
  let properties = [];
  try {
    properties = await fetchPropertiesListServer();
  } catch {
    properties = [];
  }

  const staticRoutes = [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/search`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/cookies`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/cancellation`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/faq`, changeFrequency: 'monthly', priority: 0.4 }
  ];

  const hotelRoutes = properties.map((p) => ({
    url: `${siteUrl}/hotel/${p.id}`,
    lastModified: p.updated_at || p.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8
  }));

  return [...staticRoutes, ...hotelRoutes];
}
