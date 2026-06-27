import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { URL } from 'node:url';

export const BACKEND_ORIGIN = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_PROXY_TARGET ||
  'https://almohithotelsend-production.up.railway.app'
).replace(/\/$/, '');

const UPSTREAM_TIMEOUT_MS = 300_000;
const UPSTREAM_RETRIES = 3;

const SKIP_REQUEST_HEADERS = new Set(['host', 'connection', 'content-length', 'accept-encoding']);
const SKIP_RESPONSE_HEADERS = new Set(['transfer-encoding', 'connection']);

function isRetryableFetchError(err) {
  const code = err?.cause?.code || err?.code;
  return (
    err?.name === 'AbortError' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    code === 'UND_ERR_BODY_TIMEOUT'
  );
}

function headersToObject(headers) {
  const result = {};
  if (!headers) return result;
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function nodeResponseHeaders(rawHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
    } else if (value != null) {
      headers.set(key, value);
    }
  }
  return headers;
}

function nodeRequestStreaming(targetUrl, { method = 'GET', headers }) {
  return new Promise((resolve, reject) => {
    const url = new URL(String(targetUrl));
    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;

    const req = transport(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers: headersToObject(headers)
      },
      (res) => {
        if (method === 'HEAD') {
          res.resume();
        }
        resolve({
          status: res.statusCode || 502,
          statusText: res.statusMessage || '',
          headers: nodeResponseHeaders(res.headers),
          stream: res
        });
      }
    );

    req.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      req.destroy(Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchUpstreamStream(url, init, attempt = 0) {
  try {
    return await nodeRequestStreaming(url, init);
  } catch (err) {
    if (attempt < UPSTREAM_RETRIES && isRetryableFetchError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      return fetchUpstreamStream(url, init, attempt + 1);
    }
    throw err;
  }
}

function nodeRequestBuffered(targetUrl, { method = 'GET', headers, body }) {
  return new Promise((resolve, reject) => {
    const url = new URL(String(targetUrl));
    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;

    const req = transport(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method,
        headers: headersToObject(headers)
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const payload = Buffer.concat(chunks);
          resolve({
            status: res.statusCode || 502,
            statusText: res.statusMessage || '',
            headers: nodeResponseHeaders(res.headers),
            body: payload
          });
        });
      }
    );

    req.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      req.destroy(Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' }));
    });
    req.on('error', reject);

    if (body?.byteLength) {
      req.write(Buffer.from(body));
    }
    req.end();
  });
}

async function fetchUpstreamBuffered(url, init, attempt = 0) {
  try {
    return await nodeRequestBuffered(url, init);
  } catch (err) {
    if (attempt < UPSTREAM_RETRIES && isRetryableFetchError(err)) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      return fetchUpstreamBuffered(url, init, attempt + 1);
    }
    throw err;
  }
}

export function copyRequestHeaders(request) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

export function copyResponseHeaders(upstream) {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

export async function proxyToBackend(request, targetUrl) {
  const headers = copyRequestHeaders(request);
  const init = {
    method: request.method,
    headers
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
    headers.set('content-length', String(init.body.byteLength));
  }

  try {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const upstream = await fetchUpstreamStream(targetUrl, init);
      const status = upstream.status === 204 ? 200 : upstream.status;
      const body = request.method === 'HEAD' ? null : Readable.toWeb(upstream.stream);

      return new NextResponse(body, {
        status,
        statusText: upstream.status === 204 ? 'OK' : upstream.statusText,
        headers: copyResponseHeaders(upstream)
      });
    }

    const upstream = await fetchUpstreamBuffered(targetUrl, init);
    // NextResponse rejects status 204; Laravel DELETE returns 204 No Content.
    const status = upstream.status === 204 ? 200 : upstream.status;
    const body = upstream.status === 204 ? null : upstream.body;

    return new NextResponse(body, {
      status,
      statusText: upstream.status === 204 ? 'OK' : upstream.statusText,
      headers: copyResponseHeaders(upstream)
    });
  } catch (err) {
    const code = err?.cause?.code || err?.code;
    const detail =
      err?.name === 'AbortError'
        ? `Backend did not respond within ${UPSTREAM_TIMEOUT_MS / 1000}s`
        : code
          ? `Backend unreachable (${code})`
          : 'Backend unreachable';

    console.error('[api-proxy]', detail, String(targetUrl), err?.message || err);

    return NextResponse.json(
      {
        detail: `${detail}. Check Railway is running, then restart npm run dev and refresh.`,
        proxy_target: BACKEND_ORIGIN
      },
      { status: 502 }
    );
  }
}
