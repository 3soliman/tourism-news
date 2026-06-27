import { API_BASE_URL, resolveUploadApiBaseUrl } from '../config/api';
import { TOKEN_KEY, AUTH_SCHEME } from '../config/auth';
import { getPublicHostContext } from '../utils/publicHost';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
const DEFAULT_GET_TTL = 60 * 1000;
const LONG_GET_TTL = 5 * 60 * 1000;
const getCache = new Map();
const inflightGets = new Map();

const CACHE_RULES = [
  { prefix: '/properties/', ttl: DEFAULT_GET_TTL },
  { prefix: '/property-amenities/', ttl: LONG_GET_TTL },
  { prefix: '/service-categories/', ttl: LONG_GET_TTL },
  { prefix: '/property-services/', ttl: DEFAULT_GET_TTL },
  { prefix: '/room-types/', ttl: DEFAULT_GET_TTL },
  { prefix: '/blog/posts/', ttl: DEFAULT_GET_TTL },
  { prefix: '/admin/blog/', ttl: DEFAULT_GET_TTL },
  { prefix: '/bookings/', ttl: 30 * 1000 },
  { prefix: '/availability-blocks/', ttl: 30 * 1000 },
  { prefix: '/reviews/', ttl: 30 * 1000 },
  { prefix: '/audit-logs/', ttl: 30 * 1000 },
  { prefix: '/auth/me/', ttl: 30 * 1000 },
  { prefix: '/auth/owners/', ttl: 30 * 1000 }
];

function buildAuthHeader(token) {
  if (!token) return null;
  return `${AUTH_SCHEME} ${token}`;
}

/**
 * @param {string} path - e.g. "/properties/" (leading slash, trailing slash per Django REST)
 * @param {RequestInit} options
 */
function buildApiUrl(path, { forUpload = false } = {}) {
  const base = (forUpload ? resolveUploadApiBaseUrl() : API_BASE_URL || '').replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (!base) return suffix;
  return `${base}${suffix}`;
}

function cacheRuleFor(path) {
  return CACHE_RULES.find((rule) => path.startsWith(rule.prefix));
}

export function buildApiCacheKey(path, token = getToken(), host = getPublicHostContext()) {
  return `${token ? 'auth' : 'guest'}:${host.subdomain || host.type}:${path}`;
}

function cacheKey(path) {
  return buildApiCacheKey(path);
}

function addPublicHotelHeader(headers) {
  const host = getPublicHostContext();
  if (host.type === 'hotel' && host.subdomain) headers['X-Hotel-Subdomain'] = host.subdomain;
}

export function invalidateApiCache(prefix = '') {
  [...getCache.keys()].forEach((key) => {
    if (!prefix || key.includes(`:${prefix}`)) getCache.delete(key);
  });
  [...inflightGets.keys()].forEach((key) => {
    if (!prefix || key.includes(`:${prefix}`)) inflightGets.delete(key);
  });
}

function invalidateAfterMutation(path) {
  const prefixes = new Set(['/properties/']);
  const firstSegment = `/${String(path).split('/').filter(Boolean)[0]}/`;
  prefixes.add(firstSegment);
  if (firstSegment === '/property-images/') prefixes.add('/properties/');
  if (firstSegment === '/room-type-images/') prefixes.add('/room-types/');
  if (firstSegment === '/room-types/') prefixes.add('/properties/');
  if (path.startsWith('/auth/owners/')) {
    prefixes.add('/auth/owners/');
    prefixes.add('/properties/');
  }
  prefixes.forEach((prefix) => invalidateApiCache(prefix));
}

function formatFetchError(err, url) {
  if (err?.name === 'TypeError' && /fetch|network/i.test(String(err.message))) {
    return new Error('Cannot reach the API. Please try again.');
  }
  return err instanceof Error ? err : new Error(String(err));
}

export async function apiRequest(path, options = {}) {
  const url = buildApiUrl(path);
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...options.headers
  };
  addPublicHotelHeader(headers);

  const token = getToken();
  const authHeader = buildAuthHeader(token);
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (err) {
    throw formatFetchError(err, url);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.detail || data.message || data.error)) ||
      `Request failed (${response.status})`;
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const apiGet = (path, { force = false } = {}) => {
  const rule = cacheRuleFor(path);
  if (!rule) return apiRequest(path, { method: 'GET' });

  const key = cacheKey(path);
  const now = Date.now();
  const cached = getCache.get(key);
  if (!force && cached && cached.expiresAt > now) {
    return Promise.resolve(cached.data);
  }
  if (!force && inflightGets.has(key)) {
    return inflightGets.get(key);
  }

  const request = apiRequest(path, { method: 'GET' })
    .then((data) => {
      getCache.set(key, { data, expiresAt: Date.now() + rule.ttl });
      inflightGets.delete(key);
      return data;
    })
    .catch((err) => {
      inflightGets.delete(key);
      throw err;
    });
  inflightGets.set(key, request);
  return request;
};

export const apiPost = (path, body) =>
  apiRequest(path, { method: 'POST', body: JSON.stringify(body) }).finally(() => invalidateAfterMutation(path));

export const apiPatch = (path, body) =>
  apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }).finally(() => invalidateAfterMutation(path));

export const apiPut = (path, body) =>
  apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }).finally(() => invalidateAfterMutation(path));

export const apiDelete = (path) => apiRequest(path, { method: 'DELETE' }).finally(() => invalidateAfterMutation(path));

async function sendFormData(path, method, formData) {
  const url = buildApiUrl(path, { forUpload: true });
  const headers = { Accept: 'application/json' };
  addPublicHotelHeader(headers);

  const token = getToken();
  const authHeader = buildAuthHeader(token);
  if (authHeader) headers.Authorization = authHeader;

  let response;
  try {
    response = await fetch(url, { method, headers, body: formData });
  } catch (err) {
    throw formatFetchError(err, url);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.detail || data.message || data.error)) ||
      (response.status === 413
        ? 'File is too large for the server. Reduce the file size or increase PHP upload limits.'
        : `Request failed (${response.status})`);
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/** POST multipart/form-data (e.g. property image upload) */
export const apiPostForm = (path, formData) =>
  sendFormData(path, 'POST', formData).finally(() => invalidateAfterMutation(path));

/** PATCH multipart/form-data (e.g. property image update) */
export const apiPatchForm = (path, formData) =>
  sendFormData(path, 'PATCH', formData).finally(() => invalidateAfterMutation(path));
