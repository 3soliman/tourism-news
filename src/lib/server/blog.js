import { getServerBackendOrigin } from '@/config/api';
import { mapBlogPost } from '@/api/blogApi';

const API_ORIGIN = getServerBackendOrigin();
const SERVER_FETCH_TIMEOUT_MS = 30_000;

function serverFetch(url, init = {}) {
  const signal =
    typeof AbortSignal !== 'undefined' && AbortSignal.timeout
      ? AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS)
      : undefined;
  return fetch(url, { ...init, signal });
}

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

export async function fetchPublicBlogPostsPageServer({ page = 1, pageSize = 12, locale } = {}) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const res = await serverFetch(`${API_ORIGIN}/api/blog/posts/?${query}`, {
    next: { revalidate: 300 }
  });
  if (!res.ok) {
    return { count: 0, next: null, previous: null, results: [] };
  }
  const data = await res.json();
  let results = parseList(data).map(mapBlogPost).filter(Boolean);
  if (locale) results = results.filter((post) => post.locale === locale);
  return {
    count: locale ? results.length : data.count ?? results.length,
    next: data.next || null,
    previous: data.previous || null,
    results
  };
}

export async function fetchPublicBlogPostBySlugServer(slug) {
  if (!slug) return null;
  const res = await serverFetch(`${API_ORIGIN}/api/blog/posts/${encodeURIComponent(slug)}/`, {
    next: { revalidate: 300 }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return mapBlogPost(data);
}
