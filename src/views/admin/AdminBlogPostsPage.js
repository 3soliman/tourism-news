'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EMPTY_BLOG_POST_FORM,
  fetchAdminBlogPostsPage,
  fetchAdminBlogPostById,
  createAdminBlogPost,
  updateAdminBlogPost,
  deleteAdminBlogPost,
  fetchAdminBlogCategories,
  mapBlogPostToForm,
  toDatetimeLocalValue
} from '@/api/blogApi';
import { fetchAdminProperties } from '@/api/propertiesApi';
import { ApiError, ApiLoading } from '@/components/shared/ApiStatus';
import { formatApiErrors } from '@/utils/hotelPayload';
import Icon from '@/components/icons/Icon';
import AdminIconButton from '@/components/admin/AdminIconButton';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useNotifications } from '@/components/shared/notifications/NotificationProvider';
import { useTranslation } from '@/context/I18nContext';
import { useAdmin } from '@/context/AdminContext';
import { Link } from '@/lib/router-compat';

const STATUS_OPTIONS = ['draft', 'scheduled', 'published', 'archived'];

const AdminBlogPostsPage = () => {
  const { t } = useTranslation();
  const { adminUser } = useAdmin();
  const notify = useNotifications();

  const [posts, setPosts] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [localeFilter, setLocaleFilter] = useState('');

  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);

  const [form, setForm] = useState(EMPTY_BLOG_POST_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const [cats, props] = await Promise.all([
        fetchAdminBlogCategories(),
        fetchAdminProperties()
      ]);
      setCategories(cats);
      setProperties(props);
    } catch {
      setCategories([]);
      setProperties([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAdminBlogPostsPage({
        page,
        pageSize: 20,
        status: statusFilter || undefined,
        locale: localeFilter || undefined
      });
      setPosts(result.results);
      setCount(result.count);
    } catch (err) {
      setError(err.message || t('pages.blogPosts.errorLoad', 'Failed to load blog posts'));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, localeFilter, t]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryOptions = useMemo(() => {
    if (!form.locale) return categories;
    return categories.filter((cat) => cat.locale === form.locale);
  }, [categories, form.locale]);

  const resetForm = () => {
    setForm({
      ...EMPTY_BLOG_POST_FORM,
      author_id: adminUser?.id ? String(adminUser.id) : '',
      published_at: toDatetimeLocalValue(new Date().toISOString())
    });
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
      const fresh = await fetchAdminBlogPostById(item.id);
      setEditingId(fresh.id);
      setForm(mapBlogPostToForm(fresh));
    } catch (err) {
      setSubmitError(formatApiErrors(err.data) || err.message || t('pages.blogPosts.errorLoadOne', 'Failed to load post'));
      setShowForm(false);
    } finally {
      setLoadingEditId(null);
    }
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const validateForm = () => {
    const next = {};
    if (!form.title.trim()) next.title = t('pages.blogPosts.titleRequired', 'Title is required');
    if (!form.slug.trim()) next.slug = t('pages.blogPosts.slugRequired', 'Slug is required');
    if (!form.excerpt.trim()) next.excerpt = t('pages.blogPosts.excerptRequired', 'Excerpt is required');
    if (!form.content.trim()) next.content = t('pages.blogPosts.contentRequired', 'Content is required');
    if (!form.featured_image.trim()) next.featured_image = t('pages.blogPosts.imageRequired', 'Featured image URL is required');
    if (!form.featured_image_alt.trim()) next.featured_image_alt = t('pages.blogPosts.imageAltRequired', 'Featured image alt is required');
    if (!form.category_id) next.category_id = t('pages.blogPosts.categoryRequired', 'Category is required');
    if (!form.published_at) next.published_at = t('pages.blogPosts.publishedAtRequired', 'Publish date is required');
    if (!form.author_id && !adminUser?.id) next.author_id = t('pages.blogPosts.authorRequired', 'Author is required');
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) return;

    const payload = {
      ...form,
      author_id: form.author_id || adminUser?.id || ''
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await updateAdminBlogPost(editingId, payload);
        notify.success(t('pages.blogPosts.updateSuccess', 'Post updated'));
      } else {
        await createAdminBlogPost(payload);
        notify.success(t('pages.blogPosts.createSuccess', 'Post created'));
      }
      closeForm();
      await load();
    } catch (err) {
      const fieldErrors = err.data && typeof err.data === 'object' ? err.data.errors || err.data : null;
      if (fieldErrors && !fieldErrors.detail && !fieldErrors.message) {
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
    try {
      await deleteAdminBlogPost(item.id);
      if (editingId === item.id) closeForm();
      await load();
      notify.success(t('pages.blogPosts.deleteSuccess', 'Post deleted'));
      setDeleteTarget(null);
    } catch (err) {
      notify.error(t('pages.blogPosts.deleteError', 'Failed to delete post'), {
        message: formatApiErrors(err.data) || err.message
      });
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / 20));

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.blogPosts.title', 'Blog posts')}</h2>
          <p>{t('pages.blogPosts.subtitle', 'Create and manage travel articles for the public blog')}</p>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin/blog/categories" className="admin-btn link-with-icon">
            <Icon name="folder" size={16} />
            <span>{t('pages.blogPosts.manageCategories', 'Categories')}</span>
          </Link>
          <AdminIconButton icon="refresh-cw" label={t('common.refresh', 'Refresh')} onClick={load} disabled={loading} loading={loading} />
          <button type="button" className="admin-btn admin-btn-primary link-with-icon" onClick={() => (showForm ? closeForm() : openCreateForm())}>
            <Icon name="plus" size={16} />
            <span>{showForm ? t('common.cancel', 'Cancel') : t('pages.blogPosts.add', 'Add post')}</span>
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <label>
          {t('pages.blogPosts.filterStatus', 'Status')}
          <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
            <option value="">{t('common.all', 'All')}</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          {t('pages.blogPosts.filterLocale', 'Locale')}
          <select value={localeFilter} onChange={(e) => { setPage(1); setLocaleFilter(e.target.value); }}>
            <option value="">{t('common.all', 'All')}</option>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
        </label>
      </div>

      {showForm && (
        <div className="admin-catalog-drawer-shell" role="presentation" onClick={submitting ? undefined : closeForm}>
          <section className="admin-panel-card admin-category-form-card admin-catalog-drawer admin-blog-drawer" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="admin-drawer-header">
              <h3>{editingId ? t('pages.blogPosts.edit', 'Edit post') : t('pages.blogPosts.add', 'Add post')}</h3>
              <button type="button" className="admin-icon-btn" onClick={closeForm} aria-label={t('common.close', 'Close')}>
                <Icon name="x" size={18} />
              </button>
            </header>
            {loadingEditId ? (
              <ApiLoading message={t('common.loading', 'Loading...')} />
            ) : (
              <form onSubmit={handleSubmit} className="admin-form-grid">
                {submitError && <div className="admin-alert admin-alert-error admin-form-span-2">{submitError}</div>}

                <label>
                  {t('pages.blogPosts.postTitle', 'Title')} *
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  {formErrors.title && <span className="admin-field-error">{formErrors.title}</span>}
                </label>
                <label>
                  {t('pages.blogPosts.slug', 'Slug')} *
                  <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
                  {formErrors.slug && <span className="admin-field-error">{formErrors.slug}</span>}
                </label>

                <label>
                  {t('pages.blogPosts.locale', 'Locale')} *
                  <select value={form.locale} onChange={(e) => setForm((f) => ({ ...f, locale: e.target.value, category_id: '' }))}>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </label>
                <label>
                  {t('pages.blogPosts.status', 'Status')} *
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label>
                  {t('pages.blogPosts.category', 'Category')} *
                  <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                    <option value="">{t('pages.blogPosts.selectCategory', 'Select category')}</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {formErrors.category_id && <span className="admin-field-error">{formErrors.category_id}</span>}
                </label>
                <label>
                  {t('pages.blogPosts.hotel', 'Linked property')}
                  <select value={form.hotel_id} onChange={(e) => setForm((f) => ({ ...f, hotel_id: e.target.value }))}>
                    <option value="">{t('pages.blogPosts.noHotel', 'None')}</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>{prop.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  {t('pages.blogPosts.publishedAt', 'Publish date')} *
                  <input type="datetime-local" value={form.published_at} onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))} />
                  {formErrors.published_at && <span className="admin-field-error">{formErrors.published_at}</span>}
                </label>
                <label>
                  {t('pages.blogPosts.featuredImage', 'Featured image URL')} *
                  <input value={form.featured_image} onChange={(e) => setForm((f) => ({ ...f, featured_image: e.target.value }))} placeholder="/media/blog/example.jpg" />
                  {formErrors.featured_image && <span className="admin-field-error">{formErrors.featured_image}</span>}
                </label>

                <label className="admin-form-span-2">
                  {t('pages.blogPosts.featuredImageAlt', 'Featured image alt')} *
                  <input value={form.featured_image_alt} onChange={(e) => setForm((f) => ({ ...f, featured_image_alt: e.target.value }))} />
                  {formErrors.featured_image_alt && <span className="admin-field-error">{formErrors.featured_image_alt}</span>}
                </label>

                <label className="admin-form-span-2">
                  {t('pages.blogPosts.excerpt', 'Excerpt')} *
                  <textarea rows={2} value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
                  {formErrors.excerpt && <span className="admin-field-error">{formErrors.excerpt}</span>}
                </label>

                <label className="admin-form-span-2">
                  {t('pages.blogPosts.content', 'Content')} *
                  <textarea rows={8} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
                  {formErrors.content && <span className="admin-field-error">{formErrors.content}</span>}
                </label>

                <label>
                  {t('pages.blogPosts.metaTitle', 'Meta title')}
                  <input value={form.meta_title} onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))} />
                </label>
                <label>
                  {t('pages.blogPosts.metaTitleAr', 'Meta title (AR)')}
                  <input value={form.meta_title_ar} onChange={(e) => setForm((f) => ({ ...f, meta_title_ar: e.target.value }))} />
                </label>
                <label className="admin-form-span-2">
                  {t('pages.blogPosts.metaDescription', 'Meta description')}
                  <textarea rows={2} value={form.meta_description} onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))} />
                </label>
                <label className="admin-form-span-2">
                  {t('pages.blogPosts.metaDescriptionAr', 'Meta description (AR)')}
                  <textarea rows={2} value={form.meta_description_ar} onChange={(e) => setForm((f) => ({ ...f, meta_description_ar: e.target.value }))} />
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
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('pages.blogPosts.postTitle', 'Title')}</th>
                  <th>{t('pages.blogPosts.slug', 'Slug')}</th>
                  <th>{t('pages.blogPosts.status', 'Status')}</th>
                  <th>{t('pages.blogPosts.locale', 'Locale')}</th>
                  <th>{t('pages.blogPosts.category', 'Category')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>
                      {item.status === 'published' ? (
                        <a href={`/blog/${item.slug}`} target="_blank" rel="noreferrer">{item.slug}</a>
                      ) : (
                        <code>{item.slug}</code>
                      )}
                    </td>
                    <td><span className={`admin-status-pill admin-status-${item.status}`}>{item.status}</span></td>
                    <td>{item.locale}</td>
                    <td>{item.category?.name || '—'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <AdminIconButton icon="pencil" label={t('common.edit', 'Edit')} onClick={() => openEditForm(item)} />
                        <AdminIconButton icon="trash-2" label={t('common.delete', 'Delete')} variant="danger" onClick={() => setDeleteTarget(item)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {!posts.length && (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">{t('pages.blogPosts.empty', 'No posts yet')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button type="button" className="admin-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t('common.previous', 'Previous')}
              </button>
              <span>{page} / {totalPages}</span>
              <button type="button" className="admin-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t('common.next', 'Next')}
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('pages.blogPosts.deleteConfirmTitle', 'Delete post?')}
        message={t('pages.blogPosts.deleteConfirm', 'This action cannot be undone.')}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        loading={Boolean(deletingId)}
        onConfirm={() => handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminBlogPostsPage;
