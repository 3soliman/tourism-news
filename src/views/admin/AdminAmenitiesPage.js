'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  fetchPropertyAmenities,
  createPropertyAmenity,
  updatePropertyAmenity,
  deletePropertyAmenity
} from '../../api/propertyAmenitiesApi';
import { ApiError } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import Icon from '../../components/icons/Icon';
import AdminIconButton from '../../components/admin/AdminIconButton';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import { TableSkeleton } from '../../components/shared/LoadingSkeletons';
import { useTranslation } from '../../context/I18nContext';

const EMPTY_FORM = {
  name: '',
  name_ar: '',
  is_active: true
};

const PAGE_SIZE = 10;
const MAX_ICON_SIZE = 2 * 1024 * 1024;
const ALLOWED_ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

function formatUpdatedAtValue(value, notTracked) {
  if (!value) return notTracked;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return notTracked;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

const AdminAmenitiesPage = () => {
  const { t } = useTranslation();

  const validateIconFile = (file) => {
    if (!file) return '';
    const isSvgByName = file.name?.toLowerCase().endsWith('.svg');
    if (!ALLOWED_ICON_TYPES.includes(file.type) && !isSvgByName) {
      return t('pages.amenities.iconInvalidType', 'Upload a PNG, JPG, WEBP, or SVG icon.');
    }
    if (file.size > MAX_ICON_SIZE) return t('pages.amenities.iconTooLarge', 'Icon must be 2 MB or smaller.');
    return '';
  };

  const formatUpdatedAt = (value) => formatUpdatedAtValue(value, t('pages.amenities.notTracked', 'Not tracked'));
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [existingIconUrl, setExistingIconUrl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);
  const fileInputRef = useRef(null);
  const notify = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPropertyAmenities();
      setAmenities(list);
    } catch (err) {
      setError(err.message || t('pages.amenities.errorLoad', 'Failed to load amenities'));
      setAmenities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortBy]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setIconFile(null);
    setIconPreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return null;
    });
    setExistingIconUrl(null);
    setEditingId(null);
    setFormErrors({});
    setSubmitError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (iconPreview?.startsWith('blob:')) URL.revokeObjectURL(iconPreview);
    };
  }, [iconPreview]);

  const openCreateForm = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  const openEditForm = (item) => {
    resetForm();
    setEditingId(item.id);
    setForm({ name: item.name, name_ar: item.nameAr || '', is_active: item.isActive });
    setExistingIconUrl(item.iconUrl || null);
    setIconPreview(item.iconUrl || null);
    setIsDrawerOpen(true);
  };

  const closeForm = useCallback(() => {
    resetForm();
    setIsDrawerOpen(false);
  }, [resetForm]);

  useEffect(() => {
    if (!isDrawerOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) closeForm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeForm, isDrawerOpen, submitting]);

  const setSelectedIconFile = (file) => {
    setSubmitError(null);
    const validationError = validateIconFile(file);
    if (validationError) {
      setIconFile(null);
      setFormErrors((prev) => ({ ...prev, icon: validationError }));
      return;
    }

    setIconFile(file);
    setFormErrors((prev) => ({ ...prev, icon: undefined }));
    setIconPreview((current) => {
      if (current?.startsWith('blob:')) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : editingId ? existingIconUrl : null;
    });
  };

  const handleIconChange = (event) => {
    setSelectedIconFile(event.target.files?.[0] || null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (submitting) return;
    setSelectedIconFile(event.dataTransfer.files?.[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const next = {};
    if (!form.name.trim()) next.name = t('pages.amenities.nameRequired', 'Name is required');
    setFormErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updatePropertyAmenity(editingId, form, iconFile);
        notify.success(t('pages.amenities.updateSuccess', 'Amenity updated successfully'), { message: form.name });
      } else {
        const created = await createPropertyAmenity(form, iconFile);
        notify.success(t('pages.amenities.createSuccess', 'Amenity added successfully'), { message: created.name });
      }
      closeForm();
      await load();
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
      notify.error(editingId ? t('pages.amenities.updateError', 'Failed to update amenity') : t('pages.amenities.createError', 'Failed to create amenity'), { message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item = deleteTarget) => {
    if (!item) return;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await deletePropertyAmenity(item.id);
      if (editingId === item.id) closeForm();
      await load();
      notify.success(t('pages.amenities.deleteSuccess', 'Amenity deleted successfully'), { message: item.name });
      setDeleteTarget(null);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setDeleteError(message);
      notify.error(t('pages.amenities.deleteError', 'Failed to delete amenity'), { message });
    } finally {
      setDeletingId(null);
    }
  };

  const stats = useMemo(() => {
    const active = amenities.filter((item) => item.isActive).length;
    return {
      total: amenities.length,
      active,
      inactive: amenities.length - active
    };
  }, [amenities]);

  const filteredAmenities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = amenities
      .filter((item) => {
        const matchesQuery = !normalizedQuery
          || item.name.toLowerCase().includes(normalizedQuery)
          || (item.nameAr || '').toLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && item.isActive) ||
          (statusFilter === 'inactive' && !item.isActive);
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'status') return Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
    return result;
  }, [amenities, query, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAmenities.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedAmenities = filteredAmenities.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resultStart = filteredAmenities.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const resultEnd = Math.min(safePage * PAGE_SIZE, filteredAmenities.length);

  return (
    <div className="admin-page admin-amenities-page">
      <section className="admin-amenities-hero">
        <div className="admin-amenities-title">
          <span className="admin-amenities-eyebrow">{t('pages.amenities.eyebrow', 'Guest experience catalog')}</span>
          <h2>{t('pages.amenities.title', 'Property Amenities')}</h2>
          <p>{t('pages.amenities.subtitle', 'Manage amenities used across all properties.')}</p>
        </div>
        <div className="admin-amenities-actions">
          <AdminIconButton icon="refresh-cw" label={t('pages.amenities.refresh', 'Refresh amenities')} onClick={load} disabled={loading} loading={loading} />
          <button type="button" className="admin-btn admin-btn-primary link-with-icon" onClick={openCreateForm}>
            <Icon name="plus" size={16} />
            <span>{t('pages.amenities.newAmenity', 'New Amenity')}</span>
          </button>
        </div>
        <div className="admin-amenities-kpis" aria-label={t('pages.amenities.summaryAria', 'Amenity summary')}>
          <article className="admin-amenities-kpi">
            <span>{t('pages.amenities.totalAmenities', 'Total amenities')}</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="admin-amenities-kpi admin-amenities-kpi--active">
            <span>{t('pages.amenities.activeAmenities', 'Active amenities')}</span>
            <strong>{stats.active}</strong>
          </article>
          <article className="admin-amenities-kpi">
            <span>{t('pages.amenities.inactiveAmenities', 'Inactive amenities')}</span>
            <strong>{stats.inactive}</strong>
          </article>
        </div>
      </section>

      {deleteError && (
        <div className="admin-alert admin-alert-error">
          <strong>{t('pages.amenities.deleteErrorTitle', 'Could not delete amenity')}</strong>
          <pre>{deleteError}</pre>
        </div>
      )}

      {error && <ApiError message={error} onRetry={load} />}

      {!error && (
        <section className="admin-panel-card admin-amenities-board">
          <div className="admin-amenities-toolbar">
            <label className="admin-search-field">
              <Icon name="search" size={16} />
              <span className="sr-only">{t('pages.amenities.searchAmenities', 'Search amenities')}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('pages.amenities.searchAmenities', 'Search amenities')}
                disabled={loading}
              />
            </label>
            <div className="admin-amenities-controls">
              <label>
                <span className="sr-only">{t('pages.amenities.filterByStatus', 'Filter by status')}</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={loading}>
                  <option value="all">{t('pages.amenities.allStatuses', 'All statuses')}</option>
                  <option value="active">{t('common.active', 'Active')}</option>
                  <option value="inactive">{t('common.inactive', 'Inactive')}</option>
                </select>
              </label>
              <label>
                <span className="sr-only">{t('pages.amenities.sortAmenities', 'Sort amenities')}</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} disabled={loading}>
                  <option value="name-asc">{t('pages.amenities.sortNameAsc', 'Name A-Z')}</option>
                  <option value="name-desc">{t('pages.amenities.sortNameDesc', 'Name Z-A')}</option>
                  <option value="status">{t('pages.amenities.sortStatus', 'Status')}</option>
                </select>
              </label>
            </div>
          </div>

          {loading && (
            <TableSkeleton columns={5} rows={7} message={t('pages.amenities.loading', 'Loading amenities...')} />
          )}

          {!loading && amenities.length === 0 && (
            <div className="admin-amenities-empty">
              <div className="admin-amenities-empty-illustration" aria-hidden="true">
                <Icon name="hotel" size={30} />
                <span />
              </div>
              <h3>{t('pages.amenities.emptyTitle', 'No amenities yet')}</h3>
              <p>{t('pages.amenities.emptyDesc', 'Create amenities here, then assign them when adding or editing a property.')}</p>
              <button type="button" className="admin-btn admin-btn-primary link-with-icon admin-empty-action" onClick={openCreateForm}>
                <Icon name="plus" size={16} />
                <span>{t('pages.amenities.emptyAction', 'Create First Amenity')}</span>
              </button>
            </div>
          )}

          {!loading && amenities.length > 0 && filteredAmenities.length === 0 && (
            <div className="admin-amenities-empty admin-amenities-empty--compact">
              <h3>{t('pages.amenities.noMatchTitle', 'No amenities match your filters')}</h3>
              <p>{t('pages.amenities.noMatchDesc', 'Adjust search or status filters to see more results.')}</p>
            </div>
          )}

          {!loading && filteredAmenities.length > 0 && (
            <>
              <div className="admin-amenities-table-wrap">
                <table className="admin-table admin-amenities-table">
                  <thead>
                    <tr>
                      <th>{t('pages.amenities.icon', 'Icon')}</th>
                      <th>{t('pages.amenities.name', 'Name')}</th>
                      <th>{t('pages.amenities.amenityNameAr', 'Amenity name (Arabic)')}</th>
                      <th>{t('common.status', 'Status')}</th>
                      <th>{t('pages.amenities.lastUpdated', 'Last Updated')}</th>
                      <th>{t('common.actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAmenities.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.iconUrl ? (
                            <img src={item.iconUrl} alt="" className="admin-amenity-icon-thumb" loading="lazy" decoding="async" />
                          ) : (
                            <span className="admin-amenity-icon-missing" aria-hidden="true">
                              <Icon name="hotel" size={16} />
                            </span>
                          )}
                        </td>
                        <td>
                          <strong className="admin-amenity-name">{item.name}</strong>
                        </td>
                        <td className="admin-amenity-name-ar-cell" dir="rtl">
                          {item.nameAr || <span className="admin-muted-cell">—</span>}
                        </td>
                        <td>
                          <span className={`admin-status-pill ${item.isActive ? 'admin-status-pill--active' : 'admin-status-pill--inactive'}`}>
                            {item.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                          </span>
                        </td>
                        <td className="admin-muted-cell">{formatUpdatedAt(item.updatedAt)}</td>
                        <td className="admin-actions-cell">
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              onClick={() => openEditForm(item)}
                              disabled={deletingId === item.id}
                            >
                              {t('common.edit', 'Edit')}
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              onClick={() => setDeleteTarget(item)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? t('pages.amenities.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-amenities-pagination">
                <span>
                  {t('pages.amenities.showing', 'Showing {{start}}-{{end}} of {{total}}', {
                    start: resultStart,
                    end: resultEnd,
                    total: filteredAmenities.length
                  })}
                </span>
                <div className="admin-pagination-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={safePage === 1}
                  >
                    {t('common.previous', 'Previous')}
                  </button>
                  <span>
                    {t('common.pageOf', 'Page {{page}} of {{totalPages}}', { page: safePage, totalPages })}
                  </span>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={safePage === totalPages}
                  >
                    {t('common.next', 'Next')}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {isDrawerOpen && (
        <div className="admin-slide-over" role="dialog" aria-modal="true" aria-labelledby="amenity-drawer-title">
          <button type="button" className="admin-slide-over-backdrop" aria-label={t('pages.amenities.closeEditor', 'Close amenity editor')} onClick={closeForm} disabled={submitting} />
          <aside className="admin-slide-over-panel">
            <div className="admin-slide-over-header">
              <div>
                <span className="admin-amenities-eyebrow">{t('pages.amenities.setupEyebrow', 'Amenity setup')}</span>
                <h3 id="amenity-drawer-title">{editingId ? t('pages.amenities.editAmenity', 'Edit amenity') : t('pages.amenities.createAmenity', 'Create amenity')}</h3>
                <p>{editingId ? t('pages.amenities.editDesc', 'Update the label, icon, and availability status.') : t('pages.amenities.createDesc', 'Add a reusable amenity for properties and room listings.')}</p>
              </div>
              <AdminIconButton icon="x" label={t('pages.amenities.closeEditor', 'Close amenity editor')} onClick={closeForm} disabled={submitting} />
            </div>

            {submitError && (
              <div className="admin-alert admin-alert-error">
                <pre>{submitError}</pre>
              </div>
            )}

            <form onSubmit={handleSubmit} className="admin-amenity-drawer-form" noValidate>
              <div className="form-group">
                <label htmlFor="amenity-name">{t('pages.amenities.amenityName', 'Amenity Name')} {t('common.required', '*')}</label>
                <input
                  id="amenity-name"
                  value={form.name}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, name: event.target.value }));
                    setFormErrors((prev) => ({ ...prev, name: undefined }));
                    setSubmitError(null);
                  }}
                  disabled={submitting}
                  placeholder={t('pages.amenities.namePlaceholder', 'e.g. Free WiFi')}
                  autoFocus
                />
                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="amenity-name-ar">{t('pages.amenities.amenityNameAr', 'Amenity name (Arabic)')}</label>
                <input
                  id="amenity-name-ar"
                  value={form.name_ar}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, name_ar: event.target.value }));
                    setSubmitError(null);
                  }}
                  disabled={submitting}
                  placeholder={t('pages.amenities.nameArPlaceholder', 'مثال: واي فاي مجاني')}
                  dir="rtl"
                />
              </div>

              <div className="form-group">
                <label htmlFor="amenity-icon-file">{t('pages.amenities.iconUpload', 'Icon Upload')}</label>
                <input
                  ref={fileInputRef}
                  id="amenity-icon-file"
                  type="file"
                  accept="image/*,.svg"
                  onChange={handleIconChange}
                  disabled={submitting}
                  className="admin-upload-input"
                />
                <button
                  type="button"
                  className={`admin-upload-dropzone ${formErrors.icon ? 'has-error' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleDrop}
                  disabled={submitting}
                >
                  <span className="admin-upload-preview" aria-hidden="true">
                    {iconPreview ? <img src={iconPreview} alt="" decoding="async" /> : <Icon name="upload" size={22} />}
                  </span>
                  <span className="admin-upload-copy">
                    <strong>{iconFile ? iconFile.name : iconPreview ? t('pages.amenities.iconSelected', 'Icon selected') : t('pages.amenities.dropIcon', 'Drop icon here or browse')}</strong>
                    <small>{editingId ? t('pages.amenities.keepIconHint', 'Leave unchanged to keep the current icon.') : t('pages.amenities.iconFormatHint', 'PNG, JPG, WEBP, or SVG up to 2 MB.')}</small>
                  </span>
                </button>
                {(iconFile || iconPreview) && (
                  <button
                    type="button"
                    className="admin-upload-replace"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                  >
                    {t('pages.amenities.replaceFile', 'Replace file')}
                  </button>
                )}
                {submitting && (
                  <div className="admin-upload-progress" aria-label={t('pages.amenities.uploadingIcon', 'Uploading amenity icon')}>
                    <span />
                  </div>
                )}
                {formErrors.icon && <span className="field-error">{formErrors.icon}</span>}
              </div>

              <div className="admin-status-toggle">
                <div>
                  <strong>{t('common.status', 'Status')}</strong>
                  <span>{form.is_active ? t('pages.amenities.visibleToTeams', 'Visible to property teams') : t('pages.amenities.hiddenFromSelections', 'Hidden from new selections')}</span>
                </div>
                <label className="admin-switch">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    disabled={submitting}
                  />
                  <span />
                </label>
              </div>

              <div className="admin-slide-over-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={closeForm} disabled={submitting}>
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
                  {submitting ? t('common.saving', 'Saving...') : editingId ? t('common.saveChanges', 'Save changes') : t('pages.amenities.createBtn', 'Create amenity')}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('pages.amenities.deleteTitle', 'Delete amenity?')}
        message={deleteTarget ? t('pages.amenities.deleteMsg', '"{{name}}" will be removed from the catalog.', { name: deleteTarget.name }) : ''}
        confirmLabel={t('pages.amenities.deleteBtn', 'Delete amenity')}
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete()}
      />
    </div>
  );
};

export default AdminAmenitiesPage;
