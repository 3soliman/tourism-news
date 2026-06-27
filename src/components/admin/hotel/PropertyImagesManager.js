import React, { useId } from 'react';
import Icon from '../../icons/Icon';
import AdminIconButton from '../AdminIconButton';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

const PropertyImagesManager = ({
  existingImages,
  pendingImages,
  deletedImageIds,
  onAddFiles,
  onRemoveExisting,
  onRemovePending,
  onUpdateExisting,
  onUpdatePending,
  onSetCover,
  onReorderImages,
  onInvalidFiles,
  submitting,
  error,
  hint = 'Upload gallery photos for this property. Mark one image as the cover — it appears in search results.',
  emptyMessage = 'No photos yet. Add images from your device to build the property gallery.',
  uploadLabel = 'Upload photos',
  coverBadge = 'Cover'
}) => {
  const inputId = useId();
  const visibleExisting = existingImages.filter((img) => !deletedImageIds.includes(img.id));
  const orderedImages = [
    ...visibleExisting.map((img) => ({ ...img, type: 'existing', key: `existing-${img.id}` })),
    ...pendingImages.map((img) => ({ ...img, type: 'pending', key: `pending-${img.localId}` }))
  ].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const total = orderedImages.length;

  const handleFiles = (fileList) => {
    const allFiles = Array.from(fileList || []);
    const files = allFiles.filter((file) => /^image\/(jpeg|png|webp)$/i.test(file.type));
    const rejected = allFiles.length - files.length;
    if (rejected > 0) onInvalidFiles?.(rejected);
    if (files.length) onAddFiles(files);
  };

  const onInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (submitting) return;
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDrop = (dragKey, targetKey) => {
    if (!onReorderImages || submitting || dragKey === targetKey) return;
    const fromIndex = orderedImages.findIndex((img) => img.key === dragKey);
    const toIndex = orderedImages.findIndex((img) => img.key === targetKey);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...orderedImages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderImages(next);
  };

  return (
    <div className="hotel-step-panel hotel-images-step">
      {hint ? <p className="hotel-step-hint">{hint}</p> : null}
      {error && <span className="field-error hotel-images-error">{error}</span>}

      <div className={`property-images-upload-zone${total > 0 ? ' property-images-upload-zone--compact' : ''}`}>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          onChange={onInputChange}
          disabled={submitting}
          className="property-images-file-input"
        />

        <label
          htmlFor={inputId}
          className={`property-images-upload-card${submitting ? ' is-disabled' : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <span className="property-images-upload-icon" aria-hidden="true">
            <Icon name="upload" size={total > 0 ? 22 : 30} />
          </span>
          <div className="property-images-upload-copy">
            <strong>{uploadLabel}</strong>
            {total === 0 ? (
              <p>{emptyMessage}</p>
            ) : (
              <p>Drag & drop more images here or browse from your device.</p>
            )}
            <span className="property-images-upload-formats">JPG · PNG · WEBP · Multiple files</span>
          </div>
          <span className="property-images-upload-btn">
            <Icon name="plus" size={16} />
            <span>Browse files</span>
          </span>
        </label>

        {total > 0 && (
          <p className="property-images-count">
            <Icon name="building-2" size={16} />
            <span>
              {total} photo{total !== 1 ? 's' : ''} in gallery
            </span>
          </p>
        )}
      </div>

      {total > 0 && (
        <div className="property-images-grid">
          {orderedImages.map((img) => {
            const isExisting = img.type === 'existing';
            return (
            <PropertyImageCard
              key={img.key}
              dragKey={img.key}
              src={isExisting ? img.url : img.preview}
              altText={img.altText}
              isCover={img.isCover}
              isPending={!isExisting}
              submitting={submitting}
              coverBadge={coverBadge}
              onSetCover={() => onSetCover(isExisting ? img.id : img.localId, isExisting ? 'existing' : 'pending')}
              onRemove={() => (isExisting ? onRemoveExisting(img.id) : onRemovePending(img.localId))}
              onDropOnCard={handleImageDrop}
            />
          );
          })}
        </div>
      )}
    </div>
  );
};

const PropertyImageCard = ({
  dragKey,
  src,
  altText,
  isCover,
  isPending = false,
  submitting,
  coverBadge = 'Cover',
  onSetCover,
  onRemove,
  onDropOnCard
}) => (
  <article
    className={`property-image-card ${isCover ? 'is-cover' : ''}`}
    draggable={!submitting}
    onDragStart={(event) => event.dataTransfer.setData('text/plain', dragKey)}
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => {
      event.preventDefault();
      onDropOnCard?.(event.dataTransfer.getData('text/plain'), dragKey);
    }}
  >
    <div className="property-image-thumb-wrap">
      <img
        src={src}
        alt={altText || 'Photo'}
        className="property-image-thumb"
        loading="lazy"
        decoding="async"
      />
      {isCover && <span className="property-image-cover-badge">{coverBadge}</span>}
      {isPending && <span className="property-image-pending-badge">New</span>}
      <div className="property-image-actions">
        <AdminIconButton
          icon="star"
          label={isCover ? 'Cover image' : 'Set as cover image'}
          className={isCover ? 'property-image-action--cover' : ''}
          onClick={onSetCover}
          disabled={submitting || isCover}
        />
        <AdminIconButton
          icon="trash-2"
          label="Remove image"
          variant="danger"
          className="property-image-action--danger"
          onClick={onRemove}
          disabled={submitting}
        />
      </div>
    </div>
  </article>
);

export default PropertyImagesManager;
