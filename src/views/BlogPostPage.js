'use client';

import React from 'react';
import { Link } from '@/lib/router-compat';
import { useTranslation } from '@/context/I18nContext';
import Icon from '@/components/icons/Icon';
import { formatBlogDate, contentLooksLikeHtml } from '@/utils/blogDisplay';
import '@/styles/blog.css';

export default function BlogPostPage({ post }) {
  const { t, locale } = useTranslation();

  if (!post) {
    return (
      <div className="blog-page blog-post-page">
        <div className="blog-empty">
          <Icon name="file-text" size={40} />
          <h1>{t('blog.notFoundTitle', 'Article not found')}</h1>
          <p>{t('blog.notFoundDesc', 'This article may have been removed or is not published yet.')}</p>
          <Link to="/blog" className="guest-btn guest-btn-primary">
            {t('blog.backToBlog', 'Back to blog')}
          </Link>
        </div>
      </div>
    );
  }

  const publishedLabel = formatBlogDate(post.publishedAt, locale);
  const categoryName = post.category?.name || '';
  const authorName = post.author?.fullName || '';
  const htmlContent = contentLooksLikeHtml(post.content);

  return (
    <article className="blog-page blog-post-page">
      <nav className="blog-post-breadcrumb" aria-label={t('blog.breadcrumb', 'Breadcrumb')}>
        <Link to="/blog">{t('blog.title', 'Blog')}</Link>
        <Icon name="chevron-right" size={14} />
        <span>{post.title}</span>
      </nav>

      <header className="blog-post-header">
        <div className="blog-post-meta">
          {categoryName && <span className="blog-card-category">{categoryName}</span>}
          {publishedLabel && <time dateTime={post.publishedAt || undefined}>{publishedLabel}</time>}
          {authorName && (
            <span className="blog-post-author">
              {t('blog.byAuthor', 'By {{name}}', { name: authorName })}
            </span>
          )}
        </div>
        <h1>{post.title}</h1>
        {post.excerpt && <p className="blog-post-excerpt">{post.excerpt}</p>}
      </header>

      {post.featuredImage && (
        <figure className="blog-post-cover">
          <img src={post.featuredImage} alt={post.featuredImageAlt || post.title} />
        </figure>
      )}

      <div className="blog-post-content">
        {htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        ) : (
          post.content.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))
        )}
      </div>

      {post.hotel && (
        <aside className="blog-post-hotel-cta">
          <div>
            <p className="blog-post-hotel-label">{t('blog.relatedHotel', 'Featured property')}</p>
            <h2>{post.hotel.name}</h2>
            {(post.hotel.city || post.hotel.country) && (
              <p className="blog-post-hotel-location">
                <Icon name="map-pin" size={16} />
                <span>{[post.hotel.city, post.hotel.country].filter(Boolean).join(', ')}</span>
              </p>
            )}
          </div>
          <Link to={`/hotel/${post.hotel.id}`} className="guest-btn guest-btn-primary">
            {t('blog.viewHotel', 'View property')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </aside>
      )}

      <footer className="blog-post-footer">
        <Link to="/blog" className="blog-post-back link-with-icon">
          <Icon name="arrow-left" size={16} />
          <span>{t('blog.backToBlog', 'Back to blog')}</span>
        </Link>
      </footer>
    </article>
  );
}
