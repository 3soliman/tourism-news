'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from '@/context/I18nContext';
import { fetchPublicBlogPostsPage } from '@/api/blogApi';
import { filterPostsByLocale } from '@/utils/blogDisplay';
import BlogPostCard from '@/components/blog/BlogPostCard';
import { ApiError, ApiLoading } from '@/components/shared/ApiStatus';
import Icon from '@/components/icons/Icon';
import '@/styles/blog.css';

const PAGE_SIZE = 12;

export default function BlogPage({ initialData = null }) {
  const { t, locale } = useTranslation();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const posts = useMemo(
    () => filterPostsByLocale(data?.results || [], locale),
    [data?.results, locale]
  );

  const loadPage = useCallback(async (nextPage, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await fetchPublicBlogPostsPage({ page: nextPage, pageSize: PAGE_SIZE });
      setData((prev) => {
        if (!append || !prev) return result;
        return {
          ...result,
          results: [...(prev.results || []), ...(result.results || [])]
        };
      });
      setPage(nextPage);
    } catch (err) {
      setError(err.message || t('blog.errorLoad', 'Failed to load blog posts'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  const hasMore = Boolean(data?.next);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    loadPage(page + 1, true);
  };

  if (loading && !posts.length) {
    return (
      <div className="blog-page">
        <ApiLoading message={t('blog.loading', 'Loading articles...')} />
      </div>
    );
  }

  return (
    <div className="blog-page">
      <header className="blog-page-hero">
        <p className="blog-page-eyebrow">{t('blog.eyebrow', 'Travel insights')}</p>
        <h1>{t('blog.title', 'Blog')}</h1>
        <p className="blog-page-subtitle">
          {t('blog.subtitle', 'Guides, tips, and stories to help you plan your next stay.')}
        </p>
      </header>

      {error && (
        <div className="blog-page-error">
          <ApiError message={error} onRetry={() => loadPage(1)} />
        </div>
      )}

      {!error && posts.length === 0 && (
        <div className="blog-empty">
          <Icon name="file-text" size={40} />
          <h2>{t('blog.emptyTitle', 'No articles yet')}</h2>
          <p>{t('blog.emptyDesc', 'Check back soon for new travel guides and hotel stories.')}</p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="blog-grid">
          {posts.map((post) => (
            <BlogPostCard key={post.id} post={post} locale={locale} t={t} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="blog-load-more">
          <button
            type="button"
            className="guest-btn guest-btn-secondary"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? t('blog.loadingMore', 'Loading...') : t('blog.loadMore', 'Load more articles')}
          </button>
        </div>
      )}
    </div>
  );
}
