import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { resolveNextApiPath } from './pagination';
import { resolveMediaUrl } from '../utils/mapHotel';
import { optionalLocalizedApiValue } from '../utils/localeContent';
import { bedTypeLabel, unitTypeLabel, normalizeBedType } from '../constants/roomTypeForm';
import { fetchRoomTypeImages } from './roomTypeImagesApi';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

async function fetchAllRoomTypePages(initialPath) {
  let path = initialPath;
  const all = [];

  while (path) {
    const data = await apiGet(path);
    all.push(...parseList(data).map(mapRoomType));
    path = resolveNextApiPath(data.next);
  }

  return all;
}

function resolveRelationId(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    const id = value.id ?? value.pk;
    return id != null ? String(id) : '';
  }
  return String(value);
}

function resolveRelationName(value) {
  if (value == null || typeof value !== 'object') return '';
  return value.name || value.title || '';
}

function mapRoomTypeImage(api) {
  const raw = api.image_url || api.image || '';
  const url =
    typeof raw === 'string' && /^https?:\/\//i.test(raw) ? raw : resolveMediaUrl(raw);
  return {
    id: String(api.id),
    url,
    imageUrl: url,
    caption: api.caption || '',
    altText: api.alt_text || '',
    displayOrder: api.display_order ?? 0,
    isCover: api.is_cover === true,
    isActive: api.is_active !== false
  };
}

function mapRoomTypePrice(api) {
  return {
    id: api.id != null ? String(api.id) : null,
    seasonName: api.season_name || '',
    startDate: api.start_date || '',
    endDate: api.end_date || '',
    pricePerNight: api.price_per_night ?? ''
  };
}

export function mapRoomType(api) {
  const propertyRaw = api.property;
  const propertyId = resolveRelationId(propertyRaw);

  return {
    id: String(api.id),
    property: propertyId,
    propertyName:
      api.property_name ||
      resolveRelationName(api.property) ||
      (typeof propertyRaw === 'object' ? resolveRelationName(propertyRaw) : ''),
    name: api.name || '',
    nameAr: api.name_ar || api.nameAr || '',
    unitType: api.unit_type || 'room',
    unitTypeLabel: unitTypeLabel(api.unit_type),
    description: api.description || '',
    descriptionAr: api.description_ar || api.descriptionAr || '',
    coverImageUrl: resolveMediaUrl(api.cover_image_url || ''),
    maxAdults: api.max_adults ?? 2,
    maxChildren: api.max_children ?? 0,
    totalUnits: api.total_units ?? 1,
    basePrice: api.base_price ?? '',
    weekendPrice: api.weekend_price ?? '',
    pricingMode: api.pricing_mode || 'per_night',
    currency: api.currency || 'USD',
    bedType: api.bed_type || '',
    bedTypeLabel: bedTypeLabel(api.bed_type),
    roomSize: api.room_size ?? '',
    smokingAllowed: api.smoking_allowed === true,
    extraBedAllowed: api.extra_bed_allowed === true,
    extraBedPrice: api.extra_bed_price ?? '',
    breakfastIncluded: api.breakfast_included === true,
    amenityIds: (api.amenities || []).map(Number),
    amenityDetails: api.amenity_details || [],
    isActive: api.is_active !== false,
    images: (api.images || []).map(mapRoomTypeImage).filter((img) => img.isActive),
    prices: (api.prices || []).map(mapRoomTypePrice)
  };
}

export function buildRoomTypePayload(form) {
  const payload = {
    property: Number(form.property),
    name: form.name.trim(),
    unit_type: form.unit_type || 'room',
    description: (form.description || '').trim(),
    max_adults: Number(form.max_adults) || 1,
    max_children: Number(form.max_children) || 0,
    total_units: Number(form.total_units) || 1,
    base_price: form.base_price === '' || form.base_price == null ? null : String(form.base_price),
    weekend_price: form.weekend_price === '' || form.weekend_price == null ? null : String(form.weekend_price),
    pricing_mode: form.pricing_mode || 'per_night',
    currency: (form.currency || 'USD').trim(),
    bed_type: normalizeBedType(form.bed_type),
    room_size: form.room_size === '' || form.room_size == null ? null : String(form.room_size),
    smoking_allowed: form.smoking_allowed === true,
    extra_bed_allowed: form.extra_bed_allowed === true,
    extra_bed_price: form.extra_bed_allowed ? String(form.extra_bed_price || '0') : '0',
    breakfast_included: form.breakfast_included === true,
    amenities: (form.amenity_ids || []).map(Number),
    is_active: form.is_active !== false
  };

  payload.name_ar = optionalLocalizedApiValue(form.name_ar);
  payload.description_ar = optionalLocalizedApiValue(form.description_ar);

  const prices = (form.prices || [])
    .filter((p) => p.season_name?.trim() && p.start_date && p.end_date && p.price_per_night !== '')
    .map((p) => {
      const row = {
        season_name: p.season_name.trim(),
        start_date: p.start_date,
        end_date: p.end_date,
        price_per_night: String(p.price_per_night)
      };
      if (p.id) row.id = Number(p.id);
      return row;
    });

  if (prices.length > 0) payload.prices = prices;

  return payload;
}

export function mapRoomTypeToForm(item) {
  return {
    property: item.property || '',
    name: item.name || '',
    name_ar: item.nameAr || '',
    unit_type: item.unitType || 'room',
    description: item.description || '',
    description_ar: item.descriptionAr || '',
    max_adults: String(item.maxAdults ?? 2),
    max_children: String(item.maxChildren ?? 0),
    total_units: String(item.totalUnits ?? 1),
    base_price: item.basePrice ?? '',
    weekend_price: item.weekendPrice ?? '',
    pricing_mode: item.pricingMode || 'per_night',
    currency: item.currency || 'USD',
    bed_type: item.bedType || '',
    room_size: item.roomSize ?? '',
    smoking_allowed: item.smokingAllowed,
    extra_bed_allowed: item.extraBedAllowed,
    extra_bed_price: item.extraBedPrice ?? '',
    breakfast_included: item.breakfastIncluded,
    amenity_ids: item.amenityIds || [],
    is_active: item.isActive,
    prices: (item.prices || []).map((p) => ({
      id: p.id,
      season_name: p.seasonName,
      start_date: p.startDate,
      end_date: p.endDate,
      price_per_night: p.pricePerNight ?? ''
    }))
  };
}

export function buildWizardRoomPayload(room, propertyId) {
  return {
    property: Number(propertyId),
    name: room.name || '',
    name_ar: room.nameAr || room.name_ar || '',
    unit_type: 'room',
    description: room.description || '',
    description_ar: room.descriptionAr || room.description_ar || '',
    max_adults: String(room.maxAdults ?? 2),
    max_children: String(room.maxChildren ?? 0),
    total_units: String(room.totalUnits ?? 1),
    base_price: room.basePrice ?? '',
    weekend_price: room.weekendPrice ?? '',
    pricing_mode: room.pricingMode || 'per_night',
    currency: 'USD',
    bed_type: normalizeBedType(room.bedType),
    room_size: room.roomSize ?? '',
    smoking_allowed: room.smokingAllowed ?? false,
    extra_bed_allowed: room.extraBedAllowed ?? false,
    extra_bed_price: room.extraBedPrice ?? '',
    breakfast_included: room.breakfastIncluded ?? false,
    amenity_ids: room.amenityIds || [],
    is_active: true
  };
}

export function mapRoomTypeToWizardRoom(room) {
  const photos = (room.images || []).map((img) => ({
    localId: `existing-photo-${img.id}`,
    imageId: String(img.id),
    preview: img.url || img.imageUrl,
    url: img.url || img.imageUrl,
    isCover: Boolean(img.isCover),
    file: null
  }));

  return {
    localId: `existing-${room.id}`,
    roomId: String(room.id),
    isExisting: true,
    name: room.name || '',
    description: room.description || '',
    maxAdults: room.maxAdults ?? 2,
    maxChildren: room.maxChildren ?? 0,
    totalUnits: room.totalUnits ?? 1,
    basePrice: room.basePrice ?? '',
    weekendPrice: room.weekendPrice ?? '',
    pricingMode: room.pricingMode || 'per_night',
    bedType: room.bedType || '1_king',
    roomSize: room.roomSize ?? '',
    smokingAllowed: room.smokingAllowed ?? false,
    extraBedAllowed: room.extraBedAllowed ?? false,
    extraBedPrice: room.extraBedPrice ?? '',
    breakfastIncluded: room.breakfastIncluded ?? false,
    amenityIds: room.amenityIds || [],
    photos
  };
}

/** Load saved room types into the property wizard (with images when available). */
export async function loadWizardRoomsForProperty(rooms) {
  const active = (rooms || []).filter((room) => room.isActive !== false);
  return Promise.all(
    active.map(async (room) => {
      let images = room.images || [];
      if (!images.length && room.id) {
        try {
          images = await fetchRoomTypeImages(room.id);
        } catch {
          images = [];
        }
      }
      return mapRoomTypeToWizardRoom({ ...room, images });
    })
  );
}

export function formatRoomTypePrice(item) {
  if (!item) return '';
  const price = item.basePrice ?? '';
  if (price === '' || price == null) return '—';
  return `${price} ${item.currency || ''}`.trim();
}

export function getRoomTypeDisplayImage(roomType) {
  if (!roomType) return '';
  const images = roomType.images || [];
  const cover = images.find((img) => img.isCover);
  const first = images[0];
  return cover?.imageUrl || cover?.url || first?.imageUrl || first?.url || roomType.coverImageUrl || '';
}

/** Map item from GET /api/properties/:id/rooms/search/ */
export function mapPropertyRoomSearchItem(api) {
  return {
    id: String(api.room_type_id ?? api.id ?? ''),
    name: api.name || '',
    nameAr: api.name_ar || api.nameAr || '',
    description: api.description || '',
    descriptionAr: api.description_ar || api.descriptionAr || '',
    maxAdults: api.max_adults ?? 2,
    maxChildren: api.max_children ?? 0,
    totalUnits: api.total_units ?? 1,
    basePrice: api.base_price ?? '',
    currency: api.currency || 'USD',
    extraBedAllowed: api.extra_bed_allowed === true,
    extraBedPrice: api.extra_bed_price ?? '',
    breakfastIncluded: api.breakfast_included === true,
    coverImageUrl: resolveMediaUrl(api.cover_image_url || '')
  };
}

/** Guest-facing shape for property room search results */
export function mapPropertyRoomSearchToGuestRoom(room) {
  const maxAdults = Number(room.maxAdults) || 2;
  const maxChildren = Number(room.maxChildren) || 0;
  const image = room.coverImageUrl || '';

  return {
    id: room.id,
    name: room.name,
    nameAr: room.nameAr || room.name_ar || '',
    capacity: maxAdults + maxChildren || maxAdults,
    maxAdults,
    maxChildren,
    price: Number(room.basePrice) || 0,
    currency: room.currency || 'USD',
    size: room.unitTypeLabel || room.size || 'Room',
    bed: room.bedTypeLabel || room.bed || room.size || 'Room',
    breakfast: room.breakfastIncluded ? 'Breakfast included' : 'No breakfast',
    refundable: true,
    description: room.description || '',
    descriptionAr: room.descriptionAr || room.description_ar || '',
    totalUnits: room.totalUnits,
    extraBedAllowed: room.extraBedAllowed,
    extraBedPrice: room.extraBedPrice,
    images: image ? [image] : [],
    image
  };
}

function sortGuestRoomImages(images) {
  return [...images].sort((a, b) => {
    if (a.isCover && !b.isCover) return -1;
    if (!a.isCover && b.isCover) return 1;
    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
  });
}

function guestRoomImageUrls(images) {
  return [...new Set(
    sortGuestRoomImages(images)
      .filter((img) => img.isActive !== false && img.imageUrl)
      .map((img) => img.imageUrl)
  )];
}

/** Attach gallery URLs from GET /api/room-type-images/ (rooms/search omits cover_image_url). */
export async function enrichGuestRoomsWithImages(rooms) {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];

  return Promise.all(
    rooms.map(async (room) => {
      if (room.images?.length) return room;
      try {
        const images = await fetchRoomTypeImages(room.id);
        const urls = guestRoomImageUrls(images);
        if (!urls.length) return room;
        return {
          ...room,
          images: urls,
          image: urls[0]
        };
      } catch {
        return room;
      }
    })
  );
}

/** GET /api/properties/:id/rooms/search/ — guest room listing for a property */
export async function fetchPropertyRoomsSearch(
  propertyId,
  { adults, children } = {}
) {
  if (!propertyId) return [];

  const params = new URLSearchParams();
  if (adults != null) params.set('adults', String(adults));
  if (children != null) params.set('children', String(children));

  const qs = params.toString();
  let path = `/properties/${propertyId}/rooms/search/`;
  if (qs) path += `?${qs}`;
  const data = await apiGet(path);
  const list = Array.isArray(data?.rooms) ? data.rooms : [];
  return list.map(mapPropertyRoomSearchItem);
}

/** Guest rooms via property search endpoint (falls back to /room-types/) */
export async function fetchGuestPropertyRooms(propertyId, searchParams = {}) {
  if (!propertyId) return [];

  const mapResults = async (rooms) => enrichGuestRoomsWithImages(rooms.map(mapPropertyRoomSearchToGuestRoom));

  try {
    const rooms = await fetchPropertyRoomsSearch(propertyId, searchParams);
    if (rooms.length > 0) return mapResults(rooms);
  } catch (primaryErr) {
    try {
      const rooms = await fetchPropertyRoomsSearch(propertyId, {});
      if (rooms.length > 0) return mapResults(rooms);
    } catch {
      try {
        const list = await fetchRoomTypes({ propertyId });
        const fallback = list.filter((r) => r.isActive).map(mapRoomTypeToGuestRoom);
        if (fallback.length > 0) return enrichGuestRoomsWithImages(fallback);
      } catch {
        throw primaryErr;
      }
      throw primaryErr;
    }
    throw primaryErr;
  }

  const list = await fetchRoomTypes({ propertyId });
  return enrichGuestRoomsWithImages(list.filter((r) => r.isActive).map(mapRoomTypeToGuestRoom));
}

/** Map room type for guest hotel detail / booking */
export function mapRoomTypeToGuestRoom(roomType) {
  const images = roomType.images?.length
    ? roomType.images
        .filter((img) => img.isCover)
        .concat(roomType.images.filter((img) => !img.isCover))
        .map((img) => resolveMediaUrl(img.imageUrl || img.url))
    : roomType.coverImageUrl
      ? [resolveMediaUrl(roomType.coverImageUrl)]
      : [];

  const uniqueImages = [...new Set(images.filter(Boolean))];
  const maxAdults = Number(roomType.maxAdults) || 2;
  const maxChildren = Number(roomType.maxChildren) || 0;

  return {
    id: roomType.id,
    name: roomType.name,
    nameAr: roomType.nameAr || roomType.name_ar || '',
    capacity: maxAdults + maxChildren || maxAdults,
    maxAdults,
    maxChildren,
    price: Number(roomType.basePrice) || 0,
    currency: roomType.currency || 'USD',
    size: roomType.unitTypeLabel,
    bed: roomType.unitTypeLabel,
    breakfast: roomType.breakfastIncluded ? 'Breakfast included' : 'No breakfast',
    refundable: true,
    description: roomType.description || '',
    descriptionAr: roomType.descriptionAr || roomType.description_ar || '',
    totalUnits: roomType.totalUnits,
    extraBedAllowed: roomType.extraBedAllowed,
    images: uniqueImages,
    image: uniqueImages[0] || getRoomTypeDisplayImage(roomType)
  };
}

/** GET /api/room-types/ — follows pagination (API returns 20 per page) */
export async function fetchRoomTypes({ propertyId } = {}) {
  const path = propertyId ? `/room-types/?property=${propertyId}` : '/room-types/';
  return fetchAllRoomTypePages(path);
}

/** GET /api/room-types/:id/ */
export async function fetchRoomTypeById(id) {
  const data = await apiGet(`/room-types/${id}/`);
  return mapRoomType(data);
}

/** GET guest listing */
export async function fetchGuestRoomTypes(propertyId) {
  if (!propertyId) return [];
  const list = await fetchRoomTypes({ propertyId });
  return list.filter((r) => r.isActive);
}

/** POST /api/room-types/ */
export async function createRoomType(form) {
  const data = await apiPost('/room-types/', buildRoomTypePayload(form));
  return mapRoomType(data);
}

/** PATCH /api/room-types/:id/ */
export async function updateRoomType(id, form) {
  const data = await apiPatch(`/room-types/${id}/`, buildRoomTypePayload(form));
  return mapRoomType(data);
}

/** DELETE /api/room-types/:id/ */
export async function deleteRoomType(id) {
  return apiDelete(`/room-types/${id}/`);
}
