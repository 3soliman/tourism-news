import { API_BASE_URL } from '../config/api';

/**
 * Turn DRF `next` URLs into a path for apiGet (e.g. "/room-types/?page=2").
 * Handles absolute Railway URLs when the app calls the API via localhost proxy.
 */
export function resolveNextApiPath(nextUrl) {
  if (!nextUrl) return null;

  if (nextUrl.startsWith('http')) {
    try {
      const { pathname, search } = new URL(nextUrl);
      const apiIndex = pathname.indexOf('/api/');
      if (apiIndex >= 0) {
        return `${pathname.slice(apiIndex + 4)}${search}`;
      }

      const base = API_BASE_URL.replace(/\/$/, '');
      if (nextUrl.startsWith(base)) {
        return nextUrl.slice(base.length);
      }
      return null;
    } catch {
      return null;
    }
  }

  return nextUrl.startsWith('/') ? nextUrl : `/${nextUrl}`;
}
