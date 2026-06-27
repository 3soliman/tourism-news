import { BACKEND_ORIGIN, proxyToBackend } from '@/lib/backend-proxy';

function buildBackendUrl(pathSegments, search) {
  const joined = pathSegments.filter(Boolean).join('/');
  const pathname = `/api/${joined}${joined.endsWith('/') ? '' : '/'}`;
  return new URL(`${pathname}${search}`, BACKEND_ORIGIN);
}

async function proxyRequest(request, context) {
  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [path];
  const target = buildBackendUrl(segments, request.nextUrl.search);
  return proxyToBackend(request, target);
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
