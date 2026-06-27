'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { fetchAdminProperties } from '../../api/propertiesApi';
import {
  fetchRoomTypes,
  fetchRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  mapRoomTypeToForm,
  formatRoomTypePrice
} from '../../api/roomTypesApi';
import { syncRoomTypeImages } from '../../api/roomTypeImagesApi';
import PropertyImagesManager from '../../components/admin/hotel/PropertyImagesManager';
import PropertyLocaleTabs from '../../components/admin/hotel/PropertyLocaleTabs';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import {
  mapApiImagesToExisting,
  createPendingFromFile,
  revokePendingPreviews,
  setCoverImage,
  autoCoverIfNeeded
} from '../../utils/propertyImages';
import {
  EMPTY_ROOM_TYPE_FORM,
  EMPTY_SEASON_PRICE,
  ROOM_CURRENCY_OPTIONS,
  BED_TYPE_OPTIONS,
  UNIT_TYPE_OPTIONS,
  unitTypeLabel
} from '../../constants/roomTypeForm';
import Icon from '../../components/icons/Icon';
import AdminIconButton from '../../components/admin/AdminIconButton';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import { useTranslation } from '../../context/I18nContext';
import { filterAdminRoomTypes } from '../../utils/adminListFilters';

const AdminRoomsPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialPropertyFilter = searchParams.get('property') || '';
  const [roomTypes, setRoomTypes] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filterPropertyId, setFilterPropertyId] = useState(initialPropertyFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_ROOM_TYPE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [imageError, setImageError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contentLocale, setContentLocale] = useState('en');
  const notify = useNotifications();

  const loadProperties = useCallback(async () => {
    setProperties(await fetchAdminProperties());
  }, []);

  const loadRoomTypes = useCallback(async (propertyId = filterPropertyId) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchRoomTypes({ propertyId: propertyId || undefined });
      setRoomTypes(list);
    } catch (err) {
      setError(err.message || t('pages.rooms.errorLoad', 'Failed to load room types'));
      setRoomTypes([]);
    } finally {
      setLoading(false);
    }
  }, [filterPropertyId, t]);

  const load = useCallback(async () => {
    try {
      await loadProperties();
    } catch (err) {
      setError(err.message || t('pages.rooms.errorProperties', 'Failed to load properties'));
    }
    await loadRoomTypes();
  }, [loadProperties, loadRoomTypes, t]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = useCallback(() => {
    setContentLocale('en');
    setPendingImages((prev) => {
      revokePendingPreviews(prev);
      return [];
    });
    setExistingImages([]);
    setDeletedImageIds([]);
    setImageError(null);
    setForm(EMPTY_ROOM_TYPE_FORM);
    setEditingId(null);
    setFormErrors({});
    setSubmitError(null);
  }, []);

  const openCreateForm = () => {
    resetForm();
    if (filterPropertyId) {
      setForm((prev) => ({ ...prev, property: filterPropertyId }));
    }
    setShowForm(true);
  };

  const openEditForm = async (item) => {
    resetForm();
    setShowForm(true);
    setLoadingEditId(item.id);
    setSubmitError(null);
    try {
      const fresh = await fetchRoomTypeById(item.id);
      setEditingId(fresh.id);
      setForm(mapRoomTypeToForm(fresh));
      setExistingImages(mapApiImagesToExisting(fresh.images || []));
      setPendingImages([]);
      setDeletedImageIds([]);
      setImageError(null);
    } catch (err) {
      setSubmitError(formatApiErrors(err.data) || err.message || t('pages.rooms.errorRoomType', 'Failed to load room type'));
      setShowForm(false);
    } finally {
      setLoadingEditId(null);
    }
  };

  const closeForm = useCallback(() => {
    resetForm();
    setShowForm(false);
  }, [resetForm]);

  useEffect(() => {
    if (!showForm) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting && !loadingEditId) {
        closeForm();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [showForm, submitting, loadingEditId, closeForm]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  };

  const copyEnglishToArabic = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      name_ar: prev.name || '',
      description_ar: prev.description || ''
    }));
  }, []);

  const updatePriceRow = (index, key, value) => {
    setForm((prev) => {
      const prices = [...(prev.prices || [])];
      prices[index] = { ...prices[index], [key]: value };
      return { ...prev, prices };
    });
  };

  const addPriceRow = () => {
    setForm((prev) => ({
      ...prev,
      prices: [...(prev.prices || []), { ...EMPTY_SEASON_PRICE }]
    }));
  };

  const removePriceRow = (index) => {
    setForm((prev) => ({
      ...prev,
      prices: (prev.prices || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddImageFiles = (files) => {
    if (!files.length) return;
    const added = files.map((file) => createPendingFromFile(file, { isCover: false }));
    setPendingImages((prev) => {
      const next = [...prev, ...added];
      const auto = autoCoverIfNeeded(existingImages, next, deletedImageIds);
      return auto.pendingImages;
    });
    setImageError(null);
    notify.success(
      t('pages.rooms.imagesUploaded', '{{count}} image(s) uploaded', { count: files.length }),
      { message: t('pages.rooms.imagesUploadedHint', 'Room gallery updated. Save the room type to persist changes.') }
    );
  };

  const handleInvalidImageFiles = (count) => {
    notify.warning(t('pages.rooms.imagesRejected', 'Some images were not uploaded'), {
      message: t('pages.rooms.imagesRejectedHint', '{{count}} file(s) must be JPG, PNG, or WEBP.', { count })
    });
  };

  const handleRemoveExistingImage = (imageId) => {
    setDeletedImageIds((prev) => (prev.includes(imageId) ? prev : [...prev, imageId]));
    setImageError(null);
  };

  const handleRemovePendingImage = (localId) => {
    setPendingImages((prev) => {
      const target = prev.find((img) => img.localId === localId);
      if (target?.preview?.startsWith('blob:')) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.localId !== localId);
    });
    setImageError(null);
  };

  const handleUpdateExistingImage = (imageId, updates) => {
    setExistingImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, ...updates } : img))
    );
  };

  const handleUpdatePendingImage = (localId, updates) => {
    setPendingImages((prev) =>
      prev.map((img) => (img.localId === localId ? { ...img, ...updates } : img))
    );
  };

  const handleSetImageCover = (key, type) => {
    const next = setCoverImage(existingImages, pendingImages, key, type);
    setExistingImages(next.existingImages);
    setPendingImages(next.pendingImages);
    setImageError(null);
  };

  const validate = () => {
    const next = {};
    if (!form.property) next.property = t('pages.rooms.propertyRequired', 'Property is required');
    if (!form.name.trim()) next.name = t('pages.rooms.nameRequired', 'Name is required');
    if (String(form.base_price).trim() && Number(form.base_price) < 0) {
      next.base_price = t('pages.rooms.priceNegative', 'Base price cannot be negative');
    }
    if (!form.max_adults || Number(form.max_adults) < 1) {
      next.max_adults = t('pages.rooms.adultsRequired', 'At least 1 adult required');
    }
    if (!form.total_units || Number(form.total_units) < 1) {
      next.total_units = t('pages.rooms.unitsRequired', 'At least 1 unit required');
    }
    if (!form.bed_type) {
      next.bed_type = t('pages.rooms.bedTypeRequired', 'Bed type is required');
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = editingId
        ? await updateRoomType(editingId, form)
        : await createRoomType(form);

      await syncRoomTypeImages(saved.id, {
        existingImages,
        pendingImages,
        deletedImageIds
      });

      closeForm();
      await loadRoomTypes();
      notify.success(
        editingId
          ? t('pages.rooms.updateSuccess', 'Room type updated successfully')
          : t('pages.rooms.createSuccess', 'Room type created successfully'),
        { message: saved.name }
      );
    } catch (err) {
      const fieldErrors = err.data && typeof err.data === 'object' ? err.data : null;
      if (fieldErrors && !fieldErrors.detail) {
        const mapped = {};
        Object.entries(fieldErrors).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFormErrors(mapped);
      }
      const message = formatApiErrors(err.data) || err.message;
      setSubmitError(message);
      notify.error(
        editingId
          ? t('pages.rooms.updateError', 'Failed to update room type')
          : t('pages.rooms.createError', 'Failed to create room type'),
        { message }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item = deleteTarget) => {
    if (!item) return;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await deleteRoomType(item.id);
      if (editingId === item.id) closeForm();
      await loadRoomTypes();
      notify.success(t('pages.rooms.deleteSuccess', 'Room type deleted successfully'), { message: item.name });
      setDeleteTarget(null);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setDeleteError(message);
      notify.error(t('pages.rooms.deleteError', 'Failed to delete room type'), { message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = async (e) => {
    const value = e.target.value;
    setFilterPropertyId(value);
    await loadRoomTypes(value);
  };

  const propertyName = (id) => properties.find((p) => p.id === String(id))?.name || (id ? `#${id}` : t('common.emDash', '—'));
  const displayProperty = (item) => item.propertyName || propertyName(item.property);

  const filteredRoomTypes = useMemo(() => {
    const resolvePropertyName = (id) =>
      properties.find((p) => p.id === String(id))?.name || (id ? `#${id}` : '');
    return filterAdminRoomTypes(roomTypes, searchQuery, { resolvePropertyName });
  }, [roomTypes, searchQuery, properties]);

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.rooms.title', 'Room types')}</h2>
          <p>{t('pages.rooms.subtitle', 'Manage room types, capacity, base pricing, and seasonal rates per property')}</p>
        </div>
        <div className="admin-header-actions">
          <AdminIconButton
            icon="refresh-cw"
            label={t('common.refresh', 'Refresh')}
            onClick={load}
            disabled={loading}
            loading={loading}
          />
          <button
            type="button"
            className="admin-btn admin-btn-primary link-with-icon"
            onClick={openCreateForm}
            disabled={properties.length === 0 || showForm}
          >
            <Icon name="plus" size={16} />
            <span>{t('pages.rooms.addRoomType', 'Add room type')}</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="admin-alert admin-alert-error">
          <strong>{t('pages.rooms.deleteError', 'Failed to delete room type')}</strong>
          <pre>{deleteError}</pre>
        </div>
      )}

      <section className="admin-panel-card admin-service-filter-bar">
        <div className="form-group">
          <label htmlFor="filter-room-property">{t('pages.rooms.filterProperty', 'Filter by property')}</label>
          <select
            id="filter-room-property"
            value={filterPropertyId}
            onChange={(e) => {
              handleFilterChange(e);
              setSearchQuery('');
            }}
          >
            <option value="">{t('pages.rooms.allProperties', 'All properties')}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="filter-room-search">{t('common.search', 'Search')}</label>
          <div className="admin-search-field">
            <Icon name="search" size={16} />
            <input
              id="filter-room-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('pages.rooms.searchPlaceholder', 'Room name, property, type, or ID')}
              disabled={loading}
            />
          </div>
        </div>
      </section>

      {showForm && (
        <div
          className="admin-modal-overlay"
          onClick={submitting || loadingEditId ? undefined : closeForm}
          role="presentation"
        >
          <div
            className="admin-modal admin-modal--room-type"
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-type-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="admin-modal__head">
              <div>
                <h3 id="room-type-modal-title">
                  {editingId
                    ? t('pages.rooms.editTitle', 'Edit room type #{{id}}', { id: editingId })
                    : t('pages.rooms.addTitle', 'Add room type')}
                </h3>
              </div>
              <button
                type="button"
                className="admin-modal__close"
                onClick={closeForm}
                disabled={submitting || !!loadingEditId}
                aria-label={t('common.close', 'Close')}
              >
                <Icon name="x" size={18} />
              </button>
            </header>

            <div className="admin-modal__body">
              {loadingEditId && <ApiLoading message={t('pages.rooms.loadingForm', 'Loading room type...')} variant="form" />}
              {submitError && (
                <div className="admin-alert admin-alert-error">
                  <pre>{submitError}</pre>
                </div>
              )}
              <form onSubmit={handleSubmit} className="admin-service-form admin-room-type-form" noValidate>
                <fieldset disabled={submitting || !!loadingEditId}>
              <section className="admin-service-form-section">
                <h4 className="admin-service-form-section-title">{t('pages.rooms.basicInfo', 'Basic information')}</h4>
                <div className="admin-service-form-grid admin-room-type-form__top">
                  <div className="form-group">
                    <label htmlFor="rt-property">{t('common.property', 'Property')} {t('common.required', '*')}</label>
                    <select id="rt-property" value={form.property} onChange={(e) => updateField('property', e.target.value)}>
                      <option value="">{t('pages.rooms.selectProperty', 'Select property')}</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {formErrors.property && <span className="field-error">{formErrors.property}</span>}
                  </div>
                  <div className="form-group admin-room-type-form__locale">
                    <PropertyLocaleTabs
                      activeLocale={contentLocale}
                      onLocaleChange={setContentLocale}
                      onCopyFromEnglish={copyEnglishToArabic}
                      showCopyAction
                      copyLabel={t('pages.addHotel.form.copyFromEnglish', 'Copy from English')}
                    />
                  </div>
                </div>

                <div className="admin-service-form-grid admin-room-type-form__locale-fields">
                  <div className="form-group">
                    <label htmlFor={contentLocale === 'ar' ? 'rt-name-ar' : 'rt-name'}>
                      {t('pages.rooms.roomName', 'Room name')}
                      {contentLocale === 'en' ? ` ${t('common.required', '*')}` : (
                        <span className="field-optional-label">{t('pages.rooms.optional', 'Optional')}</span>
                      )}
                    </label>
                    <input
                      id={contentLocale === 'ar' ? 'rt-name-ar' : 'rt-name'}
                      value={contentLocale === 'ar' ? (form.name_ar || '') : form.name}
                      onChange={(e) => updateField(contentLocale === 'ar' ? 'name_ar' : 'name', e.target.value)}
                      placeholder={
                        contentLocale === 'ar'
                          ? t('pages.rooms.roomNamePhAr', 'مثال: غرفة ديلوكس كينغ')
                          : t('pages.rooms.roomNamePlaceholder', 'e.g. Deluxe King Room')
                      }
                      dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
                    />
                    {contentLocale === 'en' && formErrors.name && <span className="field-error">{formErrors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor={contentLocale === 'ar' ? 'rt-desc-ar' : 'rt-desc'}>
                      {t('pages.rooms.description', 'Description')}
                      {contentLocale === 'ar' && (
                        <span className="field-optional-label">{t('pages.rooms.optional', 'Optional')}</span>
                      )}
                    </label>
                    <textarea
                      id={contentLocale === 'ar' ? 'rt-desc-ar' : 'rt-desc'}
                      rows={2}
                      value={contentLocale === 'ar' ? (form.description_ar || '') : form.description}
                      onChange={(e) => updateField(contentLocale === 'ar' ? 'description_ar' : 'description', e.target.value)}
                      placeholder={
                        contentLocale === 'ar'
                          ? t('pages.rooms.descriptionPhAr', 'ميزات الغرفة وتفاصيلها')
                          : t('pages.rooms.descriptionPlaceholder', 'Room features and details')
                      }
                      dir={contentLocale === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-unit-type">{t('pages.rooms.unitType', 'Unit type')}</label>
                    <select id="rt-unit-type" value={form.unit_type} onChange={(e) => updateField('unit_type', e.target.value)}>
                      {UNIT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-bed-type">{t('pages.rooms.bedType', 'Bed type')} {t('common.required', '*')}</label>
                    <select id="rt-bed-type" value={form.bed_type} onChange={(e) => updateField('bed_type', e.target.value)}>
                      <option value="">{t('pages.rooms.selectBedType', 'Select bed type')}</option>
                      {BED_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {formErrors.bed_type && <span className="field-error">{formErrors.bed_type}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-room-size">{t('pages.rooms.roomSize', 'Room size (m²)')}</label>
                    <input
                      id="rt-room-size"
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.room_size}
                      onChange={(e) => updateField('room_size', e.target.value)}
                      placeholder={t('pages.rooms.roomSizePlaceholder', 'e.g. 32')}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-adults">{t('pages.rooms.maxAdults', 'Max adults')} {t('common.required', '*')}</label>
                    <input id="rt-adults" type="number" min="1" value={form.max_adults} onChange={(e) => updateField('max_adults', e.target.value)} />
                    {formErrors.max_adults && <span className="field-error">{formErrors.max_adults}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-children">{t('pages.rooms.maxChildren', 'Max children')}</label>
                    <input id="rt-children" type="number" min="0" value={form.max_children} onChange={(e) => updateField('max_children', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-units">{t('pages.rooms.totalUnits', 'Total units')} {t('common.required', '*')}</label>
                    <input id="rt-units" type="number" min="1" value={form.total_units} onChange={(e) => updateField('total_units', e.target.value)} />
                    {formErrors.total_units && <span className="field-error">{formErrors.total_units}</span>}
                  </div>
                </div>
              </section>

              <section className="admin-service-form-section admin-service-form-section-pricing">
                <h4 className="admin-service-form-section-title">{t('pages.rooms.basePricing', 'Base pricing')}</h4>
                <div className="admin-service-form-grid admin-room-type-form__pricing">
                  <div className="form-group">
                    <label htmlFor="rt-base-price">{t('pages.rooms.basePriceNight', 'Base price / night')}</label>
                    <input id="rt-base-price" type="number" min="0" step="0.01" value={form.base_price} onChange={(e) => updateField('base_price', e.target.value)} />
                    {formErrors.base_price && <span className="field-error">{formErrors.base_price}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-currency">{t('pages.rooms.currency', 'Currency')}</label>
                    <select id="rt-currency" value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
                      {ROOM_CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="rt-extra-bed-price">{t('pages.rooms.extraBedPrice', 'Extra bed price')}</label>
                    <input id="rt-extra-bed-price" type="number" min="0" step="0.01" value={form.extra_bed_price} onChange={(e) => updateField('extra_bed_price', e.target.value)} disabled={!form.extra_bed_allowed} />
                  </div>
                </div>
                <div className="admin-service-checkboxes admin-room-type-form__options">
                  <label className="checkbox-label admin-service-checkbox-card">
                    <input type="checkbox" checked={form.breakfast_included} onChange={(e) => updateField('breakfast_included', e.target.checked)} />
                    <span><strong>{t('pages.rooms.breakfastIncluded', 'Breakfast included')}</strong></span>
                  </label>
                  <label className="checkbox-label admin-service-checkbox-card">
                    <input type="checkbox" checked={form.extra_bed_allowed} onChange={(e) => updateField('extra_bed_allowed', e.target.checked)} />
                    <span><strong>{t('pages.rooms.extraBedAllowed', 'Extra bed allowed')}</strong></span>
                  </label>
                  <label className="checkbox-label admin-service-checkbox-card">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} />
                    <span><strong>{t('common.active', 'Active')}</strong></span>
                  </label>
                </div>
              </section>

              <section className="admin-service-form-section">
                <h4 className="admin-service-form-section-title">{t('pages.rooms.roomPhotos', 'Room photos')}</h4>
                <PropertyImagesManager
                  existingImages={existingImages}
                  pendingImages={pendingImages}
                  deletedImageIds={deletedImageIds}
                  onAddFiles={handleAddImageFiles}
                  onRemoveExisting={handleRemoveExistingImage}
                  onRemovePending={handleRemovePendingImage}
                  onUpdateExisting={handleUpdateExistingImage}
                  onUpdatePending={handleUpdatePendingImage}
                  onSetCover={handleSetImageCover}
                  onInvalidFiles={handleInvalidImageFiles}
                  submitting={submitting}
                  error={imageError}
                  hint=""
                  emptyMessage={t('pages.rooms.photosEmpty', 'No room photos yet — upload files to add photos')}
                  uploadLabel={t('pages.rooms.uploadPhotos', 'Upload room photos')}
                />
              </section>

              <section className="admin-service-form-section admin-room-type-form__seasonal">
                <div className="admin-room-type-form__seasonal-head">
                  <h4 className="admin-service-form-section-title">{t('pages.rooms.seasonalPrices', 'Seasonal prices')}</h4>
                  <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm admin-room-price-add" onClick={addPriceRow}>
                    {t('pages.rooms.addSeasonal', '+ Add seasonal price')}
                  </button>
                </div>
                {(form.prices || []).length > 0 && (
                  <div className="admin-room-prices-list">
                    {(form.prices || []).map((row, index) => (
                      <div key={row.id || `new-${index}`} className="admin-room-price-row">
                        <div className="form-group">
                          <label>{t('pages.rooms.seasonName', 'Season name')}</label>
                          <input value={row.season_name} onChange={(e) => updatePriceRow(index, 'season_name', e.target.value)} placeholder={t('pages.rooms.seasonPlaceholder', 'High season')} />
                        </div>
                        <div className="form-group">
                          <label>{t('pages.rooms.startDate', 'Start date')}</label>
                          <input type="date" value={row.start_date} onChange={(e) => updatePriceRow(index, 'start_date', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>{t('pages.rooms.endDate', 'End date')}</label>
                          <input type="date" value={row.end_date} onChange={(e) => updatePriceRow(index, 'end_date', e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label>{t('pages.rooms.pricePerNight', 'Price / night')}</label>
                          <input type="number" min="0" step="0.01" value={row.price_per_night} onChange={(e) => updatePriceRow(index, 'price_per_night', e.target.value)} />
                        </div>
                        <button
                          type="button"
                          className="admin-icon-btn admin-icon-btn--danger admin-room-price-remove"
                          onClick={() => removePriceRow(index)}
                          title={t('pages.rooms.removePrice', 'Remove price')}
                          aria-label={t('pages.rooms.removePrice', 'Remove price')}
                        >
                          <Icon name="trash-2" size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

                  <div className="admin-service-form-actions">
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={closeForm} disabled={submitting}>
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting || !!loadingEditId}>
                      {submitting
                        ? t('common.saving', 'Saving…')
                        : editingId
                          ? t('common.saveChanges', 'Save changes')
                          : t('pages.rooms.create', 'Create room type')}
                    </button>
                  </div>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      )}

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <ApiLoading message={t('pages.rooms.loading', 'Loading room types…')} variant="table" />}

      {!loading && !error && roomTypes.length === 0 && (
        <div className="visual-empty-state">
          <div className="visual-empty-state-icon">
            <Icon name="bed-double" size={24} />
          </div>
          <h3>{t('pages.rooms.emptyTitle', 'No room types yet')}</h3>
          <p>{t('pages.rooms.emptyDesc', 'Create room types for your properties — suites, villas, studios, and more.')}</p>
          {properties.length > 0 && (
            <button type="button" className="admin-btn admin-btn-primary link-with-icon admin-empty-action" onClick={openCreateForm}>
              <Icon name="plus" size={16} />
              <span>{t('pages.rooms.emptyAction', 'Add first room type')}</span>
            </button>
          )}
        </div>
      )}

      {!loading && !error && roomTypes.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {searchQuery.trim()
              ? t('pages.rooms.countFiltered', '{{filtered}} of {{total}} room types', {
                  filtered: filteredRoomTypes.length,
                  total: roomTypes.length
                })
              : t('pages.rooms.count', '{{count}} room types', { count: roomTypes.length })}
          </p>
          {filteredRoomTypes.length === 0 ? (
            <div className="admin-amenities-empty admin-amenities-empty--compact">
              <h3>{t('pages.rooms.noMatchTitle', 'No room types match your search')}</h3>
              <p>{t('pages.rooms.noMatchDesc', 'Try a different name, property, type, or ID.')}</p>
            </div>
          ) : (
          <div className="admin-hotels-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('common.name', 'Name')}</th>
                  <th>{t('pages.rooms.nameAr', 'Name (Arabic)')}</th>
                  <th>{t('common.property', 'Property')}</th>
                  <th>{t('common.type', 'Type')}</th>
                  <th>{t('pages.rooms.capacity', 'Capacity')}</th>
                  <th>{t('pages.rooms.units', 'Units')}</th>
                  <th>{t('pages.rooms.basePrice', 'Base price')}</th>
                  <th>{t('pages.rooms.seasons', 'Seasons')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoomTypes.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td className="admin-amenity-name-ar-cell" dir="rtl">
                      {item.nameAr || <span className="admin-muted-cell">—</span>}
                    </td>
                    <td>{displayProperty(item)}</td>
                    <td>{unitTypeLabel(item.unitType)}</td>
                    <td>{item.maxAdults}A / {item.maxChildren}C</td>
                    <td>{item.totalUnits}</td>
                    <td>{formatRoomTypePrice(item)}</td>
                    <td>{item.prices?.length || 0}</td>
                    <td>
                      <span className={`badge ${item.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {item.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="admin-actions-cell">
                      <div className="admin-icon-actions">
                        <AdminIconButton
                          icon="pencil"
                          label={t('pages.rooms.edit', 'Edit room type')}
                          variant="primary"
                          onClick={() => openEditForm(item)}
                          disabled={deletingId === item.id || loadingEditId === item.id}
                          loading={loadingEditId === item.id}
                        />
                        <AdminIconButton
                          icon="trash-2"
                          label={t('pages.rooms.delete', 'Delete room type')}
                          variant="danger"
                          onClick={() => setDeleteTarget(item)}
                          disabled={deletingId === item.id}
                          loading={deletingId === item.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('pages.rooms.confirmDeleteTitle', 'Delete room type?')}
        message={deleteTarget
          ? t('pages.rooms.confirmDeleteMsg', '"{{name}}" will be removed from room setup.', { name: deleteTarget.name })
          : ''}
        confirmLabel={t('pages.rooms.confirmDeleteBtn', 'Delete room type')}
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete()}
      />
    </div>
  );
};

export default AdminRoomsPage;
