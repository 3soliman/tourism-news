import { resolveMediaUrl } from './mapHotel';

function normalizeUrl(url) {
  const resolved = resolveMediaUrl(url);
  return resolved || String(url || '').trim();
}

function dedupeUrls(urls) {
  const seen = new Set();
  const list = [];
  urls.forEach((url) => {
    const trimmed = normalizeUrl(url);
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    list.push(trimmed);
  });
  return list;
}

/** Unique property image URLs for slideshow (cover first). */
export function getHotelDisplayImages(hotel) {
  if (!hotel) return [];

  const raw = [];
  if (hotel.image) raw.push(hotel.image);

  if (Array.isArray(hotel.images)) {
    hotel.images.forEach((item) => {
      if (typeof item === 'string') raw.push(item);
      else if (item?.imageUrl || item?.url || item?.image) {
        raw.push(item.imageUrl || item.url || item.image);
      }
    });
  }

  return dedupeUrls(raw);
}

/** Normalize hotel object, URL array, or single URL string. */
export function normalizeDisplayImages(source) {
  if (!source) return [];
  if (Array.isArray(source)) {
    const raw = source.map((item) => {
      if (typeof item === 'string') return item;
      return item?.imageUrl || item?.url || item?.image || '';
    });
    return dedupeUrls(raw);
  }
  if (typeof source === 'string') {
    return dedupeUrls([source]);
  }
  if (typeof source === 'object') {
    return getHotelDisplayImages(source);
  }
  return [];
}

/** Stable key for comparing gallery contents */
export function propertyImageSignature(hotel) {
  return normalizeDisplayImages(hotel).join('|');
}

/** Apply API refresh without flickering the cover when paths are unchanged */
export function mergePropertyHotelUpdate(prev, next) {
  if (!next) return prev;
  if (!prev) return next;

  const prevUrls = normalizeDisplayImages(prev);
  const nextUrls = normalizeDisplayImages(next);

  const merged = { ...next };

  if (prevUrls.join('|') === nextUrls.join('|')) {
    if (prev.image) merged.image = prev.image;
    if (prev.images?.length) merged.images = prev.images;
    return merged;
  }

  if (prevUrls[0] && prevUrls[0] === nextUrls[0]) {
    merged.image = prev.image;
  }

  return merged;
}
