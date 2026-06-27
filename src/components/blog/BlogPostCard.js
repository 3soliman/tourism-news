'use client';

import React from 'react';
import { Link } from '@/lib/router-compat';
import Icon from '@/components/icons/Icon';
import { formatBlogDate } from '@/utils/blogDisplay';

export default function BlogPostCard({ post, locale = 'en', t }) {
  if (!post) return null;

  const publishedLabel = formatBlogDate(post.publishedAt, locale);
  const categoryName = post.category?.name || '';

  return (
    <article className="blog-card">
      <Link to={`/blog/${post.slug}`} className="blog-card-link">
        <div className="blog-card-media">
          {post.featuredImage ? (
            <img src={post.featuredImage} alt={post.featuredImageAlt || post.title} loading="lazy" />
          ) : (
            <div className="blog-card-media-placeholder" aria-hidden="true">
              <Icon name="file-text" size={32} />
            </div>
          )}
        </div>
        <div className="blog-card-body">
          <div className="blog-card-meta">
            {categoryName && <span className="blog-card-category">{categoryName}</span>}
            {publishedLabel && (
              <time dateTime={post.publishedAt || undefined}>{publishedLabel}</time>
            )}
          </div>
          <h2 className="blog-card-title">{post.title}</h2>
          {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
          <span className="blog-card-read-more">
            {t('blog.readMore', 'Read article')}
            <Icon name="arrow-right" size={16} />
          </span>
        </div>
      </Link>
    </article>
  );
}
