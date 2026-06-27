import React, { useId } from 'react';
import Icon from '../../icons/Icon';

const ACCEPTED = 'image/jpeg,image/png,image/webp';

const RoomPhotoManager = ({
  images = [],
  onAddFiles,
  onRemove,
  onSetCover,
  onUpdate,
  submitting,
  error,
}) => {
  const inputId = useId();

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      /^image\/(jpeg|png|webp)$/i.test(f.type)
    );
    if (files.length) onAddFiles(files);
  };

  return (
    <div className="room-photo-manager">
      {error && <span className="field-error">{error}</span>}
      <label htmlFor={inputId} className={`room-photo-upload-btn${submitting ? ' is-disabled' : ''}`}>
        <Icon name="upload" size={16} />
        <span>Add photos</span>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          disabled={submitting}
          hidden
        />
      </label>
      {images.length > 0 && (
        <div className="room-photo-grid">
          {images.map((img, i) => (
            <div key={img.id || img.localId} className="room-photo-thumb">
              <img src={img.url || img.preview} alt="" />
              {img.isCover && <span className="room-photo-cover-badge">Cover</span>}
              <div className="room-photo-actions">
                {!img.isCover && (
                  <button type="button" className="room-photo-action-btn" onClick={() => onSetCover(img)} disabled={submitting} title="Set as cover">
                    <Icon name="star" size={14} />
                  </button>
                )}
                  <button type="button" className="room-photo-action-btn room-photo-action-btn--danger" onClick={() => onRemove(img)} disabled={submitting} title="Remove">
                  <Icon name="x" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomPhotoManager;
