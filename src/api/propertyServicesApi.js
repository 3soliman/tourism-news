import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { optionalLocalizedApiValue } from '../utils/localeContent';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

/** "15:10:17.091Z" or "15:10:17" → "15:10" for <input type="time"> */
export function formatTimeForInput(value) {
  if (!value) return '';
  const str = String(value);
  const match = str.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

/** "15:10" → "15:10:00" for API TimeField */
function toApiTime(value) {
  if (!value) return null;
  const parts = String(value).split(':');
  if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
  return value;
}

/** Extract id from a relation field (number, string, or nested { id, name }) */
function resolveRelationId(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    const id = value.id ?? value.pk;
    return id != null ? String(id) : '';
  }
  return String(value);
}

/** Extract display name from a nested relation object */
function resolveRelationName(value) {
  if (value == null || typeof value !== 'object') return '';
  return value.name || value.title || value.label || '';
}

export function mapPropertyService(api) {
  const categoryRaw = api.category_id ?? api.category ?? api.service_category_id;
  const propertyRaw = api.property;

  const categoryId = resolveRelationId(categoryRaw);
  const categoryName =
    api.category_name ||
    resolveRelationName(api.category) ||
    (typeof categoryRaw === 'object' ? resolveRelationName(categoryRaw) : '');

  const propertyId = resolveRelationId(propertyRaw);
  const propertyName =
    api.property_name ||
    api.property_title ||
    resolveRelationName(api.property) ||
    (typeof propertyRaw === 'object' ? resolveRelationName(propertyRaw) : '');

  return {
    id: String(api.id),
    property: propertyId,
    propertyName,
    categoryId,
    categoryName,
    name: api.name || '',
    nameAr: api.name_ar || api.nameAr || '',
    shortDescription: api.short_description || '',
    shortDescriptionAr: api.short_description_ar || api.shortDescriptionAr || '',
    description: api.description || '',
    descriptionAr: api.description_ar || api.descriptionAr || '',
    price: api.price ?? '',
    currency: api.currency || 'USD',
    pricingType: api.pricing_type || 'free',
    durationMinutes: api.duration_minutes ?? '',
    availableFrom: formatTimeForInput(api.available_from),
    availableUntil: formatTimeForInput(api.available_until),
    advanceBookingRequired: api.advance_booking_required === true,
    isFeatured: api.is_featured === true,
    isActive: api.is_active !== false
  };
}

export function buildPropertyServicePayload(form) {
  const isFree = form.pricing_type === 'free';

  const payload = {
    property: Number(form.property),
    category: Number(form.category_id),
    name: form.name.trim(),
    short_description: (form.short_description || '').trim(),
    description: (form.description || '').trim(),
    price: isFree ? '0' : String(form.price || '0'),
    currency: (form.currency || 'USD').trim(),
    pricing_type: form.pricing_type || 'free',
    duration_minutes: form.duration_minutes !== '' ? Number(form.duration_minutes) : null,
    available_from: toApiTime(form.available_from),
    available_until: toApiTime(form.available_until),
    advance_booking_required: form.advance_booking_required === true,
    is_featured: form.is_featured === true,
    is_active: form.is_active !== false
  };

  payload.name_ar = optionalLocalizedApiValue(form.name_ar);
  payload.short_description_ar = optionalLocalizedApiValue(form.short_description_ar);
  payload.description_ar = optionalLocalizedApiValue(form.description_ar);

  return payload;
}

export function mapPropertyServiceToForm(item) {
  return {
    property: item.property || '',
    category_id: item.categoryId || '',
    name: item.name || '',
    name_ar: item.nameAr || '',
    short_description: item.shortDescription || '',
    short_description_ar: item.shortDescriptionAr || '',
    description: item.description || '',
    description_ar: item.descriptionAr || '',
    price: item.price ?? '',
    currency: item.currency || 'USD',
    pricing_type: item.pricingType || 'free',
    duration_minutes: item.durationMinutes !== '' ? String(item.durationMinutes) : '',
    available_from: item.availableFrom || '',
    available_until: item.availableUntil || '',
    advance_booking_required: item.advanceBookingRequired,
    is_featured: item.isFeatured,
    is_active: item.isActive
  };
}

export function formatServicePrice(service) {
  if (!service) return '';
  if (service.pricingType === 'free') return 'Free';
  const price = service.price ?? '';
  if (price === '' || price === null) return 'Paid';
  return `${price} ${service.currency || ''}`.trim();
}

/** Stable key for matching catalog entries and property assignments */
export function getServiceCatalogKey(service) {
  const categoryId = service.categoryId ?? service.category_id ?? '';
  const name = (service.name || '').trim().toLowerCase();
  return `${categoryId}::${name}`;
}

/** Unique services from the system to pick from in the property wizard */
export async function fetchServiceCatalog() {
  const all = await fetchPropertyServices();
  const map = new Map();
  all.forEach((service) => {
    const key = getServiceCatalogKey(service);
    if (!map.has(key)) map.set(key, service);
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Clone a catalog service into a create/update form for another property */
export function cloneCatalogServiceToForm(catalogService, propertyId = '') {
  return {
    ...mapPropertyServiceToForm(catalogService),
    property: propertyId ? String(propertyId) : ''
  };
}

/** GET /api/property-services/ — guest listing (active only) */
export async function fetchGuestPropertyServices(propertyId) {
  if (!propertyId) return [];
  const list = await fetchPropertyServices({ propertyId });
  return list.filter((s) => s.isActive);
}

/** GET /api/property-services/ */
export async function fetchPropertyServices({ propertyId } = {}) {
  const path = propertyId
    ? `/property-services/?property=${propertyId}`
    : '/property-services/';
  const data = await apiGet(path);
  return parseList(data).map(mapPropertyService);
}

/** POST /api/property-services/ */
export async function createPropertyService(form) {
  const data = await apiPost('/property-services/', buildPropertyServicePayload(form));
  return mapPropertyService(data);
}

/** GET /api/property-services/:id/ */
export async function fetchPropertyServiceById(id) {
  const data = await apiGet(`/property-services/${id}/`);
  return mapPropertyService(data);
}

/** PATCH /api/property-services/:id/ */
export async function updatePropertyService(id, form) {
  const data = await apiPatch(`/property-services/${id}/`, buildPropertyServicePayload(form));
  return mapPropertyService(data);
}

/** DELETE /api/property-services/:id/ */
export async function deletePropertyService(id) {
  return apiDelete(`/property-services/${id}/`);
}
