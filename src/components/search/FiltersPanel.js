'use client';

import React, { useState } from 'react';
import { AMENITY_OPTIONS, BREAKFAST_OPTIONS } from '../../data/searchOptions';
import { useTranslation } from '../../context/I18nContext';

const FilterSection = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="src-filter-group">
      <button type="button" className="src-filter-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`src-filter-chevron${open ? ' is-open' : ''}`}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="src-filter-content">{children}</div>}
    </div>
  );
};

const PROPERTY_TYPE_KEYS = {
  luxury: 'filters.luxury',
  beach: 'filters.resort',
  city: 'filters.city',
  nature: 'filters.boutique',
  budget: 'filters.budget'
};

const BREAKFAST_LABEL_KEYS = {
  none: 'filters.notIncluded',
  included: 'filters.included'
};

const FiltersPanel = ({ filters, onChange }) => {
  const { t } = useTranslation();

  const toggle = (key, value) => {
    const arr = filters[key];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next });
  };

  const setPrice = (field, val) => {
    onChange({ ...filters, [field]: val === '' ? null : Number(val) });
  };

  const anyActive = filters.stars.length > 0 || filters.minPrice != null || filters.maxPrice != null ||
    filters.amenities.length > 0 || filters.breakfast.length > 0 || filters.types.length > 0;

  const amenityLabel = (amenity) => t(`amenities.${amenity.id}`, amenity.label);
  const breakfastLabel = (option) => {
    const key = BREAKFAST_LABEL_KEYS[option.id];
    return key ? t(key) : t(`filters.breakfast.${option.id}`, option.label);
  };
  const propertyTypeLabel = (type) => {
    const key = PROPERTY_TYPE_KEYS[type];
    return key ? t(key) : t(`filters.${type}`, type.charAt(0).toUpperCase() + type.slice(1));
  };

  return (
    <aside className="src-filters">
      <div className="src-filters-header">
        <h3>{t('filters.title')}</h3>
        {anyActive && (
          <button type="button" className="src-filters-clear" onClick={() =>
            onChange({ stars: [], minPrice: null, maxPrice: null, amenities: [], breakfast: [], types: [] })
          }>
            {t('filters.clearAll')}
          </button>
        )}
      </div>

      <FilterSection title={t('filters.starRating')}>
        <div className="src-filter-stars">
          {[5, 4, 3].map((star) => (
            <button
              key={star}
              type="button"
              className={`src-filter-star-btn${filters.stars.includes(star) ? ' is-active' : ''}`}
              onClick={() => toggle('stars', star)}
              aria-pressed={filters.stars.includes(star)}
            >
              {'★'.repeat(star)}{'☆'.repeat(5 - star)}
              <span>{star}+</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title={t('filters.pricePerNight')}>
        <div className="src-filter-price">
          <input type="number" placeholder={t('filters.any')} min={0} value={filters.minPrice ?? ''}
            onChange={(e) => setPrice('minPrice', e.target.value)} />
          <span>{t('common.emDash')}</span>
          <input type="number" placeholder={t('filters.any')} min={0} value={filters.maxPrice ?? ''}
            onChange={(e) => setPrice('maxPrice', e.target.value)} />
        </div>
      </FilterSection>

      <FilterSection title={t('filters.propertyType')}>
        {['luxury', 'beach', 'city', 'nature', 'budget'].map((type) => (
          <label key={type} className="src-filter-check">
            <input type="checkbox" checked={filters.types.includes(type)}
              onChange={() => toggle('types', type)} />
            <span>{propertyTypeLabel(type)}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('filters.breakfast')} defaultOpen={false}>
        {BREAKFAST_OPTIONS.map((b) => (
          <label key={b.id} className="src-filter-check">
            <input type="checkbox" checked={filters.breakfast.includes(b.id)}
              onChange={() => toggle('breakfast', b.id)} />
            <span>{breakfastLabel(b)}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title={t('filters.amenities')} defaultOpen={false}>
        {AMENITY_OPTIONS.map((a) => (
          <label key={a.id} className="src-filter-check">
            <input type="checkbox" checked={filters.amenities.includes(a.id)}
              onChange={() => toggle('amenities', a.id)} />
            <span>{amenityLabel(a)}</span>
          </label>
        ))}
      </FilterSection>
    </aside>
  );
};

export default FiltersPanel;
