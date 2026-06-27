import { parseCoord } from './geocoding';

export function resolvePropertyMapCoords(latitude, longitude) {
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
