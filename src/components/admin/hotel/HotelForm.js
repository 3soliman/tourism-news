'use client';

import React, { memo, useCallback, useState, useMemo } from 'react';
import { Link } from '@/lib/router-compat';
import { EMPTY_HOTEL_FORM, STAR_OPTIONS, PROPERTY_TYPE_OPTIONS } from '../../../constants/hotelForm';
import { POLICY_TEMPLATES, POLICY_FIELDS } from '../../../constants/propertyPolicyTemplates';
import HotelFormFieldGroup from './HotelFormFieldGroup';
import LocationMapPicker from '@/components/maps/LocationMapPickerDynamic';
import PropertyImagesManager from './PropertyImagesManager';
import SearchableMultiSelect from '../SearchableMultiSelect';
import PropertyLocaleTabs from './PropertyLocaleTabs';
import OptionalFormSection from './OptionalFormSection';
import { countPropertyImages } from '../../../utils/propertyImages';
import { computePublishReadiness } from '../../../utils/propertyWizardReadiness';
import { getAmenityDisplayName } from '../../../utils/amenityDisplay';
import PropertyPreviewCard from '../property/PropertyPreviewCard';
import { FormSkeleton } from '../../shared/LoadingSkeletons';
import Icon from '../../icons/Icon';
import { useTranslation } from '../../../context/I18nContext';

const SOCIAL_MEDIA_FIELDS = [
  { field: 'facebook_url', labelKey: 'socialFacebook' },
  { field: 'instagram_url', labelKey: 'socialInstagram' },
  { field: 'tiktok_url', labelKey: 'socialTiktok' },
  { field: 'twitter_url', labelKey: 'socialTwitter' },
  { field: 'youtube_url', labelKey: 'socialYoutube' },
  { field: 'linkedin_url', labelKey: 'socialLinkedin' }
];

const HOTEL_POLICY_TYPES = new Set(['hotel', 'resort']);

const STEP_HEADER_KEYS = [
  null,
  { title: 'step1Title', sub: 'step1Sub', titleDefault: 'Basic identity', subDefault: 'Name, type, and short description' },
  { title: 'step2Title', sub: 'step2Sub', titleDefault: 'Location', subDefault: 'Country, city, address, map' },
  { title: 'step3Title', sub: 'step3Sub', titleDefault: 'Photos & video', subDefault: 'Gallery upload and tour link' },
  { title: 'step4Title', sub: 'step4Sub', titleDefault: 'Amenities', subDefault: 'Select property features' },
  { title: 'step5Title', sub: 'step5Sub', titleDefault: 'Contact', subDefault: 'Phone, email, and social links' },
  { title: 'step6Title', sub: 'step6Sub', titleDefault: 'Policies', subDefault: 'Check-in, cancellation, and house rules' },
  { title: 'step7Title', sub: 'step7Sub', titleDefault: 'Review & publish', subDefault: 'Preview, checklist, and save' }
];

function countFilled(values, fields) {
  return fields.filter((f) => String(values[f] || '').trim()).length;
}

function normalizeSlugInput(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const HotelForm = ({
  currentStep,
  totalSteps = 7,
  values,
  errors,
  onChange,
  onLocationPick,
  submitting,
  amenitiesCatalog = [],
  amenitiesLoading = false,
  amenitiesError = null,
  existingImages = [],
  pendingImages = [],
  deletedImageIds = [],
  onAddPropertyImageFiles,
  onRemoveExistingImage,
  onRemovePendingImage,
  onUpdateExistingImage,
  onUpdatePendingImage,
  onSetPropertyImageCover,
  onReorderPropertyImages,
  onInvalidPropertyImageFiles,
  onVideoUrlSave,
  onOpenQuickCreateAmenity,
  isOnboarding = false,
}) => {
  const { t, locale } = useTranslation();
  const [contentLocale, setContentLocale] = useState('en');
  const [policyLocale, setPolicyLocale] = useState('en');

  const ft = useCallback(
    (key, defaultText, vars) => t(`pages.addHotel.form.${key}`, defaultText, vars),
    [t]
  );
  const req = ft('requiredMark', '*');
  const propertyTypeOptions = useMemo(
    () =>
      PROPERTY_TYPE_OPTIONS.map((opt) => ({
        ...opt,
        label: ft(`propertyTypes.${opt.value}`, opt.label)
      })),
    [ft]
  );
  const stepHeader = STEP_HEADER_KEYS[currentStep] || STEP_HEADER_KEYS[1];
  const showHotelPolicies = HOTEL_POLICY_TYPES.has(values.property_type);

  const set = useCallback((field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange(field, value);
  }, [onChange]);

  const toggleAmenity = useCallback((id) => {
    const numId = Number(id);
    const ids = values.amenity_ids || [];
    const next = ids.includes(numId) ? ids.filter((x) => x !== numId) : [...ids, numId];
    onChange('amenity_ids', next);
  }, [values.amenity_ids, onChange]);

  const copyEnglishToArabic = useCallback(() => {
    onChange('name_ar', values.name || '');
    onChange('description_ar', values.description || '');
  }, [onChange, values.name, values.description]);

  const applyPolicyTemplate = useCallback((fieldKey, locale) => {
    const field = POLICY_FIELDS.find((f) => f.key === fieldKey || f.keyAr === fieldKey);
    if (!field) return;
    const text = POLICY_TEMPLATES[locale]?.[field.templateKey] || '';
    onChange(locale === 'ar' ? field.keyAr : field.key, text);
  }, [onChange]);

  const applyAllPolicyTemplates = useCallback((locale) => {
    POLICY_FIELDS.forEach((field) => {
      const text = POLICY_TEMPLATES[locale]?.[field.templateKey] || '';
      onChange(locale === 'ar' ? field.keyAr : field.key, text);
    });
  }, [onChange]);

  const photoCount = countPropertyImages(existingImages, pendingImages, deletedImageIds);
  const selectedAmenityIds = (values.amenity_ids || []).map(Number);

  const contactDetailsFilled = countFilled(values, ['phone', 'email', 'website']);
  const propertyContactsFilled = countFilled(values, ['primary_contact_person', 'contact_position', 'emergency_contact_number']);
  const socialFilled = countFilled(values, SOCIAL_MEDIA_FIELDS.map((s) => s.field));
  const checkInFilled = countFilled(values, ['check_in_time', 'check_out_time']);
  const hotelPolicyFilled = countFilled(values, POLICY_FIELDS.map((f) => f.key));

  const activeNameField = contentLocale === 'ar' ? 'name_ar' : 'name';
  const activeDescField = contentLocale === 'ar' ? 'description_ar' : 'description';
  const activeName = values[activeNameField] || '';
  const activeDesc = values[activeDescField] || '';

  return (
    <form className="hotel-form" onSubmit={(e) => e.preventDefault()} noValidate>
      <header className="hotel-step-header">
        <span className="hotel-step-badge">{ft('stepBadge', 'Step {{step}} of {{total}}', { step: currentStep, total: totalSteps })}</span>
        <h3>{ft(stepHeader.title, stepHeader.titleDefault)}</h3>
        <p>{ft(stepHeader.sub, stepHeader.subDefault)}</p>
        {(currentStep === 5 || currentStep === 6) && isOnboarding && (
          <p className="hotel-step-optional-hint">{ft('optionalStepHint', 'You can publish now and complete this section later.')}</p>
        )}
      </header>

      {/* Step 1: Basic identity */}
      {currentStep === 1 && (
        <div className="hotel-step-panel">
          <HotelFormFieldGroup title={ft('propertyIdentity', 'Property identity')}>
            <PropertyLocaleTabs
              activeLocale={contentLocale}
              onLocaleChange={setContentLocale}
              onCopyFromEnglish={copyEnglishToArabic}
              showCopyAction
              copyLabel={ft('copyFromEnglish', 'Copy from English')}
            />
            {contentLocale === 'ar' && (
              <p className="hotel-locale-hint">{ft('localeFieldsHint', 'Arabic name and description are saved with the property.')}</p>
            )}
            <div className="hotel-form-grid">
              <div className="form-group hotel-form-span-2">
                <label htmlFor={activeNameField}>
                  {ft('propertyName', 'Property name')} {contentLocale === 'en' ? req : ''}
                </label>
                <input
                  id={activeNameField}
                  value={activeName}
                  onChange={set(activeNameField)}
                  disabled={submitting}
                  placeholder={contentLocale === 'ar' ? ft('propertyNamePhAr', 'مثال: فندق المحيط') : ft('propertyNamePh', 'e.g. Almohit View Resort')}
                  dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
                />
                {contentLocale === 'en' && errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="property_type">{ft('propertyType', 'Property type')} {req}</label>
                <select id="property_type" value={values.property_type} onChange={set('property_type')} disabled={submitting}>
                  {propertyTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.property_type && <span className="field-error">{errors.property_type}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="stars">{ft('starRating', 'Star rating')} {req}</label>
                <select id="stars" value={values.stars} onChange={set('stars')} disabled={submitting}>
                  {STAR_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {ft(n === 1 ? 'starOne' : 'starMany', n === 1 ? '{{n}} star' : '{{n}} stars', { n })}
                    </option>
                  ))}
                </select>
                {errors.stars && <span className="field-error">{errors.stars}</span>}
              </div>
              <div className="form-group hotel-form-span-3 hotel-form-description-group">
                <label htmlFor={activeDescField}>
                  {ft('description', 'Description')}
                  <span className="hotel-form-char-count">{ft('charCount', '{{count}} / {{max}}', { count: activeDesc.length, max: 300 })}</span>
                </label>
                <textarea
                  id={activeDescField}
                  rows={5}
                  value={activeDesc}
                  onChange={(e) => {
                    if (e.target.value.length <= 300) onChange(activeDescField, e.target.value);
                  }}
                  disabled={submitting}
                  placeholder={contentLocale === 'ar' ? ft('descriptionPhAr', 'وصف مختصر عن العقار...') : ft('descriptionPh', 'Describe your property — highlight unique features, atmosphere, and what guests can expect.')}
                  maxLength={300}
                  dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
                />
                <span className="hotel-form-field-hint">{ft('descriptionHint', 'A compelling description helps guests choose your property. 300 characters max.')}</span>
              </div>
              <div className="form-group hotel-form-span-2">
                <label htmlFor="subdomain">{ft('publicSubdomain', 'Public subdomain')}</label>
                <input
                  id="subdomain"
                  value={values.subdomain || ''}
                  onChange={(e) => onChange('subdomain', e.target.value.toLowerCase())}
                  disabled={submitting}
                  placeholder={ft('subdomainPh', 'e.g. hilton')}
                  autoCapitalize="none"
                />
                <small>{values.subdomain ? `https://${values.subdomain}.${process.env.NEXT_PUBLIC_PUBLIC_BASE_DOMAIN || 'almohit.com'}` : ft('subdomainHint', 'Unique hotel website address.')}</small>
                {errors.subdomain && <span className="field-error">{errors.subdomain}</span>}
              </div>
            </div>
          </HotelFormFieldGroup>

          <HotelFormFieldGroup
            title={ft('seoSectionTitle', 'SEO')}
            hint={ft('seoSectionHint', 'Slug and keywords are saved with the property for SEO.')}
          >
            <div className="hotel-form-grid hotel-form-grid--pair">
              <div className="form-group">
                <label htmlFor="slug">
                  {ft('publicSlug', 'URL slug')}
                  <span className="field-optional-label">{ft('optionalBadge', 'Optional')}</span>
                </label>
                <input
                  id="slug"
                  value={values.slug || ''}
                  onChange={(e) => onChange('slug', normalizeSlugInput(e.target.value))}
                  disabled={submitting}
                  placeholder={ft('slugPh', 'e.g. ocean-view-resort-dubai')}
                  autoCapitalize="none"
                  dir="ltr"
                />
                <small className="hotel-form-field-hint">
                  {values.slug
                    ? ft('slugPreview', '/hotel/{{slug}}', { slug: values.slug })
                    : ft('slugHint', 'Lowercase letters, numbers, and hyphens only.')}
                </small>
                {errors.slug && <span className="field-error">{errors.slug}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="seo_keywords">
                  {ft('seoKeywords', 'Keywords')}
                  <span className="field-optional-label">{ft('optionalBadge', 'Optional')}</span>
                </label>
                <input
                  id="seo_keywords"
                  value={values.seo_keywords || ''}
                  onChange={set('seo_keywords')}
                  disabled={submitting}
                  placeholder={ft('seoKeywordsPh', 'luxury hotel, dubai marina, family stay')}
                />
                <small className="hotel-form-field-hint">{ft('seoKeywordsHint', 'Comma-separated search terms for SEO.')}</small>
              </div>
            </div>
          </HotelFormFieldGroup>
        </div>
      )}

      {/* Step 2: Location */}
      {currentStep === 2 && (
        <div className="hotel-step-panel">
          <div className="hotel-location-layout">
            <HotelFormFieldGroup title={ft('addressDetails', 'Address details')} className="hotel-location-layout__address hotel-form-field-group--stretch">
              <div className="hotel-form-grid">
                <div className="form-group">
                  <label htmlFor="country">{ft('country', 'Country')} {req}</label>
                  <input id="country" value={values.country} onChange={set('country')} disabled={submitting} placeholder={ft('countryPh', 'e.g. Malaysia')} />
                  {errors.country && <span className="field-error">{errors.country}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="city">{ft('city', 'City')} {req}</label>
                  <input id="city" value={values.city} onChange={set('city')} disabled={submitting} placeholder={ft('cityPh', 'e.g. Kuala Lumpur')} />
                  {errors.city && <span className="field-error">{errors.city}</span>}
                </div>
                <div className="form-group hotel-form-full">
                  <label htmlFor="address">{ft('streetAddress', 'Street address')} {req}</label>
                  <input id="address" value={values.address} onChange={set('address')} disabled={submitting} placeholder={ft('streetAddressPh', 'Street, district, postal code...')} />
                  {errors.address && <span className="field-error">{errors.address}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="latitude">{ft('latitude', 'Latitude')}</label>
                  <input id="latitude" value={values.latitude} onChange={set('latitude')} disabled={submitting} placeholder={ft('coordsAuto', 'Auto from map')} />
                </div>
                <div className="form-group">
                  <label htmlFor="longitude">{ft('longitude', 'Longitude')}</label>
                  <input id="longitude" value={values.longitude} onChange={set('longitude')} disabled={submitting} placeholder={ft('coordsAuto', 'Auto from map')} />
                </div>
              </div>
            </HotelFormFieldGroup>
            <HotelFormFieldGroup title={ft('mapLocation', 'Map location')} hint={ft('mapHint', 'Search, click the map, or use your current location.')} className="hotel-location-layout__map hotel-form-field-group--map">
              <LocationMapPicker values={values} disabled={submitting} onLocationPick={onLocationPick} fillLayout />
            </HotelFormFieldGroup>
          </div>
        </div>
      )}

      {/* Step 3: Photos & video */}
      {currentStep === 3 && (
        <>
          <HotelFormFieldGroup title={ft('propertyPhotos', 'Property photos')} hint={ft('propertyPhotosHint', 'Upload gallery photos. Mark one as the cover — it appears in search results.')}>
            <PropertyImagesManager
              existingImages={existingImages}
              pendingImages={pendingImages}
              deletedImageIds={deletedImageIds}
              onAddFiles={onAddPropertyImageFiles}
              onRemoveExisting={onRemoveExistingImage}
              onRemovePending={onRemovePendingImage}
              onUpdateExisting={onUpdateExistingImage}
              onUpdatePending={onUpdatePendingImage}
              onSetCover={onSetPropertyImageCover}
              onReorderImages={onReorderPropertyImages}
              onInvalidFiles={onInvalidPropertyImageFiles}
              submitting={submitting}
              error={errors.main_image || errors.cover_image}
              hint=""
            />
          </HotelFormFieldGroup>

          <HotelFormFieldGroup
            title={ft('propertyVideos', 'Property video')}
            hint={ft('propertyVideosHint', 'Add a YouTube or Vimeo link for a property tour.')}
            className="property-videos-field-group"
          >
            <div className="form-group property-video-url-field">
              <label htmlFor="video_url">{ft('videoLink', 'YouTube / Vimeo link')}</label>
              <div className="property-video-url-row">
                <input
                  id="video_url"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  value={values.video_url || ''}
                  onChange={set('video_url')}
                  onBlur={() => onVideoUrlSave?.(values.video_url || '')}
                  disabled={submitting}
                  placeholder={ft('videoLinkPh', 'https://www.youtube.com/watch?v=...')}
                />
                {values.video_url ? (
                  <button
                    type="button"
                    className="property-video-url-clear"
                    disabled={submitting}
                    onClick={() => {
                      onChange('video_url', '');
                      onVideoUrlSave?.('');
                    }}
                  >
                    {ft('clearVideoLink', 'Clear link')}
                  </button>
                ) : null}
              </div>
              {errors.video_url && <span className="field-error">{errors.video_url}</span>}
              <p className="field-hint">{ft('videoLinkHint', 'Optional. Paste a public YouTube or Vimeo URL.')}</p>
            </div>
          </HotelFormFieldGroup>
        </>
      )}

      {/* Step 4: Amenities */}
      {currentStep === 4 && (
        <div className="hotel-step-panel hotel-amenities-step">
          <HotelFormFieldGroup title={ft('propertyAmenities', 'Property amenities')} hint={<>{ft('propertyAmenitiesHint', 'Select amenities — manage them in')} <Link to="/admin/amenities" className="admin-inline-link">{ft('amenitiesManager', 'Amenities manager')}</Link></>}>
            <div className="property-workspace-section-actions">
              <button type="button" className="admin-btn admin-btn-secondary link-with-icon" onClick={onOpenQuickCreateAmenity} disabled={submitting}>
                <Icon name="plus" size={16} />
                <span>{ft('quickCreateAmenity', 'Quick create amenity')}</span>
              </button>
            </div>
            {errors.amenities && <p className="field-error">{errors.amenities}</p>}
            {amenitiesLoading && <FormSkeleton fields={3} message={ft('loadingAmenities', 'Loading amenities...')} />}
            {amenitiesError && !amenitiesLoading && (
              <p className="hotel-amenities-error-text">{amenitiesError}</p>
            )}
            {!amenitiesLoading && !amenitiesError && amenitiesCatalog.length === 0 && (
              <p className="hotel-amenities-empty-text">
                {ft('noAmenitiesYet', 'No amenities yet.')}{' '}
                <Link to="/admin/amenities" className="admin-inline-link">{ft('createAmenities', 'Create amenities')}</Link>
              </p>
            )}
            {!amenitiesLoading && amenitiesCatalog.length > 0 && (
              <SearchableMultiSelect
                options={amenitiesCatalog}
                selectedIds={selectedAmenityIds}
                onToggle={(id) => toggleAmenity(id)}
                getOptionId={(a) => Number(a.id)}
                getOptionLabel={(a) => getAmenityDisplayName(a, locale)}
                renderOptionIcon={(a) =>
                  a.iconUrl ? <img src={a.iconUrl} alt="" className="sms-option-icon" loading="lazy" decoding="async" /> : null
                }
                placeholder={ft('searchAmenitiesPh', 'Search amenities…')}
                disabled={submitting}
                maxVisible={10}
                emptyText={ft('noAmenitiesMatch', 'No amenities match your search.')}
                hintText={ft('amenitiesPickHint', 'pick multiple from the list')}
              />
            )}
          </HotelFormFieldGroup>
        </div>
      )}

      {/* Step 5: Contact & social */}
      {currentStep === 5 && (
        <div className="hotel-step-panel">
          <OptionalFormSection
            title={ft('contactDetails', 'Contact details')}
            subtitle={ft('contactDetailsSub', 'Phone, email, and website')}
            badge={ft('optionalBadge', 'Optional')}
            fieldCount={contactDetailsFilled}
            isComplete={contactDetailsFilled >= 2}
            defaultOpen={contactDetailsFilled > 0 || (!propertyContactsFilled && !socialFilled)}
          >
            <div className="hotel-form-grid">
              <div className="form-group">
                <label htmlFor="phone">{ft('phone', 'Phone')}</label>
                <input id="phone" type="tel" value={values.phone} onChange={set('phone')} disabled={submitting} placeholder={ft('phonePh', '777777777')} />
              </div>
              <div className="form-group">
                <label htmlFor="email">{ft('email', 'Email')}</label>
                <input id="email" type="email" value={values.email} onChange={set('email')} disabled={submitting} placeholder={ft('emailPh', 'contact@property.com')} />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="website">{ft('website', 'Website')}</label>
                <input id="website" type="url" value={values.website} onChange={set('website')} disabled={submitting} placeholder={ft('websitePh', 'https://...')} />
                {errors.website && <span className="field-error">{errors.website}</span>}
              </div>
            </div>
          </OptionalFormSection>

          <OptionalFormSection
            title={ft('propertyContacts', 'Property contacts')}
            subtitle={ft('propertyContactsSub', 'Primary contact and emergency number')}
            badge={ft('optionalBadge', 'Optional')}
            fieldCount={propertyContactsFilled}
            isComplete={Boolean(values.primary_contact_person?.trim())}
            defaultOpen={propertyContactsFilled > 0}
          >
            <div className="hotel-form-grid hotel-form-grid--stack">
              <div className="form-group">
                <label htmlFor="primary_contact_person">{ft('primaryContact', 'Primary contact')}</label>
                <input id="primary_contact_person" value={values.primary_contact_person || ''} onChange={set('primary_contact_person')} disabled={submitting} placeholder={ft('primaryContactPh', 'e.g. John Doe')} />
              </div>
              <div className="form-group">
                <label htmlFor="contact_position">{ft('contactPosition', 'Position')}</label>
                <input id="contact_position" value={values.contact_position || ''} onChange={set('contact_position')} disabled={submitting} placeholder={ft('contactPositionPh', 'e.g. General Manager')} />
              </div>
              <div className="form-group">
                <label htmlFor="emergency_contact_number">{ft('emergencyContact', 'Emergency contact')}</label>
                <input id="emergency_contact_number" type="tel" value={values.emergency_contact_number || ''} onChange={set('emergency_contact_number')} disabled={submitting} placeholder={ft('emergencyContactPh', 'e.g. +967777777777')} />
              </div>
            </div>
          </OptionalFormSection>

          <OptionalFormSection
            title={ft('socialMedia', 'Social media links')}
            subtitle={ft('socialMediaHint', 'Optional — fill in only the platforms you use.')}
            badge={ft('optionalBadge', 'Optional')}
            fieldCount={socialFilled}
            isComplete={socialFilled > 0}
            defaultOpen={socialFilled > 0}
          >
            <div className="hotel-form-grid hotel-form-grid--pair">
              {SOCIAL_MEDIA_FIELDS.map(({ field, labelKey }) => (
                <div className="form-group" key={field}>
                  <label htmlFor={field}>{ft(labelKey, field.replace('_url', ''))}</label>
                  <input id={field} type="url" value={values[field] || ''} onChange={set(field)} disabled={submitting} placeholder={ft('socialPh', 'https://...')} />
                </div>
              ))}
            </div>
          </OptionalFormSection>
        </div>
      )}

      {/* Step 6: Policies */}
      {currentStep === 6 && (
        <div className="hotel-step-panel">
          {!showHotelPolicies && (
            <p className="hotel-step-optional-hint">{ft('policiesTypeHint', 'Full hotel policies are shown for hotels and resorts. Add basic check-in times below.')}</p>
          )}

          <OptionalFormSection
            title={ft('checkInOut', 'Check-in & check-out')}
            subtitle={ft('checkInOutSub', 'Arrival and departure times for guests')}
            badge={ft('recommendedBadge', 'Recommended')}
            fieldCount={checkInFilled}
            isComplete={checkInFilled === 2}
            defaultOpen={checkInFilled > 0 || !showHotelPolicies}
          >
            <div className="hotel-form-grid hotel-form-grid--pair">
              <div className="form-group">
                <label htmlFor="check_in_time">{ft('checkInTime', 'Check-in time')}</label>
                <input id="check_in_time" type="time" value={values.check_in_time} onChange={set('check_in_time')} disabled={submitting} />
                {errors.check_in_time && <span className="field-error">{errors.check_in_time}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="check_out_time">{ft('checkOutTime', 'Check-out time')}</label>
                <input id="check_out_time" type="time" value={values.check_out_time} onChange={set('check_out_time')} disabled={submitting} />
                {errors.check_out_time && <span className="field-error">{errors.check_out_time}</span>}
              </div>
            </div>
          </OptionalFormSection>

          {showHotelPolicies && (
            <OptionalFormSection
              title={ft('hotelPolicies', 'Hotel policies')}
              subtitle={ft('hotelPoliciesSub', 'Cancellation, children, pets, and house rules')}
              badge={ft('recommendedBadge', 'Recommended')}
              fieldCount={hotelPolicyFilled}
              isComplete={hotelPolicyFilled >= 3}
              defaultOpen={hotelPolicyFilled > 0}
            >
              <PropertyLocaleTabs
                activeLocale={policyLocale}
                onLocaleChange={setPolicyLocale}
                onCopyFromEnglish={() => {
                  POLICY_FIELDS.forEach((field) => {
                    onChange(field.keyAr, values[field.key] || '');
                  });
                }}
                showCopyAction
                copyLabel={ft('copyFromEnglish', 'Copy from English')}
              />
              {policyLocale === 'ar' ? (
                <p className="hotel-locale-hint">{ft('localePoliciesHint', 'Arabic policies are saved with the property and shown to Arabic guests.')}</p>
              ) : (
                <p className="hotel-locale-hint">{ft('localePoliciesHintEn', 'English policies are saved and shown to guests.')}</p>
              )}
              <p className="hotel-locale-hint hotel-policy-fill-all">
                <button
                  type="button"
                  className="hotel-policy-template-btn"
                  onClick={() => applyAllPolicyTemplates(policyLocale)}
                  disabled={submitting}
                >
                  {ft('useDefaultPolicies', 'Use default policies')}
                </button>
              </p>

              <div className="hotel-form-grid hotel-form-grid--pair">
                {POLICY_FIELDS.map((field) => {
                  const activeKey = policyLocale === 'ar' ? field.keyAr : field.key;
                  return (
                    <div className="form-group" key={activeKey}>
                      <div className="hotel-policy-field__head">
                        <label htmlFor={activeKey}>{ft(field.labelKey, field.key)}</label>
                        <button
                          type="button"
                          className="hotel-policy-template-btn"
                          onClick={() => applyPolicyTemplate(activeKey, policyLocale)}
                          disabled={submitting}
                        >
                          {ft('useTemplate', 'Use template')}
                        </button>
                      </div>
                      <textarea
                        id={activeKey}
                        rows={2}
                        value={values[activeKey] || ''}
                        onChange={set(activeKey)}
                        disabled={submitting}
                        placeholder={ft(`${field.labelKey}Ph`, POLICY_TEMPLATES[policyLocale]?.[field.templateKey] || '')}
                        dir={policyLocale === 'ar' ? 'rtl' : 'ltr'}
                      />
                      {field.key === 'cancellation_policy' && errors.cancellation_policy && (
                        <span className="field-error">{errors.cancellation_policy}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </OptionalFormSection>
          )}
        </div>
      )}

      {/* Step 7: Review & publish */}
      {currentStep === 7 && (
        <div className="hotel-step-panel property-publishing-section">
          <HotelFormFieldGroup title={ft('propertyPreview', 'Property Preview')} hint={ft('propertyPreviewHint', 'This is how the property will appear to travelers.')}>
            <PropertyPreviewCard
              values={values}
              amenitiesCatalog={amenitiesCatalog}
              existingImages={existingImages}
              pendingImages={pendingImages}
              deletedImageIds={deletedImageIds}
            />
          </HotelFormFieldGroup>

          <HotelFormFieldGroup title={ft('readinessChecklist', 'Wizard progress')} hint={ft('readinessChecklistHint', 'Required items (steps 1–4) must be complete to publish.')}>
            {(() => {
              const { items, requiredDone, requiredTotal, percent } = computePublishReadiness(
                values,
                photoCount,
                selectedAmenityIds.length
              );
              return (
                <>
                  <div className="readiness-score">
                    <div className="readiness-score__header">
                      <span className="readiness-score__label">{ft('publishRequirements', 'Publish requirements')}</span>
                      <span className={`readiness-score__value${percent === 100 ? ' is-perfect' : ''}`}>
                        {requiredDone}/{requiredTotal}
                      </span>
                    </div>
                    <div className="readiness-score__bar">
                      <div className="readiness-score__fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <div className="onboarding-readiness-list onboarding-readiness-list--wizard">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`onboarding-readiness-item${item.done ? ' is-done' : ''}${!item.required ? ' is-optional' : ''}`}
                      >
                        <span className="onboarding-readiness-item__step">{item.id}</span>
                        <Icon name={item.done ? 'check' : 'x'} size={16} />
                        <span className="onboarding-readiness-item__label">{ft(item.labelKey, item.labelDefault)}</span>
                        {!item.required && (
                          <span className="onboarding-readiness-item__badge">{ft('optionalBadge', 'Optional')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </HotelFormFieldGroup>

          <div className="hotel-form-actions" style={{ marginTop: '24px' }}>
            <p className="admin-hint">{ft('publishHint', 'You can always add more details in the property workspace after publishing.')}</p>
            <p className="admin-hint">
              {ft('publishRoomsHint', 'Add room types later from the')}{' '}
              <Link to="/admin/rooms" className="admin-inline-link">{ft('roomsManager', 'Rooms page')}</Link>.
            </p>
          </div>
        </div>
      )}
    </form>
  );
};

export { EMPTY_HOTEL_FORM };
export default memo(HotelForm);
