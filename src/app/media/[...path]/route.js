import { BACKEND_ORIGIN, proxyToBackend } from '@/lib/backend-proxy';

async function proxyMedia(request, context) {
  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [path];
  const pathname = `/media/${segments.join('/')}`;
  const target = new URL(`${pathname}${request.nextUrl.search}`, BACKEND_ORIGIN);
  return proxyToBackend(request, target);
}

export const GET = proxyMedia;
export const HEAD = proxyMedia;
