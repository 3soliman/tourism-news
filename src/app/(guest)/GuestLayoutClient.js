'use client';

import ErrorBoundary from '@/components/shared/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';
import { HotelsProvider } from '@/context/HotelsContext';
import '@/styles/booking-flow.css';
import '@/styles/guest-mobile.css';

export default function GuestLayoutClient({ children, initialHotels = [] }) {
  return (
    <ErrorBoundary>
      <HotelsProvider initialHotels={initialHotels}>
        <AppLayout>{children}</AppLayout>
      </HotelsProvider>
    </ErrorBoundary>
  );
}
