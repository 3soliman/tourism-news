import { pickLocalizedText } from './localeContent';

export function formatBlogDate(iso, locale = 'en') {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

export function getBlogPostMetaTitle(post, locale = 'en') {
  if (!post) return '';
  if (locale === 'ar') {
    return pickLocalizedText('ar', post.metaTitleAr, post.metaTitle, post.title);
  }
  return pickLocalizedText('en', post.metaTitleAr, post.metaTitle, post.title);
}

export function getBlogPostMetaDescription(post, locale = 'en') {
  if (!post) return '';
  if (locale === 'ar') {
    return pickLocalizedText('ar', post.metaDescriptionAr, post.metaDescription, post.excerpt);
  }
  return pickLocalizedText('en', post.metaDescriptionAr, post.metaDescription, post.excerpt);
}

export function filterPostsByLocale(posts, locale) {
  if (!locale) return posts;
  const filtered = posts.filter((post) => post.locale === locale);
  return filtered.length ? filtered : posts;
}

export function contentLooksLikeHtml(content) {
  return /<[a-z][\s\S]*>/i.test(String(content || ''));
}
