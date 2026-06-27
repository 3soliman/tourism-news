import React, { useMemo } from 'react';
import StarRating from '../../icons/StarRating';
import Icon from '../../icons/Icon';
import { getAmenityDisplayName } from '../../../utils/amenityDisplay';
import { useTranslation } from '../../../context/I18nContext';

import { HOTEL_WIZARD_TOTAL_STEPS } from '../../utils/hotelPayload';

const STEP_LABELS = ['Basic Info', 'Location', 'Photos', 'Amenities', 'Publish'];

function getCoverImage(existingImages, pendingImages, deletedImageIds) {
  const visibleExisting = existingImages.filter((img) => !deletedImageIds.includes(img.id));
  const cover =
    pendingImages.find((img) => img.isCover) ||
    visibleExisting.find((img) => img.isCover) ||
    pendingImages[0] ||
    visibleExisting[0];
  return cover?.preview || cover?.url || '';
}

function computeReadiness(values, photoCount, amenityCount) {
  const checks = [
    {
      key: 'name',
      label: 'Property name',
      done: Boolean(values.name?.trim()),
      required: true,
    },
    {
      key: 'type',
      label: 'Property type',
      done: Boolean(values.property_type),
      required: true,
    },
    {
      key: 'location',
      label: 'Location (country + city)',
      done: Boolean(values.country?.trim() && values.city?.trim()),
      required: true,
    },
    {
      key: 'address',
      label: 'Street address',
      done: Boolean(values.address?.trim()),
      required: true,
    },
    {
      key: 'photos',
      label: 'At least one photo',
      done: photoCount > 0,
      required: true,
    },
    {
      key: 'amenities',
      label: 'At least one amenity',
      done: amenityCount > 0,
      required: true,
    },
  ];

  const done = checks.filter((c) => c.done).length;
  const total = checks.filter((c) => c.required).length;
  const score = Math.round((done / total) * 100);
  const missing = checks.filter((c) => c.required && !c.done);

  return { checks, done, total, score, missing };
}

const LivePreviewPanel = ({
  values = {},
  amenitiesCatalog = [],
  existingImages = [],
  pendingImages = [],
  deletedImageIds = [],
  currentStep = 1,
  totalSteps = HOTEL_WIZARD_TOTAL_STEPS,
  isSaving = false,
  lastSaved = null,
  draftStatus = null,
}) => {
  const { locale } = useTranslation();
  const amenityIds = useMemo(() => new Set((values.amenity_ids || []).map(String)), [values.amenity_ids]);
  const selectedAmenities = useMemo(
    () => amenitiesCatalog.filter((a) => amenityIds.has(String(a.id))).slice(0, 6),
    [amenitiesCatalog, amenityIds],
  );
  const image = useMemo(
    () => getCoverImage(existingImages, pendingImages, deletedImageIds),
    [existingImages, pendingImages, deletedImageIds],
  );

  const photoCount = existingImages.filter((img) => !deletedImageIds.includes(img.id)).length + pendingImages.length;
  const readiness = useMemo(
    () => computeReadiness(values, photoCount, amenityIds.size),
    [values, photoCount, amenityIds],
  );

  const location = [values.city, values.country].filter(Boolean).join(', ') || null;
  const timeSince = lastSaved ? formatTimeSince(lastSaved) : null;

  const healthColor = readiness.score >= 80 ? 'is-healthy' : readiness.score >= 40 ? 'is-moderate' : 'is-low';

  return (
    <aside className="live-preview" aria-label="Property preview">
      <div className="live-preview__sticky">
        {/* Status bar */}
        <div className="live-preview__status">
          <div className="live-preview__status-row">
            <span className={`live-preview__draft-badge${draftStatus === 'published' ? ' is-published' : ''}`}>
              {draftStatus === 'published' ? 'Published' : 'Draft'}
            </span>
            <span className="live-preview__progress-text">Step {currentStep} of {totalSteps}</span>
          </div>
        </div>

        {/* Property Health Score */}
        <div className={`live-preview__health ${healthColor}`}>
          <div className="live-preview__health-header">
            <span className="live-preview__health-label">Property Health</span>
            <span className="live-preview__health-score">{readiness.score}%</span>
          </div>
          <div className="live-preview__health-bar">
            <div
              className="live-preview__health-fill"
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          {readiness.missing.length > 0 && (
            <ul className="live-preview__health-missing">
              {readiness.missing.map((m) => (
                <li key={m.key}>
                  <Icon name="x" size={10} />
                  <span>{m.label}</span>
                </li>
              ))}
            </ul>
          )}
          {readiness.missing.length === 0 && readiness.score === 100 && (
            <p className="live-preview__health-ready">
              <Icon name="check" size={12} />
              Ready to publish
            </p>
          )}
        </div>

        {/* Cover photo */}
        <div className="live-preview__cover">
          {image ? (
            <img src={image} alt={values.name || 'Property'} />
          ) : (
            <div className="live-preview__cover-placeholder">
              <Icon name="building-2" size={32} />
              <span>Add a photo</span>
            </div>
          )}
          {Number(values.stars) > 0 && (
            <StarRating value={Number(values.stars)} size={11} className="live-preview__stars" />
          )}
        </div>

        {/* Property info — guest-facing card preview */}
        <div className="live-preview__card">
          <div className="live-preview__info">
            <h3 className="live-preview__name">{values.name || 'Property Name'}</h3>
            {values.property_type && (
              <span className="live-preview__type">
                {values.property_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
            {location && (
              <p className="live-preview__location">
                <Icon name="map-pin" size={13} />
                <span>{location}</span>
              </p>
            )}
          </div>

          {/* Amenities */}
          {selectedAmenities.length > 0 && (
            <div className="live-preview__amenities">
              <span className="live-preview__label">Amenities</span>
              <div className="live-preview__amenity-list">
                {selectedAmenities.map((a) => (
                  <span key={a.id} className="live-preview__amenity">
                    {a.iconUrl && <img src={a.iconUrl} alt="" className="live-preview__amenity-icon" />}
                    {getAmenityDisplayName(a, locale)}
                  </span>
                ))}
                {amenityIds.size > 6 && (
                  <span className="live-preview__amenity-more">+{amenityIds.size - 6} more</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step progress */}
        <div className="live-preview__steps">
          <span className="live-preview__label">Setup progress</span>
          <div className="live-preview__progress-bar">
            <div className="live-preview__progress-fill" style={{ width: `${Math.round(((currentStep - 1) / 5) * 100)}%` }} />
          </div>
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`live-preview__step${i + 1 < currentStep ? ' is-done' : ''}${i + 1 === currentStep ? ' is-current' : ''}`}
            >
              <div className="live-preview__step-dot" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Autosave indicator */}
        <div className="live-preview__save-status">
          {isSaving ? (
            <span className="live-preview__saving"><Icon name="loader" size={12} /> Saving…</span>
          ) : timeSince ? (
            <span className="live-preview__saved"><Icon name="check" size={12} /> Saved {timeSince}</span>
          ) : (
            <span className="live-preview__not-saved">Not saved yet</span>
          )}
        </div>
      </div>
    </aside>
  );
};

function formatTimeSince(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1m ago';
  if (minutes < 60) return `${minutes}m ago`;
  return 'a while ago';
}

export default LivePreviewPanel;
