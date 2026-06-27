'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

let prefetchHandler = null;

export function registerRoutePrefetch(handler) {
  prefetchHandler = handler;
}

/** Prefetch a route chunk on hover/focus (wired from AppLayout). */
export function preloadRoute(path) {
  if (!path || !prefetchHandler) return;
  prefetchHandler(path);
}

export function RoutePrefetchRegistrar() {
  const router = useRouter();

  useEffect(() => {
    registerRoutePrefetch((path) => {
      try {
        router.prefetch(path);
      } catch {
        // Prefetch is opportunistic.
      }
    });
    return () => registerRoutePrefetch(null);
  }, [router]);

  return null;
}
