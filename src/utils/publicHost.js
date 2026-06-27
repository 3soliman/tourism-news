const RESERVED = new Set(['admin', 'api', 'www', 'mail', 'media', 'static', 'support']);

export function getPublicHostContext(hostname) {
  const resolvedHost =
    hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  const host = String(resolvedHost || '').toLowerCase().replace(/\.$/, '');
  const baseDomain = (process.env.NEXT_PUBLIC_PUBLIC_BASE_DOMAIN || 'almohit.com').toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === baseDomain) {
    return { type: host === baseDomain ? 'apex' : 'local', subdomain: null };
  }
  if (!host.endsWith(`.${baseDomain}`)) return { type: 'external', subdomain: null };
  const label = host.slice(0, -(baseDomain.length + 1));
  if (!label || label.includes('.') || RESERVED.has(label)) {
    return { type: label === 'admin' ? 'admin' : 'system', subdomain: null };
  }
  return { type: 'hotel', subdomain: label };
}

export function hotelPublicUrl(subdomain) {
  if (!subdomain) return null;
  const baseDomain = process.env.NEXT_PUBLIC_PUBLIC_BASE_DOMAIN || 'almohit.com';
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  return `${protocol}://${String(subdomain).toLowerCase()}.${baseDomain}`;
}
