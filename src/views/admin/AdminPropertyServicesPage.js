'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { fetchAdminProperties } from '../../api/propertiesApi';
import { fetchServiceCategories } from '../../api/serviceCategoriesApi';
import {
  fetchPropertyServices,
  fetchPropertyServiceById,
  createPropertyService,
  updatePropertyService,
  deletePropertyService,
  mapPropertyServiceToForm
} from '../../api/propertyServicesApi';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import { EMPTY_SERVICE_FORM } from '../../constants/serviceForm';
import { validatePropertyServiceForm } from '../../utils/serviceFormValidation';
import PropertyServiceFormFields from '../../components/admin/hotel/PropertyServiceFormFields';
import Icon from '../../components/icons/Icon';
import AdminIconButton from '../../components/admin/AdminIconButton';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import { useTranslation } from '../../context/I18nContext';

const AdminPropertyServicesPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialPropertyFilter = searchParams.get('property') || '';
  const [services, setServices] = useState([]);
  const [properties, setProperties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterPropertyId, setFilterPropertyId] = useState(initialPropertyFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_SERVICE_FORM);
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

  const loadMeta = useCallback(async () => {
    const [props, cats] = await Promise.all([
      fetchAdminProperties(),
      fetchServiceCategories({ activeOnly: true })
    ]);
    setProperties(props);
    setCategories(cats);
  }, []);

  const loadServices = useCallback(async (propertyId = filterPropertyId) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPropertyServices({
        propertyId: propertyId || undefined
      });
      setServices(list);
    } catch (err) {
      setError(err.message || t('pages.propertyServices.errorLoad', 'Failed to load property services'));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [filterPropertyId]);

  const load = useCallback(async () => {
    try {
      await loadMeta();
    } catch (err) {
      setError(err.message || t('pages.propertyServices.errorFormData', 'Failed to load form data'));
    }
    await loadServices();
  }, [loadMeta, loadServices]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_SERVICE_FORM);
    setEditingId(null);
    setFormErrors({});
    setSubmitError(null);
  };

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
      const fresh = await fetchPropertyServiceById(item.id);
      setEditingId(fresh.id);
      setForm(mapPropertyServiceToForm(fresh));
    } catch (err) {
      setSubmitError(formatApiErrors(err.data) || err.message || t('pages.propertyServices.errorLoadService', 'Failed to load service'));
      setShowForm(false);
    } finally {
      setLoadingEditId(null);
    }
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = () => {
    const next = validatePropertyServiceForm(form, { requireProperty: true });
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await updatePropertyService(editingId, form);
        notify.success(t('pages.propertyServices.updateSuccess', 'Service updated successfully'), { message: form.name });
      } else {
        const created = await createPropertyService(form);
        notify.success(t('pages.propertyServices.createSuccess', 'Service created successfully'), { message: created.name });
      }
      closeForm();
      await loadServices();
    } catch (err) {
      const fieldErrors = err.data && typeof err.data === 'object' ? err.data : null;
      if (fieldErrors && !fieldErrors.detail) {
        const mapped = {};
        Object.entries(fieldErrors).forEach(([key, val]) => {
          const field = key === 'category' ? 'category_id' : key;
          mapped[field] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFormErrors(mapped);
      }
      const message = formatApiErrors(err.data) || err.message;
      setSubmitError(message);
      notify.error(editingId ? t('pages.propertyServices.updateError', 'Failed to update service') : t('pages.propertyServices.createError', 'Failed to create service'), { message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item = deleteTarget) => {
    if (!item) return;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await deletePropertyService(item.id);
      if (editingId === item.id) closeForm();
      await loadServices();
      notify.success(t('pages.propertyServices.deleteSuccess', 'Service deleted successfully'), { message: item.name });
      setDeleteTarget(null);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setDeleteError(message);
      notify.error(t('pages.propertyServices.deleteError', 'Failed to delete service'), { message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = async (e) => {
    const value = e.target.value;
    setFilterPropertyId(value);
    await loadServices(value);
  };

  const propertyName = (id) => properties.find((p) => p.id === String(id))?.name || (id ? `#${id}` : '—');
  const categoryName = (id) => categories.find((c) => c.id === String(id))?.name || (id ? `#${id}` : '—');
  const displayCategory = (item) => item.categoryName || categoryName(item.categoryId);
  const displayProperty = (item) => item.propertyName || propertyName(item.property);

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.propertyServices.title', 'Property services')}</h2>
          <p>{t('pages.propertyServices.subtitle', 'Manage services offered at each property')}</p>
        </div>
        <div className="admin-header-actions">
          <AdminIconButton icon="refresh-cw" label={t('common.refresh', 'Refresh')} onClick={load} disabled={loading} loading={loading} />
          <button
            type="button"
            className="admin-btn admin-btn-primary link-with-icon"
            onClick={() => (showForm ? closeForm() : openCreateForm())}
            disabled={properties.length === 0 || categories.length === 0}
          >
            <Icon name="plus" size={16} />
            <span>{showForm ? t('common.cancel', 'Cancel') : t('pages.propertyServices.addService', 'Add service')}</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="admin-alert admin-alert-error">
          <strong>{t('pages.propertyServices.deleteErrorTitle', 'Could not delete service')}</strong>
          <pre>{deleteError}</pre>
        </div>
      )}

      <section className="admin-panel-card admin-service-filter-bar">
        <div className="form-group">
          <label htmlFor="filter-property">{t('pages.propertyServices.filterProperty', 'Filter by property')}</label>
          <select id="filter-property" value={filterPropertyId} onChange={handleFilterChange}>
            <option value="">{t('pages.propertyServices.allProperties', 'All properties')}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </section>

      {showForm && (
        <div className="admin-catalog-drawer-shell" role="presentation" onClick={submitting ? undefined : closeForm}>
          <section
            className="admin-panel-card admin-service-form-card admin-catalog-drawer admin-catalog-drawer--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-service-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="admin-catalog-drawer__head">
            <h3 id="property-service-drawer-title">{editingId ? t('pages.propertyServices.editService', 'Edit service #{{id}}', { id: editingId }) : t('pages.propertyServices.addPropertyService', 'Add property service')}</h3>
            <button type="button" className="admin-modal__close" onClick={closeForm} disabled={submitting || !!loadingEditId} aria-label={t('common.close', 'Close')}>
              <Icon name="x" size={18} />
            </button>
          </div>
          {loadingEditId && <ApiLoading message={t('pages.propertyServices.loadingService', 'Loading service...')} variant="form" />}
          {submitError && (
            <div className="admin-alert admin-alert-error">
              <pre>{submitError}</pre>
            </div>
          )}
          <form onSubmit={handleSubmit} className="admin-service-form" noValidate>
            <fieldset disabled={submitting || !!loadingEditId}>
              <PropertyServiceFormFields
                form={form}
                formErrors={formErrors}
                properties={properties}
                categories={categories}
                onFieldChange={updateField}
                disabled={submitting || !!loadingEditId}
              />

              <div className="admin-service-form-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={closeForm} disabled={submitting}>
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting || !!loadingEditId}>
                  {submitting ? t('common.saving', 'Saving…') : editingId ? t('common.saveChanges', 'Save changes') : t('pages.propertyServices.createService', 'Create service')}
                </button>
              </div>
            </fieldset>
          </form>
          </section>
        </div>
      )}

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <ApiLoading message={t('pages.propertyServices.loading', 'Loading services...')} variant="table" />}

      {!loading && !error && services.length === 0 && (
        <div className="admin-panel-card admin-empty-state">
          <h3>{t('pages.propertyServices.emptyTitle', 'No services yet')}</h3>
          <p>{t('pages.propertyServices.emptyDesc', 'Add services guests can browse on property detail pages.')}</p>
          {properties.length > 0 && categories.length > 0 && (
            <button type="button" className="admin-btn admin-btn-primary link-with-icon admin-empty-action" onClick={openCreateForm}>
              <Icon name="plus" size={16} />
              <span>{t('pages.propertyServices.emptyAction', 'Add first service')}</span>
            </button>
          )}
        </div>
      )}

      {!loading && !error && services.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {t('pages.propertyServices.count', '{{count}} services', { count: services.length })}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('common.name', 'Name')}</th>
                  <th>{t('pages.propertyServices.nameAr', 'Name (Arabic)')}</th>
                  <th>{t('common.property', 'Property')}</th>
                  <th>{t('pages.propertyServices.category', 'Category')}</th>
                  <th>{t('pages.propertyServices.price', 'Price')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {services.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      {item.isFeatured && <span className="badge badge-pending admin-service-featured">{t('pages.propertyServices.featured', 'Featured')}</span>}
                    </td>
                    <td className="admin-amenity-name-ar-cell" dir="rtl">
                      {item.nameAr || <span className="admin-muted-cell">—</span>}
                    </td>
                    <td>{displayProperty(item)}</td>
                    <td>{displayCategory(item)}</td>
                    <td>
                      {item.pricingType === 'free'
                        ? t('pages.propertyServices.free', 'Free')
                        : `${item.price} ${item.currency}`}
                    </td>
                    <td>
                      <span className={`badge ${item.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {item.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="admin-actions-cell">
                      <div className="admin-icon-actions">
                        <AdminIconButton
                          icon="pencil"
                          label={t('pages.propertyServices.editAction', 'Edit service')}
                          variant="primary"
                          onClick={() => openEditForm(item)}
                          disabled={deletingId === item.id || loadingEditId === item.id}
                          loading={loadingEditId === item.id}
                        />
                        <AdminIconButton
                          icon="trash-2"
                          label={t('pages.propertyServices.deleteAction', 'Delete service')}
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
        title={t('pages.propertyServices.deleteTitle', 'Delete service?')}
        message={deleteTarget ? t('pages.propertyServices.deleteMsg', '"{{name}}" will be removed.', { name: deleteTarget.name }) : ''}
        confirmLabel={t('pages.propertyServices.deleteBtn', 'Delete service')}
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete()}
      />
    </div>
  );
};

export default AdminPropertyServicesPage;
