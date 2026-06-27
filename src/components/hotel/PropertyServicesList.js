'use client';

import React from 'react';
import { formatServicePrice } from '../../api/propertyServicesApi';
import { getServiceDisplayName, getServiceGuestBlurb } from '../../utils/serviceDisplay';
import { useTranslation } from '../../context/I18nContext';

const PropertyServicesList = ({ services = [] }) => {
  const { t, locale } = useTranslation();

  if (!services.length) return null;

  return (
    <div className="property-services-guest">
      <div className="property-services-grid">
        {services.map((service) => {
          const blurb = getServiceGuestBlurb(service, locale);
          return (
            <article key={service.id} className="property-service-card">
              {service.categoryName && (
                <span className="property-service-category">{service.categoryName}</span>
              )}
              <div className="property-service-card-head">
                <h4>{getServiceDisplayName(service, locale)}</h4>
                {service.isFeatured && (
                  <span className="property-service-featured">{t('hotel.serviceFeatured', 'Featured')}</span>
                )}
              </div>
              {blurb && (
                <p className="property-service-short">{blurb}</p>
              )}
              <div className="property-service-meta">
                <span className="property-service-price">{formatServicePrice(service)}</span>
                {service.durationMinutes !== '' && service.durationMinutes != null && (
                  <span className="property-service-duration">
                    {t('hotel.serviceDurationMin', '{{n}} min', { n: service.durationMinutes })}
                  </span>
                )}
                {(service.availableFrom || service.availableUntil) && (
                  <span className="property-service-hours">
                    {service.availableFrom || '—'} – {service.availableUntil || '—'}
                  </span>
                )}
                {service.advanceBookingRequired && (
                  <span className="property-service-badge">{t('hotel.serviceAdvanceBooking', 'Advance booking')}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyServicesList;
