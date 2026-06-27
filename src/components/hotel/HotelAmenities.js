'use client';

import React, { useState } from 'react';
import { getHotelAmenities } from '../../utils/mapHotel';
import { getAmenityDisplayName } from '../../utils/amenityDisplay';
import { useTranslation } from '../../context/I18nContext';
import Icon from '../icons/Icon';

function AmenityIcon({ item, variant, displayName }) {
  const [failed, setFailed] = useState(false);
  const showImg = item.iconUrl && !failed;
  const fallbackLetter = (displayName || item.name || '?').charAt(0).toUpperCase();

  if (variant === 'chip') {
    return (
      <span className="hotel-amenity-chip-icon" aria-hidden>
        {showImg ? (
          <img src={item.iconUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        ) : (
          <Icon name="check" size={14} />
        )}
      </span>
    );
  }

  return (
    <div className="hotel-amenity-card-icon" aria-hidden>
      {showImg ? (
        <img src={item.iconUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className="hotel-amenity-card-fallback">
          {fallbackLetter}
        </span>
      )}
    </div>
  );
}

/**
 * Guest-facing amenities display (detail grid or compact chips).
 */
const HotelAmenities = ({ hotel, variant = 'grid', limit, className = '' }) => {
  const { locale } = useTranslation();
  const items = getHotelAmenities(hotel);
  const shown = limit != null ? items.slice(0, limit) : items;
  const extra = limit != null && items.length > limit ? items.length - limit : 0;
  const label = (item) => getAmenityDisplayName(item, locale);

  if (!shown.length) return null;

  if (variant === 'compact') {
    return (
      <div className={`hotel-amenities hotel-amenities--compact ${className}`.trim()}>
        {shown.map((item) => (
          <span key={item.id} className="hotel-amenity-chip">
            <AmenityIcon item={item} variant="chip" displayName={label(item)} />
            <span className="hotel-amenity-chip-label">{label(item)}</span>
          </span>
        ))}
        {extra > 0 && (
          <span className="hotel-amenity-chip hotel-amenity-chip--more">
            +{extra} more
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`hotel-amenities hotel-amenities--grid ${className}`.trim()}>
      {shown.map((item) => (
        <div key={item.id} className="hotel-amenity-card">
          <AmenityIcon item={item} variant="card" displayName={label(item)} />
          <span className="hotel-amenity-card-name">{label(item)}</span>
        </div>
      ))}
    </div>
  );
};

export default HotelAmenities;
