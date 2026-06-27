import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { resolveNextApiPath } from './pagination';
import { resolveMediaUrl } from '../utils/mapHotel';
import { optionalLocalizedApiValue } from '../utils/localeContent';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

function mapBlogAuthor(api) {
  if (!api) return null;
  return {
    id: String(api.id),
    fullName: api.full_name || api.fullName || '',
    email: api.email || ''
  };
}

export function mapBlogCategory(api) {
  if (!api) return null;
  return {
    id: String(api.id),
    name: api.name || '',
    slug: api.slug || '',
    description: api.description || '',
    locale: api.locale || 'en',
    isActive: api.is_active !== false,
    createdAt: api.created_at || null,
    updatedAt: api.updated_at || null
  };
}

function mapBlogHotel(api) {
  if (!api) return null;
  return {
    id: String(api.id),
    name: api.name || '',
    slug: api.slug || '',
    subdomain: api.subdomain || '',
    city: api.city || '',
    country: api.country || '',
    coverImageUrl: resolveMediaUrl(api.cover_image_url || ''),
    publishingStatus: api.publishing_status || ''
  };
}

export function mapBlogPost(api) {
  if (!api) return null;
  return {
    id: String(api.id),
    slug: api.slug || '',
    title: api.title || '',
    excerpt: api.excerpt || '',
    content: api.content || '',
    featuredImage: resolveMediaUrl(api.featured_image || ''),
    featuredImageRaw: api.featured_image || '',
    featuredImageAlt: api.featured_image_alt || '',
    metaTitle: api.meta_title || '',
    metaDescription: api.meta_description || '',
    metaTitleAr: api.meta_title_ar || '',
    metaDescriptionAr: api.meta_description_ar || '',
    status: api.status || 'draft',
    publishedAt: api.published_at || null,
    locale: api.locale || 'en',
    author: mapBlogAuthor(api.author),
    category: mapBlogCategory(api.category),
    hotel: mapBlogHotel(api.hotel),
    authorId: api.author_id != null ? String(api.author_id) : api.author?.id != null ? String(api.author.id) : '',
    categoryId: api.category_id != null ? String(api.category_id) : api.category?.id != null ? String(api.category.id) : '',
    hotelId: api.hotel_id != null ? String(api.hotel_id) : api.hotel?.id != null ? String(api.hotel.id) : '',
    createdAt: api.created_at || null,
    updatedAt: api.updated_at || null
  };
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

function mapPaginated(data, mapper) {
  return {
    count: data.count ?? parseList(data).length,
    next: data.next || null,
    previous: data.previous || null,
    results: parseList(data).map(mapper).filter(Boolean)
  };
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const EMPTY_BLOG_POST_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  featured_image_alt: '',
  meta_title: '',
  meta_description: '',
  meta_title_ar: '',
  meta_description_ar: '',
  status: 'draft',
  published_at: '',
  locale: 'en',
  category_id: '',
  hotel_id: '',
  author_id: ''
};

export const EMPTY_BLOG_CATEGORY_FORM = {
  name: '',
  slug: '',
  description: '',
  locale: 'en',
  is_active: true
};

export function mapBlogPostToForm(post) {
  if (!post) return { ...EMPTY_BLOG_POST_FORM };
  return {
    title: post.title || '',
    slug: post.slug || '',
    excerpt: post.excerpt || '',
    content: post.content || '',
    featured_image: post.featuredImageRaw || post.featuredImage || '',
    featured_image_alt: post.featuredImageAlt || '',
    meta_title: post.metaTitle || '',
    meta_description: post.metaDescription || '',
    meta_title_ar: post.metaTitleAr || '',
    meta_description_ar: post.metaDescriptionAr || '',
    status: post.status || 'draft',
    published_at: toDatetimeLocalValue(post.publishedAt),
    locale: post.locale || 'en',
    category_id: post.categoryId || '',
    hotel_id: post.hotelId || '',
    author_id: post.authorId || ''
  };
}

export function buildBlogPostPayload(form, { partial = false } = {}) {
  const payload = {};

  const setField = (key, value) => {
    if (partial && value === undefined) return;
    payload[key] = value;
  };

  if (!partial || form.title !== undefined) setField('title', String(form.title || '').trim());
  if (!partial || form.slug !== undefined) setField('slug', String(form.slug || '').trim().toLowerCase());
  if (!partial || form.excerpt !== undefined) setField('excerpt', String(form.excerpt || '').trim());
  if (!partial || form.content !== undefined) setField('content', String(form.content || '').trim());
  if (!partial || form.featured_image !== undefined) setField('featured_image', String(form.featured_image || '').trim());
  if (!partial || form.featured_image_alt !== undefined) setField('featured_image_alt', String(form.featured_image_alt || '').trim());
  if (!partial || form.status !== undefined) setField('status', form.status || 'draft');
  if (!partial || form.locale !== undefined) setField('locale', form.locale || 'en');

  if (!partial || form.meta_title !== undefined) setField('meta_title', optionalLocalizedApiValue(form.meta_title));
  if (!partial || form.meta_description !== undefined) setField('meta_description', optionalLocalizedApiValue(form.meta_description));
  if (!partial || form.meta_title_ar !== undefined) setField('meta_title_ar', optionalLocalizedApiValue(form.meta_title_ar));
  if (!partial || form.meta_description_ar !== undefined) setField('meta_description_ar', optionalLocalizedApiValue(form.meta_description_ar));

  if (!partial || form.published_at !== undefined) {
    setField('published_at', fromDatetimeLocalValue(form.published_at));
  }

  if (!partial || form.author_id !== undefined) {
    const authorId = form.author_id ? Number(form.author_id) : null;
    if (authorId) setField('author_id', authorId);
  }

  if (!partial || form.category_id !== undefined) {
    const categoryId = form.category_id ? Number(form.category_id) : null;
    if (categoryId) setField('category_id', categoryId);
  }

  if (!partial || form.hotel_id !== undefined) {
    const hotelRaw = String(form.hotel_id ?? '').trim();
    setField('hotel_id', hotelRaw ? Number(hotelRaw) : null);
  }

  return payload;
}

export function buildBlogCategoryPayload(form, { partial = false } = {}) {
  const payload = {};
  if (!partial || form.name !== undefined) payload.name = String(form.name || '').trim();
  if (!partial || form.slug !== undefined) payload.slug = String(form.slug || '').trim().toLowerCase();
  if (!partial || form.description !== undefined) payload.description = String(form.description || '').trim();
  if (!partial || form.locale !== undefined) payload.locale = form.locale || 'en';
  if (!partial || form.is_active !== undefined) payload.is_active = form.is_active !== false;
  return payload;
}

/** Public: paginated published posts */
export async function fetchPublicBlogPostsPage({ page = 1, pageSize = 12 } = {}) {
  const data = await apiGet(`/blog/posts/${buildQuery({ page, page_size: pageSize })}`);
  return mapPaginated(data, mapBlogPost);
}

/** Public: single published post by slug */
export async function fetchPublicBlogPostBySlug(slug) {
  const data = await apiGet(`/blog/posts/${encodeURIComponent(slug)}/`);
  return mapBlogPost(data);
}

/** Admin: paginated posts with optional filters */
export async function fetchAdminBlogPostsPage(params = {}) {
  const { page = 1, pageSize = 20, status, locale, categoryId, hotelId, authorId } = params;
  const data = await apiGet(
    `/admin/blog/posts/${buildQuery({
      page,
      page_size: pageSize,
      status,
      locale,
      category_id: categoryId,
      hotel_id: hotelId,
      author_id: authorId
    })}`
  );
  return mapPaginated(data, mapBlogPost);
}

/** Admin: all posts (all pages) */
export async function fetchAdminBlogPosts(params = {}) {
  let path = `/admin/blog/posts/${buildQuery({ ...params, page: 1, page_size: 100 })}`;
  const all = [];

  while (path) {
    const data = await apiGet(path);
    all.push(...parseList(data).map(mapBlogPost));
    path = resolveNextApiPath(data.next);
  }

  return all;
}

export async function fetchAdminBlogPostById(id) {
  const data = await apiGet(`/admin/blog/posts/${id}/`);
  return mapBlogPost(data);
}

export async function createAdminBlogPost(form) {
  const data = await apiPost('/admin/blog/posts/', buildBlogPostPayload(form));
  return mapBlogPost(data);
}

export async function updateAdminBlogPost(id, form) {
  const data = await apiPatch(`/admin/blog/posts/${id}/`, buildBlogPostPayload(form, { partial: true }));
  return mapBlogPost(data);
}

export async function deleteAdminBlogPost(id) {
  await apiDelete(`/admin/blog/posts/${id}/`);
}

/** Admin categories */
export async function fetchAdminBlogCategoriesPage({ page = 1, pageSize = 100, locale } = {}) {
  const data = await apiGet(`/admin/blog/categories/${buildQuery({ page, page_size: pageSize, locale })}`);
  return mapPaginated(data, mapBlogCategory);
}

export async function fetchAdminBlogCategories(params = {}) {
  let path = `/admin/blog/categories/${buildQuery({ ...params, page: 1, page_size: 100 })}`;
  const all = [];

  while (path) {
    const data = await apiGet(path);
    all.push(...parseList(data).map(mapBlogCategory));
    path = resolveNextApiPath(data.next);
  }

  return all;
}

export async function fetchAdminBlogCategoryById(id) {
  const data = await apiGet(`/admin/blog/categories/${id}/`);
  return mapBlogCategory(data);
}

export async function createAdminBlogCategory(form) {
  const data = await apiPost('/admin/blog/categories/', buildBlogCategoryPayload(form));
  return mapBlogCategory(data);
}

export async function updateAdminBlogCategory(id, form) {
  const data = await apiPatch(`/admin/blog/categories/${id}/`, buildBlogCategoryPayload(form, { partial: true }));
  return mapBlogCategory(data);
}

export async function deleteAdminBlogCategory(id) {
  await apiDelete(`/admin/blog/categories/${id}/`);
}

/** Backward-compatible aliases for SEO page */
export const fetchBlogPosts = fetchAdminBlogPosts;
export const updateBlogPost = updateAdminBlogPost;

export function mapBlogPostToSeoItem(post) {
  const isAr = post.locale === 'ar';
  const primaryMetaTitle = post.metaTitle || post.title || '';
  const primaryMetaDescription = post.metaDescription || post.excerpt || '';
  const statusScore = primaryMetaTitle && primaryMetaDescription ? 'good' : 'warning';

  return {
    id: post.id,
    type: 'blog',
    title: post.title,
    url: `/blog/${post.slug}`,
    status: statusScore,
    language: post.locale,
    city: post.hotel?.city || '',
    updated_at: (post.updatedAt || '').slice(0, 10),
    seo: {
      ar: {
        meta_title: isAr ? primaryMetaTitle : post.metaTitleAr || '',
        meta_description: isAr ? primaryMetaDescription : post.metaDescriptionAr || '',
        slug: post.slug || '',
        focus_keyword: '',
        og_title: isAr ? primaryMetaTitle : post.metaTitleAr || '',
        og_description: isAr ? primaryMetaDescription : post.metaDescriptionAr || '',
        image_alt: post.featuredImageAlt || ''
      },
      en: {
        meta_title: !isAr ? primaryMetaTitle : post.metaTitle || '',
        meta_description: !isAr ? primaryMetaDescription : post.metaDescription || '',
        slug: post.slug || '',
        focus_keyword: '',
        og_title: !isAr ? primaryMetaTitle : post.metaTitle || '',
        og_description: !isAr ? primaryMetaDescription : post.metaDescription || '',
        image_alt: post.featuredImageAlt || ''
      }
    }
  };
}
