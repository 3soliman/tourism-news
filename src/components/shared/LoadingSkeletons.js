import React from 'react';

const cx = (...parts) => parts.filter(Boolean).join(' ');

export const SkeletonLine = ({ width = '100%', height = 12, className = '' }) => (
  <span className={cx('skeleton', className)} style={{ width, height }} aria-hidden="true" />
);

const LoadingShell = ({ message, children, className = '' }) => (
  <div className={cx('loading-shell', className)} role="status" aria-live="polite" aria-label={message || 'Loading content'}>
    {message ? (
      <div className="loading-shell__head">
        <SkeletonLine width={96} height={10} />
        <p>{message}</p>
      </div>
    ) : null}
    {children}
  </div>
);

export const CardSkeleton = ({ count = 3, variant = 'property', message }) => (
  <LoadingShell message={message} className={`loading-shell--cards loading-shell--${variant}`}>
    <div className={`skeleton-grid skeleton-grid--${variant === 'property' ? 'properties' : 'cards'}`}>
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className={`skeleton-card skeleton-card--${variant}`}>
          {variant !== 'compact' && <span className="skeleton skeleton-image" />}
          <div className="skeleton-card__body">
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-text" />
            <span className="skeleton skeleton-text short" />
            <div className="skeleton-card__footer">
              <span className="skeleton skeleton-price" />
              <span className="skeleton skeleton-badge" />
            </div>
          </div>
        </article>
      ))}
    </div>
  </LoadingShell>
);

export const TableSkeleton = ({ columns = 5, rows = 5, message }) => (
  <LoadingShell message={message} className="loading-shell--table">
    <div className="skeleton-table-container">
      <div className="skeleton-table-row skeleton-table-row--head" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => <span key={index} className="skeleton" />)}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="skeleton-table-row" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, col) => <span key={col} className="skeleton" />)}
        </div>
      ))}
    </div>
  </LoadingShell>
);

export const FormSkeleton = ({ fields = 8, message }) => (
  <LoadingShell message={message} className="loading-shell--form">
    <div className="form-skeleton">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className={index % 3 === 2 ? 'form-skeleton__field form-skeleton__field--full' : 'form-skeleton__field'}>
          <SkeletonLine width={96} height={11} />
          <SkeletonLine height={42} className="form-skeleton__input" />
        </div>
      ))}
      <div className="form-skeleton__actions">
        <SkeletonLine width={110} height={40} />
        <SkeletonLine width={130} height={40} />
      </div>
    </div>
  </LoadingShell>
);

export const DashboardSkeleton = ({ message = 'Loading dashboard...' }) => (
  <LoadingShell message={message} className="loading-shell--dashboard">
    <div className="skeleton-dashboard-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <article key={index} className="skeleton-card skeleton-card--metric">
          <span className="skeleton skeleton-text short" />
          <span className="skeleton skeleton-metric" />
          <span className="skeleton skeleton-text tiny" />
        </article>
      ))}
    </div>
    <div className="dashboard-skeleton-charts">
      <span className="skeleton dashboard-skeleton-chart" />
      <span className="skeleton dashboard-skeleton-chart" />
    </div>
    <TableSkeleton columns={6} rows={4} />
  </LoadingShell>
);

export const GallerySkeleton = ({ thumbnails = 4, message }) => (
  <LoadingShell message={message} className="loading-shell--gallery">
    <div className="gallery-skeleton">
      <span className="skeleton gallery-skeleton__cover" />
      <div className="gallery-skeleton__thumbs">
        {Array.from({ length: thumbnails }).map((_, index) => (
          <span key={index} className="skeleton" />
        ))}
      </div>
    </div>
  </LoadingShell>
);

export const PageSkeleton = ({ type = 'default', message = 'Loading page...' }) => {
  if (type === 'dashboard') return <DashboardSkeleton message={message} />;
  if (type === 'property-detail') {
    return (
      <div className="hotel-detail-page page-skeleton-fade">
        <div className="breadcrumb"><SkeletonLine width={220} height={14} /></div>
        <GallerySkeleton message={message} />
        <section className="detail-header">
          <div>
            <SkeletonLine width="48%" height={34} />
            <SkeletonLine width="62%" height={16} />
            <SkeletonLine width="38%" height={16} />
          </div>
          <SkeletonLine width={140} height={96} />
        </section>
        <div className="detail-grid detail-grid--full">
          <div className="detail-main">
            <CardSkeleton count={1} variant="compact" />
            <CardSkeleton count={2} variant="room" />
            <CardSkeleton count={4} variant="compact" />
          </div>
        </div>
      </div>
    );
  }
  if (type === 'form') return <FormSkeleton message={message} />;
  return (
    <LoadingShell message={message} className="loading-shell--page">
      <SkeletonLine width="36%" height={28} />
      <SkeletonLine width="58%" height={14} />
      <CardSkeleton count={3} />
    </LoadingShell>
  );
};

export default PageSkeleton;
