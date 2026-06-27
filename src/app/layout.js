import '@/styles/design-tokens.css';
import '@/styles/guest.css';
import '@/styles/brand-logo.css';
import '@/App.css';
import '@/components/icons/icons.css';
import Providers from '@/components/providers/Providers';
import SearchParamsBoundary from '@/components/providers/SearchParamsBoundary';
import { BRAND } from '@/config/brand';

export const metadata = {
  title: {
    default: `${BRAND.name} — Book Hotels Worldwide`,
    template: `%s | ${BRAND.name}`
  },
  description: BRAND.shortDescription,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.shortDescription,
    images: [{ url: BRAND.logos.full, alt: BRAND.name }]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <SearchParamsBoundary>{children}</SearchParamsBoundary>
        </Providers>
      </body>
    </html>
  );
}
