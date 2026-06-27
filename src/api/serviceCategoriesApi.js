import { apiGet, apiPost, apiPatch, apiDelete, apiPostForm, apiPatchForm } from './client';
import { resolveMediaUrl } from '../utils/mapHotel';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

function isStoredIconPath(raw) {
  if (!raw || typeof raw !== 'string') return false;
  if (/php[a-f0-9]+\.tmp$/i.test(raw)) return false;
  if (/storage[\\/]+app[\\/]+tmp/i.test(raw)) return false;
  return true;
}

export function mapServiceCategory(api) {
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
    description: api.description || '',
    icon: rawIcon,
    iconUrl: iconUrl || '',
    isActive: api.is_active !== false
  };
}

function buildCategoryFormData(payload, iconFile) {
  const fd = new FormData();
  fd.append('name', payload.name.trim());
  fd.append('description', (payload.description || '').trim());
  fd.append('is_active', payload.is_active !== false ? 'true' : 'false');
  if (iconFile) fd.append('icon', iconFile);
  return fd;
}

/** GET /api/service-categories/ */
export async function fetchServiceCategories({ activeOnly = false } = {}) {
  const data = await apiGet('/service-categories/');
  const list = parseList(data).map(mapServiceCategory);
  return activeOnly ? list.filter((c) => c.isActive) : list;
}

/** POST /api/service-categories/ */
export async function createServiceCategory(payload, iconFile = null) {
  if (iconFile) {
    const data = await apiPostForm(
      '/service-categories/',
      buildCategoryFormData(payload, iconFile)
    );
    return mapServiceCategory(data);
  }

  const data = await apiPost('/service-categories/', {
    name: payload.name.trim(),
    description: (payload.description || '').trim(),
    is_active: payload.is_active !== false
  });
  return mapServiceCategory(data);
}

/** GET /api/service-categories/:id/ */
export async function fetchServiceCategoryById(id) {
  const data = await apiGet(`/service-categories/${id}/`);
  return mapServiceCategory(data);
}

/** PATCH /api/service-categories/:id/ */
export async function updateServiceCategory(id, payload, iconFile = null) {
  const path = `/service-categories/${id}/`;

  if (iconFile) {
    const data = await apiPatchForm(path, buildCategoryFormData(payload, iconFile));
    return mapServiceCategory(data);
  }

  const data = await apiPatch(path, {
    name: payload.name.trim(),
    description: (payload.description || '').trim(),
    is_active: payload.is_active !== false
  });
  return mapServiceCategory(data);
}

/** DELETE /api/service-categories/:id/ */
export async function deleteServiceCategory(id) {
  return apiDelete(`/service-categories/${id}/`);
}
