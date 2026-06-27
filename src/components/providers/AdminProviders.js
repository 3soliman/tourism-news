'use client';

import { HotelsProvider } from '@/context/HotelsContext';

export default function AdminProviders({ children }) {
  return <HotelsProvider>{children}</HotelsProvider>;
}
