import { apiGet, apiPost, apiPatch, apiDelete, apiPostForm } from './client';
import { resolveMediaUrl } from '../utils/mapHotel';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

export function mapRoomTypeImageRecord(api) {
  const raw = api.image_url || api.image || '';
  const url =
    typeof raw === 'string' && /^https?:\/\//i.test(raw) ? raw : resolveMediaUrl(raw);

  return {
    id: String(api.id),
    roomTypeId: String(api.room_type),
    url,
    imageUrl: url,
    caption: api.caption || '',
    altText: api.alt_text || '',
    displayOrder: api.display_order ?? 0,
    isCover: Boolean(api.is_cover),
    isActive: api.is_active !== false
  };
}

/** GET /api/room-type-images/?room_type={id} */
export async function fetchRoomTypeImages(roomTypeId) {
  let list = [];
  try {
    const data = await apiGet(`/room-type-images/?room_type=${roomTypeId}`);
    list = parseList(data);
  } catch {
    const data = await apiGet('/room-type-images/');
    list = parseList(data).filter((img) => String(img.room_type) === String(roomTypeId));
  }

  return list
    .filter((img) => img.is_active !== false)
    .map(mapRoomTypeImageRecord)
    .sort((a, b) => {
      if (a.isCover && !b.isCover) return -1;
      if (!a.isCover && b.isCover) return 1;
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
}

/** POST /api/room-type-images/ */
export async function createRoomTypeImage({
  roomTypeId,
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
    fd.append('room_type', String(roomTypeId));
    fd.append('image', file);
    fd.append('caption', caption);
    fd.append('alt_text', altText);
    fd.append('display_order', String(displayOrder));
    fd.append('is_cover', isCover ? 'true' : 'false');
    fd.append('is_active', isActive ? 'true' : 'false');
    const data = await apiPostForm('/room-type-images/', fd);
    return mapRoomTypeImageRecord(data);
  }

  const body = {
    room_type: Number(roomTypeId),
    image: imageUrl,
    caption,
    alt_text: altText,
    display_order: displayOrder,
    is_cover: isCover,
    is_active: isActive
  };
  const data = await apiPost('/room-type-images/', body);
  return mapRoomTypeImageRecord(data);
}

/** PATCH /api/room-type-images/:id/ */
export async function updateRoomTypeImage(id, updates) {
  const body = {};
  if (updates.caption !== undefined) body.caption = updates.caption;
  if (updates.altText !== undefined) body.alt_text = updates.altText;
  if (updates.displayOrder !== undefined) body.display_order = updates.displayOrder;
  if (updates.isCover !== undefined) body.is_cover = updates.isCover;
  if (updates.isActive !== undefined) body.is_active = updates.isActive;

  const data = await apiPatch(`/room-type-images/${id}/`, body);
  return mapRoomTypeImageRecord(data);
}

/** DELETE /api/room-type-images/:id/ */
export async function deleteRoomTypeImage(id) {
  return apiDelete(`/room-type-images/${id}/`);
}

/**
 * Sync gallery after room type create/update.
 * @param {string|number} roomTypeId
 * @param {{ existingImages: object[], pendingImages: object[], deletedImageIds: string[] }} state
 */
export async function syncRoomTypeImages(roomTypeId, { existingImages, pendingImages, deletedImageIds }) {
  for (const imageId of deletedImageIds) {
    await deleteRoomTypeImage(imageId);
  }

  const remaining = existingImages.filter((img) => !deletedImageIds.includes(img.id));
  const coverExisting = remaining.find((img) => img.isCover);
  const coverPending = pendingImages.find((img) => img.isCover);

  for (const img of remaining) {
    if (!img.dirty) continue;
    await updateRoomTypeImage(img.id, {
      caption: img.caption,
      altText: img.altText,
      displayOrder: img.displayOrder
    });
  }

  let order = remaining.length;
  for (const pending of pendingImages) {
    await createRoomTypeImage({
      roomTypeId,
      file: pending.file,
      imageUrl: pending.url,
      caption: pending.caption,
      altText: pending.altText,
      displayOrder: order,
      isCover: pending.isCover,
      isActive: true
    });
    order += 1;
  }

  if (coverPending) {
    for (const img of remaining) {
      if (img.isCover) {
        await updateRoomTypeImage(img.id, { isCover: false });
      }
    }
  } else if (coverExisting) {
    for (const img of remaining) {
      const shouldCover = img.id === coverExisting.id;
      if (img.isCover !== shouldCover) {
        await updateRoomTypeImage(img.id, { isCover: shouldCover });
      }
    }
  }
}
