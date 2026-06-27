import { BRAND } from '@/config/brand';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/checkout',
        '/my-bookings',
        '/profile',
        '/login',
        '/signup',
        '/verify-email/'
      ]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
