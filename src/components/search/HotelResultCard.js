'use client';

import React from 'react';
import { Link } from '@/lib/router-compat';
import { searchToQueryString } from '../../utils/searchUtils';
import { getHotelAmenities } from '../../utils/mapHotel';
import { getAmenityDisplayName } from '../../utils/amenityDisplay';
import { getPropertyDisplayName, getPropertyDescription, getPropertyShortDescription } from '../../utils/propertyDisplay';
import { useTranslation } from '../../context/I18nContext';
import Icon from '../icons/Icon';
import { preloadRoute } from '@/lib/prefetch-route';

const HotelResultCard = ({ hotel, search }) => {
  const { t, locale } = useTranslation();
  const qs = searchToQueryString(search);
  const detailUrl = `/hotel/${hotel.id}?${qs}`;
  const warmDetails = () => preloadRoute(`/hotel/${hotel.id}`);

  const getRatingBadge = (rating) => {
    const score = Number(rating) || 0;
    if (score >= 9.0) return { text: t('hotelCard.exceptional'), color: '#003580' };
    if (score >= 8.5) return { text: t('hotelCard.superb'), color: '#003580' };
    if (score >= 8.0) return { text: t('hotelCard.veryGood'), color: '#003580' };
    if (score >= 7.0) return { text: t('hotelCard.good'), color: '#003580' };
    return { text: t('hotelCard.pleasant'), color: '#5a6872' };
  };

  const badge = hotel.rating != null ? getRatingBadge(hotel.rating) : null;

  const amenities = getHotelAmenities(hotel);
  const visibleAmenities = amenities.slice(0, 4);
  const extraCount = amenities.length - 4;

  const amenityLabel = (item) => getAmenityDisplayName(item, locale);

  const reviewCountLabel = hotel.reviewCount === 1
    ? t('hotelCard.review')
    : t('hotelCard.reviews', null, { count: hotel.reviewCount });

  return (
    <article className="src-card">
      <Link to={detailUrl} className="src-card-image" onMouseEnter={warmDetails} onFocus={warmDetails}
        aria-hidden="true" tabIndex={-1}>
        {hotel.image ? (
          <img src={hotel.image} alt="" loading="lazy" decoding="async"
            sizes="(max-width: 640px) 100vw, 240px" />
        ) : (
          <span className="src-card-image-placeholder"><Icon name="hotel" size={24} /></span>
        )}
        {hotel.stars > 0 && (
          <span className="src-card-stars">{'★'.repeat(hotel.stars)}</span>
        )}
      </Link>

      <div className="src-card-body">
        <div className="src-card-top">
          <div className="src-card-title-block">
            <h3>
              <Link to={detailUrl} onMouseEnter={warmDetails} onFocus={warmDetails}>
                {getPropertyDisplayName(hotel, locale)}
              </Link>
            </h3>
            <p className="src-card-location">
              <Icon name="map-pin" size={12} />
              {[hotel.city, hotel.country].filter(Boolean).join(', ') || hotel.address}
            </p>
          </div>
          {badge && hotel.reviewCount > 0 && (
            <div className="src-card-rating">
              <span className="src-card-rating-score">{Number(hotel.rating).toFixed(1)}</span>
              <div className="src-card-rating-text">
                <span>{badge.text}</span>
                <span className="src-card-rating-count">{reviewCountLabel}</span>
              </div>
            </div>
          )}
        </div>

        <p className="src-card-desc">
          {getPropertyShortDescription(hotel, locale) || getPropertyDescription(hotel, locale)}
        </p>

        <div className="src-card-amenities">
          {visibleAmenities.map((item) => (
            <span key={item.id}>{amenityLabel(item)}</span>
          ))}
          {extraCount > 0 && (
            <span className="src-card-amenities-more">
              {t('hotelCard.moreAmenities', null, { count: extraCount })}
            </span>
          )}
        </div>

        <div className="src-card-footer">
          <div className="src-card-trust">
            <Icon name="check" size={10} /> {t('hotelCard.freeCancellation')}
          </div>
          <div className="src-card-actions">
            <div className="src-card-price">
              {hotel.priceFrom != null ? (
                <>
                  <span className="src-card-price-amount">${hotel.priceFrom}</span>
                  <span className="src-card-price-label">/{t('home.perNight')}</span>
                </>
              ) : (
                <span className="src-card-price-label">{t('hotelCard.priceOnRequest')}</span>
              )}
            </div>
            <Link to={detailUrl} className="src-card-cta" onMouseEnter={warmDetails} onFocus={warmDetails}>
              {t('hotelCard.seeAvailability')}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default React.memo(HotelResultCard);
