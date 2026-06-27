/** @typedef {{ id: string, url: string, caption: string, altText: string, displayOrder: number, isCover: boolean, dirty?: boolean }} ExistingPropertyImage */
/** @typedef {{ localId: string, file: File|null, url: string, preview: string, caption: string, altText: string, isCover: boolean }} PendingPropertyImage */

export function mapApiImagesToExisting(images) {
  return (images || []).map((img) => ({
    id: img.id,
    url: img.url,
    caption: img.caption || '',
    altText: img.altText || '',
    displayOrder: img.displayOrder ?? 0,
    isCover: Boolean(img.isCover),
    dirty: false
  }));
}

export function createPendingFromFile(file, { isCover = false } = {}) {
  return {
    localId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    url: '',
    preview: URL.createObjectURL(file),
    caption: '',
    altText: '',
    isCover
  };
}

export function createPendingFromUrl(url, { isCover = false } = {}) {
  return {
    localId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file: null,
    url: url.trim(),
    preview: url.trim(),
    caption: '',
    altText: '',
    isCover
  };
}

function isDeletedImage(imageId, deletedImageIds) {
  return (deletedImageIds || []).some((id) => String(id) === String(imageId));
}

export function countPropertyImages(existingImages, pendingImages, deletedImageIds) {
  const remaining = existingImages.filter((img) => !isDeletedImage(img.id, deletedImageIds));
  return remaining.length + pendingImages.length;
}

export function validatePropertyImages(existingImages, pendingImages, deletedImageIds) {
  const remaining = existingImages.filter((img) => !isDeletedImage(img.id, deletedImageIds));
  const total = remaining.length + pendingImages.length;
  const errors = {};

  if (total === 0) {
    errors.main_image = 'Add at least one property photo';
    return { valid: false, errors };
  }

  const hasCover =
    remaining.some((img) => img.isCover) || pendingImages.some((img) => img.isCover);

  if (!hasCover) {
    errors.cover_image = 'Mark one photo as the cover image';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function revokePendingPreviews(pendingImages) {
  pendingImages.forEach((img) => {
    if (img.preview?.startsWith('blob:')) URL.revokeObjectURL(img.preview);
  });
}

export function setCoverImage(existingImages, pendingImages, targetKey, targetType) {
  const nextExisting = existingImages.map((img) => {
    const nextIsCover = targetType === 'existing' && String(img.id) === String(targetKey);
    return {
      ...img,
      isCover: nextIsCover,
      dirty: img.dirty || nextIsCover !== Boolean(img.isCover)
    };
  });

  const nextPending = pendingImages.map((img) => ({
    ...img,
    isCover: targetType === 'pending' && img.localId === targetKey
  }));

  return { existingImages: nextExisting, pendingImages: nextPending };
}

export function autoCoverIfNeeded(existingImages, pendingImages, deletedImageIds) {
  const total = countPropertyImages(existingImages, pendingImages, deletedImageIds);
  if (total === 0) return { existingImages, pendingImages };

  const hasCover =
    existingImages.some((img) => img.isCover && !isDeletedImage(img.id, deletedImageIds)) ||
    pendingImages.some((img) => img.isCover);

  if (hasCover) return { existingImages, pendingImages };

  if (pendingImages.length > 0) {
    const last = pendingImages[pendingImages.length - 1];
    return {
      existingImages,
      pendingImages: pendingImages.map((img) => ({
        ...img,
        isCover: img.localId === last.localId
      }))
    };
  }

  return { existingImages, pendingImages };
}
