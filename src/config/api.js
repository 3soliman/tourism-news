/** Base URL for backend API (no trailing slash) */
function resolveApiBaseUrl() {
  const configured = (process.env.NEXT_PUBLIC_API_URL || '').trim();

  if (configured && configured !== '/api') {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}/api`;
  }

  const proxy =
    process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_PROXY_TARGET;
  if (proxy && /^https?:\/\//i.test(String(proxy).trim())) {
    return `${String(proxy).replace(/\/$/, '')}/api`;
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (site && /^https?:\/\//i.test(site)) {
    return `${site.replace(/\/$/, '')}/api`;
  }

  return '/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Direct Laravel origin for large multipart uploads (bypasses Next /api proxy size limits). */
export function getDirectApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  const direct = (
    process.env.NEXT_PUBLIC_API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ''
  ).trim();
  if (direct && /^https?:\/\//i.test(direct)) {
    return `${direct.replace(/\/$/, '')}/api`;
  }
  return '';
}

/**
 * Upload base URL. In the browser, always use the same-origin API base so multipart
 * requests go through the Next /api proxy. Direct backend URLs (e.g. http://127.0.0.1:8000)
 * fail from the browser with network/CORS/Private Network Access errors while JSON
 * requests through /api still work.
 */
export function resolveUploadApiBaseUrl() {
  if (typeof window !== 'undefined') {
    return API_BASE_URL;
  }
  return getDirectApiBaseUrl() || API_BASE_URL;
}

/** Backend origin for absolute /media URLs on the server */
export function getServerBackendOrigin() {
  const proxy =
    process.env.NEXT_PUBLIC_API_PROXY_TARGET ||
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_SITE_URL;
  if (proxy && /^https?:\/\//i.test(String(proxy).trim())) {
    return String(proxy).replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return 'https://almohithotelsend-production.up.railway.app';
}
