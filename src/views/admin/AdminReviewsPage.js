'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { fetchAdminProperties } from '../../api/propertiesApi';
import {
  fetchAllAdminReviews,
  fetchPropertyReviewSummary,
  filterAdminReviews,
  deletePropertyReview,
  updatePropertyReview,
  buildPropertyReviewStats
} from '../../api/reviewsApi';
import ReviewTrustPanel from '../../components/hotel/ReviewTrustPanel';
import StarRating from '../../components/icons/StarRating';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import AdminIconButton from '../../components/admin/AdminIconButton';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import { useTranslation } from '../../context/I18nContext';

const RATING_FILTERS = ['all', '5', '4', '3', '2', '1'];

function formatReviewDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const SUB_RATINGS = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'location', label: 'Location' },
  { key: 'staff', label: 'Staff' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'valueForMoney', label: 'Value for money' }
];

const AdminReviewsPage = () => {
  const { t } = useTranslation();
  const notify = useNotifications();
  const [properties, setProperties] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const propertyStats = useMemo(() => buildPropertyReviewStats(allReviews), [allReviews]);

  const enrichedProperties = useMemo(
    () =>
      properties.map((property) => ({
        ...property,
        reviewCount: propertyStats[property.id]?.reviewCount ?? 0,
        averageRating: propertyStats[property.id]?.averageRating ?? null
      })),
    [properties, propertyStats]
  );

  const reviews = useMemo(() => {
    if (!filterPropertyId) return [];
    const property = enrichedProperties.find((p) => p.id === filterPropertyId);
    return allReviews.map((review) =>
      review.propertyId === filterPropertyId
        ? { ...review, propertyName: review.propertyName || property?.name || '' }
        : review
    ).filter((review) => review.propertyId === filterPropertyId);
  }, [allReviews, filterPropertyId, enrichedProperties]);

  const loadProperties = useCallback(async () => {
    setProperties(await fetchAdminProperties());
  }, []);

  const loadAllReviews = useCallback(async ({ force = false } = {}) => {
    const list = await fetchAllAdminReviews({ force });
    setAllReviews(list);
  }, []);

  const loadSummary = useCallback(async ({ force = false } = {}) => {
    if (!filterPropertyId) {
      setSummary(null);
      return;
    }

    setSummaryLoading(true);
    try {
      setSummary(await fetchPropertyReviewSummary(filterPropertyId, { force }));
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [filterPropertyId]);

  const load = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadProperties(), loadAllReviews({ force })]);
    } catch (err) {
      setError(err.message || t('pages.reviews.errorLoad', 'Failed to load reviews'));
    } finally {
      setLoading(false);
    }
  }, [loadAllReviews, loadProperties, t]);

  useEffect(() => {
    load({ force: true });
  }, [load]);

  useEffect(() => {
    if (!filterPropertyId) {
      setSummary(null);
      return;
    }
    loadSummary({ force: true });
  }, [filterPropertyId, loadSummary]);

  const filteredReviews = useMemo(
    () => filterAdminReviews(reviews, { rating: filterRating, query: searchQuery }),
    [reviews, filterRating, searchQuery]
  );

  const overviewStats = useMemo(() => {
    const activeReviews = allReviews.filter((review) => review.isActive !== false);
    const propertyIds = new Set(activeReviews.map((review) => review.propertyId).filter(Boolean));
    const rated = enrichedProperties.filter(
      (property) => property.averageRating != null && (property.reviewCount ?? 0) > 0
    );
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, property) => sum + Number(property.averageRating), 0) / rated.length
        : activeReviews.length > 0
          ? activeReviews.reduce((sum, review) => sum + Number(review.rating), 0) / activeReviews.length
          : null;

    return {
      propertyCount: enrichedProperties.length,
      propertiesWithReviews: propertyIds.size,
      totalReviews: activeReviews.length,
      avgRating
    };
  }, [allReviews, enrichedProperties]);

  const ratingCounts = useMemo(() => {
    const counts = { all: reviews.length, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const bucket = String(Math.round(review.rating));
      if (counts[bucket] != null) counts[bucket] += 1;
    });
    return counts;
  }, [reviews]);

  const selectedProperty = enrichedProperties.find((property) => property.id === filterPropertyId);

  const refreshAll = useCallback(async () => {
    await load({ force: true });
    if (filterPropertyId) {
      await loadSummary({ force: true });
    }
  }, [filterPropertyId, load, loadSummary]);

  const handleDelete = async (review) => {
    if (
      !window.confirm(
        t(
          'pages.reviews.confirmDelete',
          'Delete review by {{guest}} for {{property}}?',
          {
            guest: review.guestName,
            property: review.propertyName || t('common.property', 'this property')
          }
        )
      )
    ) {
      return;
    }

    setDeletingId(review.id);
    setActionError(null);
    try {
      await deletePropertyReview(review.propertyId, review.apiId ?? review.id);
      setExpandedId((current) => (current === review.id ? null : current));
      await refreshAll();
      notify.success(t('pages.reviews.deleteSuccess', 'Review deleted successfully'));
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message || t('pages.reviews.deleteError', 'Could not delete review');
      setActionError(message);
      notify.error(t('pages.reviews.deleteError', 'Could not delete review'), { message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (review) => {
    const nextActive = review.isActive === false;
    setTogglingId(review.id);
    setActionError(null);
    try {
      await updatePropertyReview(review.propertyId, review.apiId ?? review.id, {
        is_active: nextActive
      });
      await refreshAll();
      notify.success(
        nextActive
          ? t('pages.reviews.restoreSuccess', 'Review restored successfully')
          : t('pages.reviews.hideSuccess', 'Review hidden from guests')
      );
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message || t('pages.reviews.updateError', 'Could not update review');
      setActionError(message);
      notify.error(t('pages.reviews.updateError', 'Could not update review'), { message });
    } finally {
      setTogglingId(null);
    }
  };

  const toggleExpanded = (reviewId) => {
    setExpandedId((current) => (current === reviewId ? null : reviewId));
  };

  return (
    <div className="admin-page admin-reviews-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.reviews.title', 'Guest reviews')}</h2>
          <p>{t('pages.reviews.subtitle', 'Moderate reviews submitted on property pages')}</p>
        </div>
        <AdminIconButton
          icon="refresh-cw"
          label={t('common.refresh', 'Refresh')}
          onClick={refreshAll}
          disabled={loading}
          loading={loading}
        />
      </div>

      {actionError && (
        <div className="admin-alert admin-alert-error">
          <pre>{actionError}</pre>
        </div>
      )}

      <section className="admin-kpi-grid admin-reviews-kpi-grid">
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">{t('pages.reviews.kpiProperties', 'Properties')}</span>
          <strong className="admin-kpi-value">{overviewStats.propertyCount}</strong>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">{t('pages.reviews.kpiWithReviews', 'With reviews')}</span>
          <strong className="admin-kpi-value">{overviewStats.propertiesWithReviews}</strong>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">{t('pages.reviews.kpiTotalReviews', 'Total reviews')}</span>
          <strong className="admin-kpi-value">{overviewStats.totalReviews}</strong>
        </article>
        <article className="admin-kpi-card">
          <span className="admin-kpi-label">{t('pages.reviews.kpiNetworkAvg', 'Network avg.')}</span>
          <strong className="admin-kpi-value">
            {overviewStats.avgRating != null ? overviewStats.avgRating.toFixed(1) : '—'}
          </strong>
        </article>
      </section>

      <section className="admin-panel-card admin-service-filter-bar admin-reviews-filters">
        <div className="form-group">
          <label htmlFor="filter-review-property">{t('common.property', 'Property')}</label>
          <select
            id="filter-review-property"
            value={filterPropertyId}
            onChange={(e) => {
              setFilterPropertyId(e.target.value);
              setExpandedId(null);
              setActionError(null);
              setFilterRating('all');
              setSearchQuery('');
            }}
          >
            <option value="">{t('pages.reviews.selectProperty', 'Select a property…')}</option>
            {enrichedProperties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
                {(property.reviewCount ?? 0) > 0
                  ? ` · ${property.reviewCount} ${t('pages.reviews.reviewCountLabel', property.reviewCount === 1 ? 'review' : 'reviews')}`
                  : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="filter-review-search">{t('common.search', 'Search')}</label>
          <input
            id="filter-review-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pages.reviews.searchPlaceholder', 'Guest, title, or comment')}
            disabled={!filterPropertyId}
          />
        </div>
      </section>

      {loading && !error && <ApiLoading message={t('pages.reviews.loading', 'Loading reviews...')} variant="table" />}

      {!loading && !filterPropertyId && !error && (
        <section className="admin-panel-card">
          <h3>{t('pages.reviews.overviewTitle', 'Properties overview')}</h3>
          <p className="admin-hint">
            {t('pages.reviews.overviewHint', 'Select a property above to inspect individual reviews.')}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>{t('common.property', 'Property')}</th>
                  <th>{t('common.city', 'City')}</th>
                  <th>{t('pages.reviews.avgRating', 'Avg. rating')}</th>
                  <th>{t('pages.reviews.reviews', 'Reviews')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {enrichedProperties.map((property) => (
                  <tr key={property.id}>
                    <td><strong>{property.name}</strong></td>
                    <td>{property.city || '—'}</td>
                    <td>
                      {property.averageRating != null ? (
                        <span className="admin-review-rating-inline">
                          <StarRating value={property.averageRating} size={14} />
                          {Number(property.averageRating).toFixed(1)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{property.reviewCount ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => setFilterPropertyId(property.id)}
                      >
                        {t('pages.reviews.manageReviews', 'Manage reviews')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {filterPropertyId && !loading && (
        <>
          <section className="admin-panel-card admin-reviews-property-head">
            <div>
              <h3>{selectedProperty?.name || `Property #${filterPropertyId}`}</h3>
              <p className="admin-hint">
                {selectedProperty?.city || '—'}
                {selectedProperty?.reviewCount != null && (
                  <>
                    {' '}
                    · {selectedProperty.reviewCount}{' '}
                    {t(
                      'pages.reviews.publishedReviews',
                      selectedProperty.reviewCount === 1 ? 'published review' : 'published reviews'
                    )}
                  </>
                )}
              </p>
            </div>
            <Link to={`/hotel/${filterPropertyId}#guest-reviews`} className="admin-btn admin-btn-secondary">
              {t('pages.reviews.viewGuestSite', 'View on guest site')}
            </Link>
          </section>

          {summaryLoading ? (
            <ApiLoading message={t('pages.reviews.loadingSummary', 'Loading review summary...')} variant="dashboard" />
          ) : summary && (summary.totalReviews ?? 0) > 0 ? (
            <section className="admin-panel-card admin-reviews-summary-card">
              <ReviewTrustPanel summary={summary} variant="admin" />
            </section>
          ) : null}

          <div className="admin-filters">
            {RATING_FILTERS.map((rating) => (
              <button
                key={rating}
                type="button"
                className={`admin-filter-btn ${filterRating === rating ? 'active' : ''}`}
                onClick={() => setFilterRating(rating)}
              >
                {rating === 'all'
                  ? t('pages.reviews.allRatings', 'All ratings')
                  : t('pages.reviews.starsFilter', '{{stars}} stars', { stars: rating })}{' '}
                ({ratingCounts[rating] ?? 0})
              </button>
            ))}
          </div>
        </>
      )}

      {error && <ApiError message={error} onRetry={refreshAll} />}

      {!loading && filterPropertyId && !error && filteredReviews.length === 0 && (
        <div className="admin-panel-card admin-empty-state">
          <h3>{t('pages.reviews.emptyTitle', 'No reviews found')}</h3>
          <p>
            {reviews.length === 0
              ? t('pages.reviews.emptyProperty', 'This property has no guest reviews yet.')
              : t('pages.reviews.emptyFilter', 'No reviews match your search or rating filter.')}
          </p>
        </div>
      )}

      {!loading && filterPropertyId && !error && filteredReviews.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {filteredReviews.length}{' '}
            {t('pages.reviews.reviewCountLabel', filteredReviews.length === 1 ? 'review' : 'reviews')}
            {filteredReviews.length !== reviews.length && ` (${t('common.of', 'of')} ${reviews.length})`}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>{t('pages.reviews.guest', 'Guest')}</th>
                  <th>{t('pages.reviews.rating', 'Rating')}</th>
                  <th>{t('pages.reviews.titleCol', 'Title')}</th>
                  <th>{t('pages.reviews.comment', 'Comment')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>{t('common.date', 'Date')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((review) => (
                  <React.Fragment key={review.id}>
                    <tr className={review.isActive === false ? 'admin-review-row--hidden' : undefined}>
                      <td>
                        <strong>{review.guestName}</strong>
                        {review.guestEmail && (
                          <>
                            <br />
                            <small>{review.guestEmail}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <span className="admin-review-rating-inline">
                          <StarRating value={review.rating} size={14} />
                          {review.rating.toFixed(1)}
                        </span>
                      </td>
                      <td>{review.title || '—'}</td>
                      <td className="admin-review-comment-cell">
                        {review.comment.length > 120
                          ? `${review.comment.slice(0, 120)}…`
                          : review.comment || '—'}
                      </td>
                      <td>
                        <span className={`badge ${review.isActive !== false ? 'badge-confirmed' : 'badge-cancelled'}`}>
                          {review.isActive !== false
                            ? t('common.active', 'Active')
                            : t('common.hidden', 'Hidden')}
                        </span>
                      </td>
                      <td>{formatReviewDate(review.createdAt)}</td>
                      <td className="admin-actions-cell">
                        <div className="admin-icon-actions">
                          <AdminIconButton
                            icon={expandedId === review.id ? 'eye-off' : 'eye'}
                            label={
                              expandedId === review.id
                                ? t('pages.reviews.hideDetails', 'Hide details')
                                : t('pages.reviews.viewDetails', 'View details')
                            }
                            variant="primary"
                            onClick={() => toggleExpanded(review.id)}
                          />
                          <AdminIconButton
                            icon={review.isActive === false ? 'eye' : 'eye-off'}
                            label={
                              review.isActive === false
                                ? t('pages.reviews.restore', 'Restore review')
                                : t('pages.reviews.hide', 'Hide from guests')
                            }
                            variant="secondary"
                            onClick={() => handleToggleActive(review)}
                            disabled={togglingId === review.id || deletingId === review.id}
                            loading={togglingId === review.id}
                          />
                          <AdminIconButton
                            icon="trash-2"
                            label={t('pages.reviews.delete', 'Delete review')}
                            variant="danger"
                            onClick={() => handleDelete(review)}
                            disabled={deletingId === review.id || togglingId === review.id}
                            loading={deletingId === review.id}
                          />
                        </div>
                      </td>
                    </tr>
                    {expandedId === review.id && (
                      <tr className="admin-booking-detail-row">
                        <td colSpan={7}>
                          <div className="admin-booking-detail admin-review-detail">
                            <div className="admin-booking-detail-grid">
                              <div>
                                <h4>{t('pages.reviews.guest', 'Guest')}</h4>
                                <p><strong>{review.guestName}</strong></p>
                                <p>{review.guestEmail || '—'}</p>
                                <p className="admin-hint">
                                  {t('pages.reviews.posted', 'Posted')}: {formatReviewDate(review.createdAt)}
                                </p>
                              </div>
                              <div>
                                <h4>{t('pages.reviews.overall', 'Overall')}</h4>
                                <p className="admin-review-rating-inline">
                                  <StarRating value={review.rating} size={16} />
                                  {review.rating.toFixed(1)} / 5
                                </p>
                                {review.title && <p><strong>{review.title}</strong></p>}
                                <p>{review.comment}</p>
                              </div>
                              <div>
                                <h4>{t('pages.reviews.categoryScores', 'Category scores')}</h4>
                                {SUB_RATINGS.every(({ key }) => review[key] == null) ? (
                                  <p className="admin-hint">{t('pages.reviews.noCategoryScores', 'No detailed category ratings')}</p>
                                ) : (
                                  <ul className="admin-review-subscores-list">
                                    {SUB_RATINGS.filter(({ key }) => review[key] != null).map(
                                      ({ key, label }) => (
                                        <li key={key}>
                                          <span>{label}</span>
                                          <StarRating value={review[key]} size={12} />
                                          <span>{Number(review[key]).toFixed(1)}</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminReviewsPage;
