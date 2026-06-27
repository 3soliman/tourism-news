'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  fetchServiceCategories,
  fetchServiceCategoryById,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory
} from '../../api/serviceCategoriesApi';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import { EMPTY_CATEGORY_FORM } from '../../constants/serviceForm';
import Icon from '../../components/icons/Icon';
import AdminIconButton from '../../components/admin/AdminIconButton';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import { useTranslation } from '../../context/I18nContext';

const AdminServiceCategoriesPage = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [existingIconUrl, setExistingIconUrl] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState(null);
  const notify = useNotifications();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchServiceCategories());
    } catch (err) {
      setError(err.message || t('pages.serviceCategories.errorLoad', 'Failed to load service categories'));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_CATEGORY_FORM);
    setIconFile(null);
    if (iconPreview?.startsWith('blob:')) URL.revokeObjectURL(iconPreview);
    setIconPreview(null);
    setExistingIconUrl(null);
    setEditingId(null);
    setFormErrors({});
    setSubmitError(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = async (item) => {
    resetForm();
    setShowForm(true);
    setLoadingEditId(item.id);
    setSubmitError(null);
    try {
      const fresh = await fetchServiceCategoryById(item.id);
      setEditingId(fresh.id);
      setForm({
        name: fresh.name,
        description: fresh.description,
        is_active: fresh.isActive
      });
      setExistingIconUrl(fresh.iconUrl || null);
      setIconPreview(fresh.iconUrl || null);
    } catch (err) {
      setSubmitError(formatApiErrors(err.data) || err.message || t('pages.serviceCategories.errorLoadCategory', 'Failed to load category'));
      setShowForm(false);
    } finally {
      setLoadingEditId(null);
    }
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleIconChange = (e) => {
    const file = e.target.files?.[0] || null;
    setIconFile(file);
    setFormErrors((prev) => ({ ...prev, icon: undefined }));
    setSubmitError(null);
    if (iconPreview?.startsWith('blob:')) URL.revokeObjectURL(iconPreview);
    setIconPreview(
      file ? URL.createObjectURL(file) : editingId ? existingIconUrl : null
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const next = {};
    if (!form.name.trim()) next.name = t('pages.serviceCategories.nameRequired', 'Name is required');
    setFormErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updateServiceCategory(editingId, form, iconFile);
        notify.success(t('pages.serviceCategories.updateSuccess', 'Service category updated successfully'), { message: form.name });
      } else {
        const created = await createServiceCategory(form, iconFile);
        notify.success(t('pages.serviceCategories.createSuccess', 'Service category created successfully'), { message: created.name });
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
      notify.error(editingId ? t('pages.serviceCategories.updateError', 'Failed to update service category') : t('pages.serviceCategories.createError', 'Failed to create service category'), { message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item = deleteTarget) => {
    if (!item) return;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await deleteServiceCategory(item.id);
      if (editingId === item.id) closeForm();
      await load();
      notify.success(t('pages.serviceCategories.deleteSuccess', 'Service category deleted successfully'), { message: item.name });
      setDeleteTarget(null);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setDeleteError(message);
      notify.error(t('pages.serviceCategories.deleteError', 'Failed to delete service category'), { message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.serviceCategories.title', 'Service categories')}</h2>
          <p>{t('pages.serviceCategories.subtitle', 'Group property services into categories (spa, dining, transport, etc.)')}</p>
        </div>
        <div className="admin-header-actions">
          <AdminIconButton icon="refresh-cw" label={t('common.refresh', 'Refresh')} onClick={load} disabled={loading} loading={loading} />
          <button
            type="button"
            className="admin-btn admin-btn-primary link-with-icon"
            onClick={() => (showForm ? closeForm() : openCreateForm())}
          >
            <Icon name="plus" size={16} />
            <span>{showForm ? t('common.cancel', 'Cancel') : t('pages.serviceCategories.addCategory', 'Add category')}</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="admin-alert admin-alert-error">
          <strong>{t('pages.serviceCategories.deleteErrorTitle', 'Could not delete category')}</strong>
          <pre>{deleteError}</pre>
        </div>
      )}

      {showForm && (
        <div className="admin-catalog-drawer-shell" role="presentation" onClick={submitting ? undefined : closeForm}>
          <section
            className="admin-panel-card admin-category-form-card admin-catalog-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-category-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="admin-catalog-drawer__head">
            <h3 id="service-category-drawer-title">{editingId ? t('pages.serviceCategories.editCategory', 'Edit category #{{id}}', { id: editingId }) : t('pages.serviceCategories.addServiceCategory', 'Add service category')}</h3>
            <button type="button" className="admin-modal__close" onClick={closeForm} disabled={submitting || !!loadingEditId} aria-label={t('common.close', 'Close')}>
              <Icon name="x" size={18} />
            </button>
          </div>
          {loadingEditId && <ApiLoading message={t('pages.serviceCategories.loadingCategory', 'Loading category...')} variant="form" />}
          {submitError && (
            <div className="admin-alert admin-alert-error">
              <pre>{submitError}</pre>
            </div>
          )}
          <form onSubmit={handleSubmit} className="admin-category-form" noValidate>
            <fieldset disabled={submitting || !!loadingEditId}>
              <section className="admin-service-form-section">
                <h4 className="admin-service-form-section-title">{t('pages.serviceCategories.categoryDetails', 'Category details')}</h4>
                <div className="admin-category-form-main">
                  <div className="admin-category-form-fields">
                    <div className="form-group">
                      <label htmlFor="cat-name">{t('pages.serviceCategories.categoryName', 'Category name')} {t('common.required', '*')}</label>
                      <input
                        id="cat-name"
                        value={form.name}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, name: e.target.value }));
                          setFormErrors((prev) => ({ ...prev, name: undefined }));
                          setSubmitError(null);
                        }}
                        placeholder={t('pages.serviceCategories.namePlaceholder', 'e.g. Spa & Wellness')}
                      />
                      {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="cat-desc">{t('pages.serviceCategories.description', 'Description')}</label>
                      <textarea
                        id="cat-desc"
                        rows={4}
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder={t('pages.serviceCategories.descriptionPlaceholder', 'Optional description shown in admin and guest views')}
                      />
                    </div>

                    <label className="checkbox-label admin-service-checkbox-card admin-category-active-card">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      />
                      <span>
                        <strong>{t('pages.serviceCategories.active', 'Active')}</strong>
                        <small>{t('pages.serviceCategories.activeHint', 'Category is visible when adding services')}</small>
                      </span>
                    </label>
                  </div>

                  <div className="admin-category-icon-panel">
                    <div className="form-group">
                      <label htmlFor="cat-icon">{t('pages.serviceCategories.iconFile', 'Icon file')}</label>
                      <input
                        id="cat-icon"
                        type="file"
                        accept="image/*,.svg"
                        onChange={handleIconChange}
                        className="file-input"
                      />
                      <p className="admin-hint">
                        {editingId
                          ? t('pages.serviceCategories.keepIconHint', 'Leave empty to keep the current icon')
                          : t('pages.serviceCategories.uploadIconHint', 'Upload PNG, JPG, WEBP, or SVG from your device')}
                      </p>
                      {formErrors.icon && <span className="field-error">{formErrors.icon}</span>}
                    </div>

                    <div className="admin-category-icon-preview-box">
                      <span className="preview-label">{t('pages.serviceCategories.iconPreview', 'Icon preview')}</span>
                      {iconPreview ? (
                        <img src={iconPreview} alt={t('pages.serviceCategories.iconPreview', 'Icon preview')} decoding="async" />
                      ) : (
                        <div className="admin-category-icon-placeholder">{t('pages.serviceCategories.noIcon', 'No icon')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <div className="admin-service-form-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={closeForm} disabled={submitting}>
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting || !!loadingEditId}>
                  {submitting ? t('common.saving', 'Saving…') : editingId ? t('common.saveChanges', 'Save changes') : t('pages.serviceCategories.createCategory', 'Create category')}
                </button>
              </div>
            </fieldset>
          </form>
          </section>
        </div>
      )}

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <ApiLoading message={t('pages.serviceCategories.loading', 'Loading categories...')} variant="table" />}

      {!loading && !error && categories.length === 0 && (
        <div className="admin-panel-card admin-empty-state">
          <h3>{t('pages.serviceCategories.emptyTitle', 'No service categories yet')}</h3>
          <p>{t('pages.serviceCategories.emptyDesc', 'Create categories to organize property services.')}</p>
          <button type="button" className="admin-btn admin-btn-primary link-with-icon admin-empty-action" onClick={openCreateForm}>
            <Icon name="plus" size={16} />
            <span>{t('pages.serviceCategories.emptyAction', 'Add first category')}</span>
          </button>
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {t('pages.serviceCategories.count', '{{count}} categories', { count: categories.length })}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('pages.serviceCategories.icon', 'Icon')}</th>
                  <th>{t('common.name', 'Name')}</th>
                  <th>{t('pages.serviceCategories.description', 'Description')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>ID</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.iconUrl ? (
                        <img src={item.iconUrl} alt="" className="admin-amenity-icon-thumb" loading="lazy" decoding="async" />
                      ) : (
                        <span className="admin-amenity-icon-missing">—</span>
                      )}
                    </td>
                    <td><strong>{item.name}</strong></td>
                    <td className="admin-table-desc">{item.description || t('common.emDash', '—')}</td>
                    <td>
                      <span className={`badge ${item.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {item.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td>{item.id}</td>
                    <td className="admin-actions-cell">
                      <div className="admin-icon-actions">
                        <AdminIconButton
                          icon="pencil"
                          label={t('pages.serviceCategories.editAction', 'Edit category')}
                          variant="primary"
                          onClick={() => openEditForm(item)}
                          disabled={deletingId === item.id || loadingEditId === item.id}
                          loading={loadingEditId === item.id}
                        />
                        <AdminIconButton
                          icon="trash-2"
                          label={t('pages.serviceCategories.deleteAction', 'Delete category')}
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
        </section>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('pages.serviceCategories.deleteTitle', 'Delete category?')}
        message={deleteTarget ? t('pages.serviceCategories.deleteMsg', '"{{name}}" will be removed.', { name: deleteTarget.name }) : ''}
        confirmLabel={t('pages.serviceCategories.deleteBtn', 'Delete category')}
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete()}
      />
    </div>
  );
};

export default AdminServiceCategoriesPage;
