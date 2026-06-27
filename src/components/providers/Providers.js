'use client';

import { BookingProvider } from '@/context/BookingContext';
import { AdminProvider } from '@/context/AdminContext';
import { PublicHotelProvider } from '@/context/PublicHotelContext';
import { I18nProvider } from '@/context/I18nContext';
import { NotificationProvider } from '@/components/shared/notifications/NotificationProvider';
import { RoutePrefetchRegistrar } from '@/lib/prefetch-route';

export default function Providers({ children }) {
  return (
    <I18nProvider>
      <RoutePrefetchRegistrar />
      <PublicHotelProvider>
        <BookingProvider>
          <AdminProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </AdminProvider>
        </BookingProvider>
      </PublicHotelProvider>
    </I18nProvider>
  );
}
