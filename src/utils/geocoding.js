/**
 * Geocoding helpers — multiple providers for reliability in the browser.
 */

export const MIN_SEARCH_CHARS = 3;

function formatPlaceLabel({ address, city, country, latitude, longitude }) {
  const label = [address, city, country].filter(Boolean).join(', ');
  return label || `${latitude}, ${longitude}`;
}

function formatPlaceSubtitle({ city, country, type }) {
  const parts = [type, city, country].filter(Boolean);
  return parts.length > 1 ? parts.join(' · ') : parts[0] || '';
}

function parsePhotonFeature(feature) {
  if (!feature?.geometry?.coordinates) return null;

  const p = feature.properties || {};
  const [lon, lat] = feature.geometry.coordinates;

  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ').trim();
  const named = p.name && p.name !== p.city ? p.name : '';
  const addressParts = [streetLine || named, p.postcode].filter(Boolean);
  const address = addressParts.join(', ') || streetLine || named || '';

  const city =
    p.city || p.town || p.village || p.municipality || p.county || p.district || p.state || '';

  const type = p.type || p.osm_value || p.osm_key || '';

  return {
    latitude: Number(lat).toFixed(6),
    longitude: Number(lon).toFixed(6),
    address: address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    city,
    country: p.country || '',
    type
  };
}

function parseNominatimResult(item) {
  if (!item?.lat || !item?.lon) return null;

  const addr = item.address || {};
  const streetLine = [addr.house_number, addr.road || addr.pedestrian || addr.footway]
    .filter(Boolean)
    .join(' ')
    .trim();

  const named = item.name && item.name !== addr.city ? item.name : '';
  const addressParts = [streetLine || named, addr.postcode].filter(Boolean);
  const address = addressParts.join(', ') || streetLine || named || item.display_name?.split(',')[0] || '';

  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    '';

  const lat = Number(item.lat);
  const lon = Number(item.lon);

  return {
    latitude: lat.toFixed(6),
    longitude: lon.toFixed(6),
    address: address || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    city,
    country: addr.country || '',
    type: item.type || item.class || ''
  };
}

function parseBigDataCloud(data, lat, lon) {
  if (!data) return null;

  const city =
    data.city ||
    data.locality ||
    data.localityInfo?.administrative?.find((a) => a.order >= 5)?.name ||
    data.principalSubdivision ||
    '';

  const country = data.countryName || '';
  const addressParts = [data.locality, data.postcode].filter(Boolean);

  return {
    latitude: Number(lat).toFixed(6),
    longitude: Number(lon).toFixed(6),
    address: addressParts.join(', ') || city || `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`,
    city,
    country
  };
}

function enrichSearchResult(parsed) {
  return {
    ...parsed,
    label: formatPlaceLabel(parsed),
    subtitle: formatPlaceSubtitle(parsed)
  };
}

function dedupeResults(results) {
  const seen = new Set();
  return results.filter((item) => {
    const key = `${item.latitude},${item.longitude}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchViaPhoton(query, limit = 8) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=${limit}&lang=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Photon search failed');

  const data = await res.json();
  return (data.features || [])
    .map((f) => {
      const parsed = parsePhotonFeature(f);
      return parsed ? enrichSearchResult(parsed) : null;
    })
    .filter(Boolean);
}

async function searchViaNominatim(query, limit = 8) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' }
  });
  if (!res.ok) throw new Error('Nominatim search failed');

  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .map((item) => {
      const parsed = parseNominatimResult(item);
      return parsed ? enrichSearchResult(parsed) : null;
    })
    .filter(Boolean);
}

async function reverseViaBigDataCloud(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('BigDataCloud failed');
  const data = await res.json();
  const parsed = parseBigDataCloud(data, lat, lon);
  if (!parsed?.country && !parsed?.city) throw new Error('BigDataCloud empty');
  return parsed;
}

async function reverseViaPhoton(lat, lon) {
  const url = `https://photon.komoot.io/reverse?lon=${encodeURIComponent(lon)}&lat=${encodeURIComponent(lat)}&lang=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Photon failed');
  const data = await res.json();
  const parsed = parsePhotonFeature(data.features?.[0]);
  if (!parsed) throw new Error('Photon empty');
  return parsed;
}

async function reverseViaNominatim(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=en&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' }
  });
  if (!res.ok) throw new Error('Nominatim reverse failed');
  const data = await res.json();
  const parsed = parseNominatimResult(data);
  if (!parsed?.country && !parsed?.city && !parsed?.address) throw new Error('Nominatim reverse empty');
  return parsed;
}

/** Reverse geocode coordinates → address fields (tries multiple providers) */
export async function reverseGeocode(lat, lon) {
  const errors = [];

  try {
    return await reverseViaBigDataCloud(lat, lon);
  } catch (e) {
    errors.push(e.message);
  }

  try {
    return await reverseViaPhoton(lat, lon);
  } catch (e) {
    errors.push(e.message);
  }

  try {
    return await reverseViaNominatim(lat, lon);
  } catch (e) {
    errors.push(e.message);
  }

  const fallback = {
    latitude: Number(lat).toFixed(6),
    longitude: Number(lon).toFixed(6),
    address: `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`,
    city: '',
    country: ''
  };

  fallback._geocodeWarning =
    errors.length > 0
      ? 'Coordinates saved. Could not fetch full address — please fill city and country manually.'
      : undefined;

  return fallback;
}

/** Search address / place name → list of suggestions (Photon + Nominatim fallback) */
export async function searchPlaces(query, limit = 8) {
  const q = query.trim();
  if (q.length < MIN_SEARCH_CHARS) return [];

  const errors = [];

  try {
    const photonResults = await searchViaPhoton(q, limit);
    if (photonResults.length > 0) return dedupeResults(photonResults).slice(0, limit);
  } catch (e) {
    errors.push(e.message);
  }

  try {
    const nominatimResults = await searchViaNominatim(q, limit);
    if (nominatimResults.length > 0) return dedupeResults(nominatimResults).slice(0, limit);
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) throw new Error('Place search unavailable');
  return [];
}

export function formatAddressLabel(parts) {
  return parts.filter(Boolean).join(', ');
}

export function formatCoordsLabel(latitude, longitude, precision = 6) {
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  if (lat == null || lng == null) return '';
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

export function googleMapsSearchUrl(lat, lng, label = '') {
  const coords = `${lat},${lng}`;
  const query = label ? `${label} (${coords})` : coords;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleDirectionsUrl(lat, lng, label = '') {
  const destination = label || `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function openStreetMapUrl(lat, lng, zoom = 15) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

export const DEFAULT_MAP_CENTER = { lat: 24.7136, lng: 46.6753, zoom: 6 };

export const MAP_TILES = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd'
};

export function parseCoord(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isLocalhostHostname(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function geolocationError(message, reason) {
  const err = new Error(message);
  err.reason = reason;
  return err;
}

/** Whether the current page can request browser geolocation. */
export function getGeolocationEnvironment() {
  if (typeof window === 'undefined') {
    return { available: false, reason: 'unsupported' };
  }
  if (!navigator.geolocation) {
    return { available: false, reason: 'unsupported' };
  }

  const { protocol, hostname, port } = window.location;
  const isHttps = protocol === 'https:';
  const isLocalhost = isLocalhostHostname(hostname);

  if (!isHttps && !isLocalhost) {
    const localOrigin = `${protocol}//localhost${port ? `:${port}` : ''}`;
    return { available: false, reason: 'insecure', hostname, localOrigin };
  }

  return { available: true, reason: null };
}

/** Browser geolocation → { lat, lng } */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    const env = getGeolocationEnvironment();
    if (!env.available) {
      if (env.reason === 'insecure') {
        reject(
          geolocationError(
            "We can't detect your current location from this page. Click on the map or search for an address instead.",
            'insecure'
          )
        );
        return;
      }
      reject(geolocationError("Your browser doesn't support location detection.", 'unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }),
      (err) => {
        const messages = {
          1: 'Location access is turned off.',
          2: 'Could not detect your location.',
          3: 'Location request timed out.'
        };
        const reason = err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable';
        reject(geolocationError(messages[err.code] || 'Could not get your location', reason));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}
