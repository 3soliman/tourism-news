import GuestLayoutClient from './GuestLayoutClient';
import { fetchPropertiesListServer } from '@/lib/server/properties';

export default async function GuestLayout({ children }) {
  let initialHotels = [];
  try {
    initialHotels = await fetchPropertiesListServer();
  } catch (err) {
    console.warn('[guest-layout] Could not prefetch properties:', err?.message || err);
  }

  return <GuestLayoutClient initialHotels={initialHotels}>{children}</GuestLayoutClient>;
}
