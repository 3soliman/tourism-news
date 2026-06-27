'use client';

import React, { useCallback, useMemo, useState } from 'react';
import HotelFormFieldGroup from './HotelFormFieldGroup';
import PropertyLocaleTabs from './PropertyLocaleTabs';
import { PRICING_TYPES, CURRENCY_OPTIONS } from '../../../constants/serviceForm';
import { useTranslation } from '../../../context/I18nContext';

const PropertyServiceFormFields = ({
  form,
  formErrors = {},
  properties = [],
  categories = [],
  onFieldChange,
  disabled = false
}) => {
  const { t } = useTranslation();
  const [contentLocale, setContentLocale] = useState('en');
  const ft = (key, fallback, vars) => t(`pages.propertyServices.form.${key}`, fallback, vars);
  const req = t('common.required', '*');

  const pricingTypes = useMemo(
    () =>
      PRICING_TYPES.map((item) => ({
        ...item,
        label: ft(`pricingType_${item.value}`, item.label)
      })),
    [t]
  );

  const isFree = form.pricing_type === 'free';
  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onFieldChange(field, value);
  };

  const copyEnglishToArabic = useCallback(() => {
    onFieldChange('name_ar', form.name || '');
    onFieldChange('short_description_ar', form.short_description || '');
    onFieldChange('description_ar', form.description || '');
  }, [form.name, form.short_description, form.description, onFieldChange]);

  const activeNameField = contentLocale === 'ar' ? 'name_ar' : 'name';
  const activeShortField = contentLocale === 'ar' ? 'short_description_ar' : 'short_description';
  const activeDescField = contentLocale === 'ar' ? 'description_ar' : 'description';

  return (
    <div className="admin-service-form-body admin-service-form-body--compact">
      <HotelFormFieldGroup title={ft('propertyLink', 'Property link')}>
        <div className="admin-service-compact-grid admin-service-compact-grid--2">
          <div className="form-group">
            <label htmlFor="svc-property">{ft('property', 'Property')} {req}</label>
            <select id="svc-property" value={form.property} onChange={set('property')} disabled={disabled}>
              <option value="">{ft('selectProperty', 'Select property')}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {formErrors.property && <span className="field-error">{formErrors.property}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="svc-category">{ft('category', 'Category')} {req}</label>
            <select id="svc-category" value={form.category_id} onChange={set('category_id')} disabled={disabled}>
              <option value="">{ft('selectCategory', 'Select category')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {formErrors.category_id && <span className="field-error">{formErrors.category_id}</span>}
          </div>
        </div>
      </HotelFormFieldGroup>

      <HotelFormFieldGroup title={ft('serviceContent', 'Service content')}>
        <PropertyLocaleTabs
          activeLocale={contentLocale}
          onLocaleChange={setContentLocale}
          onCopyFromEnglish={copyEnglishToArabic}
          showCopyAction
          copyLabel={ft('copyFromEnglish', 'Copy from English')}
        />
        <p className="hotel-locale-hint">
          {contentLocale === 'ar'
            ? ft('localeFieldsHint', 'Arabic fields are optional. English is used as fallback for guests if Arabic is empty.')
            : ft('localeFieldsHintEn', 'English is required. Add Arabic in the other tab — guests see Arabic when available, otherwise English.')}
        </p>

        <div className="admin-service-compact-grid admin-service-compact-grid--2 admin-service-locale-row">
          <div className="form-group">
            <label htmlFor={activeNameField}>
              {ft('serviceName', 'Service name')}
              {contentLocale === 'en' ? ` ${req}` : (
                <span className="field-optional-label">{ft('optional', 'Optional')}</span>
              )}
            </label>
            <input
              id={activeNameField}
              value={form[activeNameField] || ''}
              onChange={set(activeNameField)}
              disabled={disabled}
              placeholder={contentLocale === 'ar' ? ft('serviceNamePhAr', 'مثال: نقل من/إلى المطار') : ft('serviceNamePh', 'e.g. Airport transfer')}
              dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
            />
            {contentLocale === 'en' && formErrors.name && <span className="field-error">{formErrors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor={activeShortField}>
              {ft('short', 'Short')}
              {contentLocale === 'ar' && (
                <span className="field-optional-label">{ft('optional', 'Optional')}</span>
              )}
            </label>
            <input
              id={activeShortField}
              value={form[activeShortField] || ''}
              onChange={set(activeShortField)}
              disabled={disabled}
              placeholder={contentLocale === 'ar' ? ft('shortPhAr', 'ملخص للقائمة') : ft('shortPh', 'Listing summary')}
              dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        <div className="form-group admin-service-locale-desc">
          <label htmlFor={activeDescField}>
            {ft('fullDescription', 'Full description')}
            {contentLocale === 'ar' && (
              <span className="field-optional-label">{ft('optional', 'Optional')}</span>
            )}
          </label>
          <textarea
            id={activeDescField}
            rows={3}
            value={form[activeDescField] || ''}
            onChange={set(activeDescField)}
            disabled={disabled}
            placeholder={contentLocale === 'ar' ? ft('fullDescriptionPhAr', 'تفاصيل للنزلاء') : ft('fullDescriptionPh', 'Details for guests')}
            dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
          />
        </div>
      </HotelFormFieldGroup>

      <HotelFormFieldGroup title={ft('pricingSchedule', 'Pricing & schedule')}>
        <div className="admin-service-compact-grid admin-service-compact-grid--6">
          <div className="form-group">
            <label htmlFor="svc-pricing">{ft('pricing', 'Pricing')} {req}</label>
            <select id="svc-pricing" value={form.pricing_type} onChange={set('pricing_type')} disabled={disabled}>
              {pricingTypes.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="svc-price">
              {ft('price', 'Price')}
              {isFree ? '' : ` ${req}`}
            </label>
            <input
              id="svc-price"
              type="number"
              min="0"
              step="0.01"
              value={isFree ? '0' : form.price}
              onChange={set('price')}
              disabled={disabled || isFree}
              placeholder={isFree ? ft('free', 'Free') : '0.00'}
            />
            {formErrors.price && <span className="field-error">{formErrors.price}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="svc-currency">{ft('currency', 'Currency')}</label>
            <select id="svc-currency" value={form.currency} onChange={set('currency')} disabled={disabled || isFree}>
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="svc-duration">{ft('durationMin', 'Duration (min)')}</label>
            <input
              id="svc-duration"
              type="number"
              min="1"
              value={form.duration_minutes}
              onChange={set('duration_minutes')}
              disabled={disabled}
              placeholder={ft('durationPlaceholder', '—')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="svc-from">{ft('from', 'From')}</label>
            <input id="svc-from" type="time" value={form.available_from} onChange={set('available_from')} disabled={disabled} />
          </div>

          <div className="form-group">
            <label htmlFor="svc-until">{ft('until', 'Until')}</label>
            <input id="svc-until" type="time" value={form.available_until} onChange={set('available_until')} disabled={disabled} />
          </div>
        </div>
      </HotelFormFieldGroup>

      <HotelFormFieldGroup title={ft('options', 'Options')}>
        <div className="admin-service-checkboxes admin-service-checkboxes--stacked">
          <label className="checkbox-label admin-service-checkbox-card">
            <input
              type="checkbox"
              checked={form.advance_booking_required}
              onChange={set('advance_booking_required')}
              disabled={disabled}
            />
            <span>
              <strong>{ft('advanceBooking', 'Advance booking')}</strong>
            </span>
          </label>
          <label className="checkbox-label admin-service-checkbox-card">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={set('is_featured')}
              disabled={disabled}
            />
            <span>
              <strong>{ft('featured', 'Featured')}</strong>
            </span>
          </label>
          <label className="checkbox-label admin-service-checkbox-card">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={set('is_active')}
              disabled={disabled}
            />
            <span>
              <strong>{ft('active', 'Active')}</strong>
            </span>
          </label>
        </div>
      </HotelFormFieldGroup>
    </div>
  );
};

export default PropertyServiceFormFields;
