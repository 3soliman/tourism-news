'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EMPTY_BLOG_CATEGORY_FORM,
  fetchAdminBlogCategories,
  createAdminBlogCategory,
  updateAdminBlogCategory,
  deleteAdminBlogCategory,
  fetchAdminBlogCategoryById
} from '@/api/blogApi';
import { ApiError, ApiLoading } from '@/components/shared/ApiStatus';
import { formatApiErrors } from '@/utils/hotelPayload';
import Icon from '@/components/icons/Icon';
import AdminIconButton from '@/components/admin/AdminIconButton';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useNotifications } from '@/components/shared/notifications/NotificationProvider';
import { useTranslation } from '@/context/I18nContext';

const AdminBlogCategoriesPage = () => {
  const { t } = useTranslation();
  const notify = useNotifications();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_BLOG_CATEGORY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState(null);
  const [localeFilter, setLocaleFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchAdminBlogCategories());
    } catch (err) {
      setError(err.message || t('pages.blogCategories.errorLoad', 'Failed to load blog categories'));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCategories = useMemo(() => {
    if (localeFilter === 'all') return categories;
    return categories.filter((item) => item.locale === localeFilter);
  }, [categories, localeFilter]);

  const resetForm = () => {
    setForm(EMPTY_BLOG_CATEGORY_FORM);
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
    try {
      const fresh = await fetchAdminBlogCategoryById(item.id);
      setEditingId(fresh.id);
      setForm({
        name: fresh.name,
        slug: fresh.slug,
        description: fresh.description,
        locale: fresh.locale,
        is_active: fresh.isActive
      });
    } catch (err) {
      setSubmitError(formatApiErrors(err.data) || err.message || t('pages.blogCategories.errorLoadOne', 'Failed to load category'));
      setShowForm(false);
    } finally {
      setLoadingEditId(null);
    }
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    const next = {};
    if (!form.name.trim()) next.name = t('pages.blogCategories.nameRequired', 'Name is required');
    if (!form.slug.trim()) next.slug = t('pages.blogCategories.slugRequired', 'Slug is required');
    setFormErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      if (editingId) {
        await updateAdminBlogCategory(editingId, form);
        notify.success(t('pages.blogCategories.updateSuccess', 'Category updated'));
      } else {
        await createAdminBlogCategory(form);
        notify.success(t('pages.blogCategories.createSuccess', 'Category created'));
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
      notify.error(t('common.error', 'Error'), { message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item = deleteTarget) => {
    if (!item) return;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await deleteAdminBlogCategory(item.id);
      if (editingId === item.id) closeForm();
      await load();
      notify.success(t('pages.blogCategories.deleteSuccess', 'Category deleted'));
      setDeleteTarget(null);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setDeleteError(message);
      notify.error(t('pages.blogCategories.deleteError', 'Failed to delete category'), { message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.blogCategories.title', 'Blog categories')}</h2>
          <p>{t('pages.blogCategories.subtitle', 'Organize blog articles by topic and locale')}</p>
        </div>
        <div className="admin-header-actions">
          <AdminIconButton icon="refresh-cw" label={t('common.refresh', 'Refresh')} onClick={load} disabled={loading} loading={loading} />
          <button type="button" className="admin-btn admin-btn-primary link-with-icon" onClick={() => (showForm ? closeForm() : openCreateForm())}>
            <Icon name="plus" size={16} />
            <span>{showForm ? t('common.cancel', 'Cancel') : t('pages.blogCategories.add', 'Add category')}</span>
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <label>
          {t('pages.blogCategories.filterLocale', 'Locale')}
          <select value={localeFilter} onChange={(e) => setLocaleFilter(e.target.value)}>
            <option value="all">{t('common.all', 'All')}</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>
      </div>

      {deleteError && (
        <div className="admin-alert admin-alert-error">
          <strong>{t('pages.blogCategories.deleteError', 'Failed to delete category')}</strong>
          <pre>{deleteError}</pre>
        </div>
      )}

      {showForm && (
        <div className="admin-catalog-drawer-shell" role="presentation" onClick={submitting ? undefined : closeForm}>
          <section className="admin-panel-card admin-category-form-card admin-catalog-drawer" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="admin-drawer-header">
              <h3>{editingId ? t('pages.blogCategories.edit', 'Edit category') : t('pages.blogCategories.add', 'Add category')}</h3>
              <button type="button" className="admin-icon-btn" onClick={closeForm} aria-label={t('common.close', 'Close')}>
                <Icon name="x" size={18} />
              </button>
            </header>
            {loadingEditId ? (
              <ApiLoading message={t('common.loading', 'Loading...')} />
            ) : (
              <form onSubmit={handleSubmit} className="admin-form-grid">
                {submitError && <div className="admin-alert admin-alert-error">{submitError}</div>}
                <label>
                  {t('pages.blogCategories.name', 'Name')} *
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  {formErrors.name && <span className="admin-field-error">{formErrors.name}</span>}
                </label>
                <label>
                  {t('pages.blogCategories.slug', 'Slug')} *
                  <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                  {formErrors.slug && <span className="admin-field-error">{formErrors.slug}</span>}
                </label>
                <label>
                  {t('pages.blogCategories.locale', 'Locale')} *
                  <select value={form.locale} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value }))}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </label>
                <label className="admin-form-span-2">
                  {t('pages.blogCategories.description', 'Description')}
                  <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </label>
                <label className="admin-checkbox-label">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  {t('pages.blogCategories.active', 'Active')}
                </label>
                <div className="admin-form-actions admin-form-span-2">
                  <button type="button" className="admin-btn" onClick={closeForm} disabled={submitting}>{t('common.cancel', 'Cancel')}</button>
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
                    {submitting ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {loading ? (
        <ApiLoading message={t('common.loading', 'Loading...')} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('pages.blogCategories.name', 'Name')}</th>
                <th>{t('pages.blogCategories.slug', 'Slug')}</th>
                <th>{t('pages.blogCategories.locale', 'Locale')}</th>
                <th>{t('pages.blogCategories.active', 'Active')}</th>
                <th>{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td><code>{item.slug}</code></td>
                  <td>{item.locale}</td>
                  <td>{item.isActive ? t('common.yes', 'Yes') : t('common.no', 'No')}</td>
                  <td>
                    <div className="admin-row-actions">
                      <AdminIconButton icon="pencil" label={t('common.edit', 'Edit')} onClick={() => openEditForm(item)} />
                      <AdminIconButton icon="trash-2" label={t('common.delete', 'Delete')} variant="danger" onClick={() => setDeleteTarget(item)} />
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredCategories.length && (
                <tr>
                  <td colSpan={5} className="admin-table-empty">{t('pages.blogCategories.empty', 'No categories yet')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('pages.blogCategories.deleteConfirmTitle', 'Delete category?')}
        message={t('pages.blogCategories.deleteConfirm', 'Categories with posts cannot be deleted.')}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        loading={Boolean(deletingId)}
        onConfirm={() => handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminBlogCategoriesPage;
