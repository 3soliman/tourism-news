import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { mapApiHotel } from '../utils/mapHotel';
import { buildPropertyCreatePayload } from '../utils/hotelPayload';
import { fetchPropertyAmenities } from './propertyAmenitiesApi';
import { resolveNextApiPath } from './pagination';

function parsePropertyList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

/** GET /api/properties/available/ — guest listing (published, active) */
export async function fetchProperties() {
  let path = '/properties/available/';
  const all = [];

  while (path) {
    const data = await apiGet(path);
    all.push(...parsePropertyList(data).map(mapApiHotel));
    path = resolveNextApiPath(data.next);
  }

  return all.filter((p) => p.is_active !== false);
}

export async function fetchPublicHotelContext() {
  const data = await apiGet('/public/hotel-context/', { force: true });
  const rawHotel = data.hotel || data.property;
  return {
    ...data,
    hotel: rawHotel ? mapApiHotel(rawHotel) : null
  };
}

/** GET /api/properties/ — admin listing (includes inactive) */
export async function fetchAdminProperties() {
  const data = await apiGet('/properties/');
  return parsePropertyList(data).map(mapApiHotel);
}

/** GET /api/properties/:id/availability/ */
export async function fetchPropertyAvailability({
  propertyId,
  checkIn,
  checkOut,
  adults,
  children,
  force = false
}) {
  const params = new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut
  });
  if (adults != null) params.set('adults', String(adults));
  if (children != null) params.set('children', String(children));
  return apiGet(`/properties/${propertyId}/availability/?${params}`, { force });
}

/** GET /api/properties/:id/ — full detail (policies, social, contacts for published properties) */
export async function fetchPropertyById(id, { force = false } = {}) {
  try {
    const data = await apiGet(`/properties/${id}/`, { force });
    return mapApiHotel(data);
  } catch (err) {
    if (err?.status === 401 || err?.status === 403) {
      const list = await fetchProperties();
      const match = list.find((hotel) => String(hotel.id) === String(id));
      if (match) return match;
    }
    throw err;
  }
}

/** GET /api/properties/:id/setup-status/ */
export async function fetchPropertySetupStatus(id) {
  return apiGet(`/properties/${id}/setup-status/`);
}

/** POST /api/properties/:id/publish/ */
export async function publishProperty(id) {
  const data = await apiPost(`/properties/${id}/publish/`, {});
  return mapApiHotel(data);
}

/** POST /api/properties/ */
export async function createProperty(formValues) {
  const body = buildPropertyCreatePayload(formValues);
  const data = await apiPost('/properties/', body);
  return mapApiHotel(data);
}

/** PATCH /api/properties/:id/ */
export async function updateProperty(id, formValues, extra = {}) {
  const body = { ...buildPropertyCreatePayload(formValues), ...extra };
  const data = await apiPatch(`/properties/${id}/`, body);
  return mapApiHotel(data);
}

/** PATCH partial fields on /api/properties/:id/ */
export async function patchPropertyFields(id, fields) {
  const data = await apiPatch(`/properties/${id}/`, fields);
  return mapApiHotel(data);
}

/** PATCH cover image on property — required for guest site cover_image_url */
export async function updatePropertyCoverImage(id, coverImageId) {
  if (!coverImageId) return null;
  const data = await apiPatch(`/properties/${id}/`, {
    cover_image_id: Number(coverImageId)
  });
  return mapApiHotel(data);
}

/** POST /api/properties/:id/archive/ */
export async function archiveProperty(id) {
  const data = await apiPost(`/properties/${id}/archive/`, {});
  return mapApiHotel(data);
}

/** POST /api/properties/:id/unarchive/ */
export async function unarchiveProperty(id) {
  const data = await apiPost(`/properties/${id}/unarchive/`, {});
  return mapApiHotel(data);
}

/** DELETE /api/properties/:id/ — permanent removal */
export async function deleteProperty(id) {
  await apiDelete(`/properties/${id}/`);
  return { id: Number(id) };
}

/** GET /api/property-amenities/ — for amenity_ids on property form */
export async function fetchAmenities() {
  try {
    return await fetchPropertyAmenities({ activeOnly: true });
  } catch {
    return [];
  }
}

export const fetchHotels = fetchProperties;
export const fetchHotelById = fetchPropertyById;
export const createHotel = createProperty;
export const updateHotel = updateProperty;
export const deleteHotel = deleteProperty;
