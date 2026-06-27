'use client';

import React from 'react';
import HotelAmenities from '../../hotel/HotelAmenities';
import StarRating from '../../icons/StarRating';
import Icon from '../../icons/Icon';

function getCoverImage(existingImages, pendingImages, deletedImageIds) {
  const visibleExisting = existingImages.filter((img) => !deletedImageIds.includes(img.id));
  const cover =
    pendingImages.find((img) => img.isCover) ||
    visibleExisting.find((img) => img.isCover) ||
    pendingImages[0] ||
    visibleExisting[0];
  return cover?.preview || cover?.url || '';
}

const PropertyPreviewCard = ({
  values,
  amenitiesCatalog = [],
  existingImages = [],
  pendingImages = [],
  deletedImageIds = []
}) => {
  const amenityIds = new Set((values.amenity_ids || []).map((id) => String(id)));
  const amenityItems = amenitiesCatalog
    .filter((item) => amenityIds.has(String(item.id)))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      nameAr: item.nameAr || item.name_ar || '',
      iconUrl: item.iconUrl || ''
    }));

  const hotel = {
    id: 'preview',
    name: values.name || 'Property name',
    stars: Number(values.stars) || 0,
    city: values.city || 'City',
    country: values.country || '',
    address: values.address || '',
    propertyType: values.property_type || 'hotel',
    amenityItems
  };
  const image = getCoverImage(existingImages, pendingImages, deletedImageIds);

  return (
    <article className="property-preview-card" aria-label="Guest-facing property preview">
      <div className="property-preview-card__image">
        {image ? (
          <img src={image} alt={hotel.name} loading="lazy" decoding="async" />
        ) : (
          <div className="property-preview-card__placeholder">
            <Icon name="building-2" size={28} />
          </div>
        )}
        <StarRating value={hotel.stars} size={12} className="property-preview-card__stars" />
      </div>

      <div className="property-preview-card__body">
        <div className="property-preview-card__top">
          <h4>{hotel.name}</h4>
          <span>{hotel.propertyType}</span>
        </div>
        <p className="property-preview-card__location">
          <Icon name="map-pin" size={14} />
          <span>{[hotel.city, hotel.country].filter(Boolean).join(', ') || 'Location missing'}</span>
        </p>
        {amenityItems.length > 0 ? (
          <HotelAmenities hotel={hotel} variant="compact" limit={5} />
        ) : (
          <p className="property-preview-card__empty">No amenities selected yet</p>
        )}
      </div>
    </article>
  );
};

export default PropertyPreviewCard;
