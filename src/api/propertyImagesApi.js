import { apiGet, apiPost, apiPatch, apiDelete, apiPostForm } from './client';
import { resolveMediaUrl } from '../utils/mapHotel';
import { updatePropertyCoverImage } from './propertiesApi';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

export function mapPropertyImage(api) {
  const rawUrl = api.image_url || api.image || '';
  return {
    id: String(api.id),
    propertyId: String(api.property),
    url: resolveMediaUrl(rawUrl),
    caption: api.caption || '',
    altText: api.alt_text || '',
    displayOrder: api.display_order ?? 0,
    isCover: api.is_cover === true || api.is_cover === 1 || api.is_cover === '1' || api.is_cover === 'true',
    isActive: api.is_active !== false
  };
}

/** GET /api/property-images/?property={id} */
export async function fetchPropertyImages(propertyId) {
  let list = [];
  try {
    const data = await apiGet(`/property-images/?property=${propertyId}`);
    list = parseList(data);
  } catch {
    const data = await apiGet('/property-images/');
    list = parseList(data).filter((img) => String(img.property) === String(propertyId));
  }

  return list
    .filter((img) => img.is_active !== false)
    .sort((a, b) => {
      const aCover = a.is_cover === true || a.is_cover === 1;
      const bCover = b.is_cover === true || b.is_cover === 1;
      if (aCover && !bCover) return -1;
      if (!aCover && bCover) return 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    })
    .map(mapPropertyImage);
}

/** POST /api/property-images/ */
export async function createPropertyImage({
  propertyId,
  file = null,
  imageUrl = '',
  caption = '',
  altText = '',
  displayOrder = 0,
  isCover = false,
  isActive = true
}) {
  if (file) {
    const fd = new FormData();
    fd.append('property', String(propertyId));
    fd.append('image', file);
    fd.append('caption', caption);
    fd.append('alt_text', altText);
    fd.append('display_order', String(displayOrder));
    fd.append('is_cover', isCover ? 'true' : 'false');
    fd.append('is_active', isActive ? 'true' : 'false');
    const data = await apiPostForm('/property-images/', fd);
    return mapPropertyImage(data);
  }

  const body = {
    property: Number(propertyId),
    image: imageUrl,
    caption,
    alt_text: altText,
    display_order: displayOrder,
    is_cover: isCover,
    is_active: isActive
  };
  const data = await apiPost('/property-images/', body);
  return mapPropertyImage(data);
}

/** PATCH /api/property-images/:id/ */
export async function updatePropertyImage(id, updates) {
  const body = {};
  if (updates.caption !== undefined) body.caption = updates.caption;
  if (updates.altText !== undefined) body.alt_text = updates.altText;
  if (updates.displayOrder !== undefined) body.display_order = updates.displayOrder;
  if (updates.isCover !== undefined) body.is_cover = updates.isCover;
  if (updates.isActive !== undefined) body.is_active = updates.isActive;

  const data = await apiPatch(`/property-images/${id}/`, body);
  return mapPropertyImage(data);
}

/** DELETE /api/property-images/:id/ */
export async function deletePropertyImage(id) {
  return apiDelete(`/property-images/${id}/`);
}

/**
 * Mark one gallery image as cover (clears other covers on the server).
 * Optionally links cover_image_id on the property record.
 */
export async function setPropertyCoverImage(propertyId, imageId, { linkProperty = true } = {}) {
  await updatePropertyImage(imageId, { isCover: true });
  if (linkProperty && propertyId) {
    await updatePropertyCoverImage(propertyId, imageId);
  }
}

/**
 * Sync gallery after property create/update.
 * Returns the resolved cover image id for PATCH /api/properties/:id/ (cover_image_id).
 */
export async function syncPropertyImages(propertyId, { existingImages, pendingImages, deletedImageIds }) {
  const deletedIds = new Set((deletedImageIds || []).map(String));

  for (const imageId of deletedIds) {
    await deletePropertyImage(imageId);
  }

  const remaining = existingImages.filter((img) => !deletedIds.has(String(img.id)));
  const coverPending = pendingImages.find((img) => img.isCover);
  const coverExisting = remaining.find((img) => img.isCover);
  let coverImageId = null;

  for (const img of remaining) {
    if (!img.dirty) continue;
    await updatePropertyImage(img.id, {
      caption: img.caption,
      altText: img.altText,
      displayOrder: img.displayOrder
    });
  }

  const orderedPending = [...pendingImages].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  let order = remaining.length;

  for (const pending of orderedPending) {
    if (!pending.file) continue;
    const created = await createPropertyImage({
      propertyId,
      file: pending.file,
      imageUrl: pending.url,
      caption: pending.caption,
      altText: pending.altText,
      displayOrder: pending.displayOrder ?? order,
      isCover: false,
      isActive: true
    });
    order += 1;
    if (pending.isCover) coverImageId = Number(created.id);
  }

  if (coverPending && coverImageId) {
    await setPropertyCoverImage(propertyId, coverImageId, { linkProperty: false });
  } else if (coverExisting) {
    coverImageId = Number(coverExisting.id);
    await setPropertyCoverImage(propertyId, coverImageId, { linkProperty: false });
  }

  return { coverImageId: Number.isFinite(coverImageId) ? coverImageId : null };
}
