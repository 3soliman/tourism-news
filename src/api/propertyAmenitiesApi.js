import { apiGet, apiPost, apiPatch, apiDelete, apiPostForm, apiPatchForm } from './client';
import { resolveMediaUrl } from '../utils/mapHotel';
import { optionalLocalizedApiValue } from '../utils/localeContent';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

function isStoredIconPath(raw) {
  if (!raw || typeof raw !== 'string') return false;
  if (/php[a-f0-9]+\.tmp$/i.test(raw)) return false;
  if (/storage[\\/]+app[\\/]+tmp/i.test(raw)) return false;
  return true;
}

export function mapPropertyAmenity(api) {
  const rawIcon = api.icon || api.icon_url || '';
  let iconUrl = '';
  if (isStoredIconPath(rawIcon)) {
    iconUrl =
      typeof rawIcon === 'string' && /^https?:\/\//i.test(rawIcon)
        ? rawIcon
        : resolveMediaUrl(rawIcon);
  }

  return {
    id: String(api.id),
    name: api.name || '',
    nameAr: api.name_ar || api.nameAr || '',
    icon: rawIcon,
    iconUrl: iconUrl || '',
    isActive: api.is_active !== false,
    updatedAt: api.updated_at || api.modified || api.created_at || ''
  };
}

function buildAmenityFormData(payload, iconFile) {
  const fd = new FormData();
  fd.append('name', payload.name.trim());
  fd.append('name_ar', optionalLocalizedApiValue(payload.name_ar) ?? '');
  fd.append('is_active', payload.is_active !== false ? 'true' : 'false');
  if (iconFile) fd.append('icon', iconFile);
  return fd;
}

function buildAmenityJsonPayload(payload) {
  return {
    name: payload.name.trim(),
    name_ar: optionalLocalizedApiValue(payload.name_ar),
    is_active: payload.is_active !== false
  };
}

/** GET /api/property-amenities/ */
export async function fetchPropertyAmenities({ activeOnly = false } = {}) {
  const data = await apiGet('/property-amenities/');
  const list = parseList(data).map(mapPropertyAmenity);
  return activeOnly ? list.filter((a) => a.isActive) : list;
}

/** POST /api/property-amenities/ */
export async function createPropertyAmenity(payload, iconFile = null) {
  if (iconFile) {
    const data = await apiPostForm(
      '/property-amenities/',
      buildAmenityFormData(payload, iconFile)
    );
    return mapPropertyAmenity(data);
  }

  const data = await apiPost('/property-amenities/', buildAmenityJsonPayload(payload));
  return mapPropertyAmenity(data);
}

/** PATCH /api/property-amenities/:id/ */
export async function updatePropertyAmenity(id, payload, iconFile = null) {
  const path = `/property-amenities/${id}/`;

  if (iconFile) {
    const data = await apiPatchForm(path, buildAmenityFormData(payload, iconFile));
    return mapPropertyAmenity(data);
  }

  const data = await apiPatch(path, buildAmenityJsonPayload(payload));
  return mapPropertyAmenity(data);
}

/** DELETE /api/property-amenities/:id/ */
export async function deletePropertyAmenity(id) {
  return apiDelete(`/property-amenities/${id}/`);
}
