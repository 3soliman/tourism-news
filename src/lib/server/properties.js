import { getServerBackendOrigin } from '@/config/api';
import { mapApiHotel } from '@/utils/mapHotel';

const API_ORIGIN = getServerBackendOrigin();
const SERVER_FETCH_TIMEOUT_MS = 30_000;

function serverFetch(url, init = {}) {
  const signal =
    typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS)
      : undefined;
  return fetch(url, { ...init, signal });
}

export async function fetchPropertyServer(id) {
  if (!id) return null;
  const res = await serverFetch(`${API_ORIGIN}/api/properties/${id}/`, {
    next: { revalidate: 3600 }
  });
  if (res.ok) {
    const data = await res.json();
    return mapApiHotel(data);
  }

  const list = await fetchPropertiesListServer();
  return list.find((hotel) => String(hotel.id) === String(id)) || null;
}

export async function fetchPropertiesListServer() {
  let path = `${API_ORIGIN}/api/properties/available/`;
  const all = [];

  while (path) {
    const res = await serverFetch(path, { next: { revalidate: 3600 } });
    if (!res.ok) break;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.results || [];
    all.push(...list.filter((p) => p.is_active !== false).map(mapApiHotel));

    const nextUrl = data.next;
    if (!nextUrl) break;
    try {
      const parsed = new URL(nextUrl);
      path = `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
    } catch {
      break;
    }
  }

  return all;
}
