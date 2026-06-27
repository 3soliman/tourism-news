import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPropertyReviewSummary,
  fetchPropertyReviews
} from '../../api/reviewsApi';
import AddReviewModal from './AddReviewModal';
import ReviewCard from './ReviewCard';
import ReviewTrustPanel from './ReviewTrustPanel';
import { CardSkeleton } from '../shared/LoadingSkeletons';
import { useTranslation } from '../../context/I18nContext';

const PropertyReviewsSection = ({ propertyId, onSummaryChange }) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const onSummaryChangeRef = useRef(onSummaryChange);
  useEffect(() => {
    onSummaryChangeRef.current = onSummaryChange;
  }, [onSummaryChange]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await fetchPropertyReviewSummary(propertyId);
      setSummary(data);
      onSummaryChangeRef.current?.(data);
    } catch {
      const empty = {
        averageRating: null,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categoryAverages: {}
      };
      setSummary(empty);
      onSummaryChangeRef.current?.(empty);
    } finally {
      setLoadingSummary(false);
    }
  }, [propertyId]);

  const loadReviews = useCallback(
    async (targetPage = 1) => {
      setLoadingReviews(true);
      setReviewsError(null);
      try {
        const data = await fetchPropertyReviews(propertyId, { page: targetPage });
        setReviews(data.results);
        setCount(data.count);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
        setPage(targetPage);
      } catch (err) {
        setReviews([]);
        setReviewsError(err.message || t('hotel.couldNotLoadReviews', 'Could not load reviews.'));
      } finally {
        setLoadingReviews(false);
      }
    },
    [propertyId, t]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  const handleReviewSuccess = async () => {
    await Promise.all([loadSummary(), loadReviews(1)]);
  };

  const totalReviews = summary?.totalReviews ?? count ?? 0;
  const isEmpty = !loadingSummary && !loadingReviews && totalReviews === 0 && reviews.length === 0;

  return (
    <section id="guest-reviews" className="detail-section detail-section--reviews">
      <div className="detail-reviews-head">
        <h2>{t('hotel.guestReviews', 'Guest reviews')}</h2>
        <button type="button" className="book-button detail-reviews-write-btn" onClick={() => setModalOpen(true)}>
          {t('hotel.writeReview', 'Write a review')}
        </button>
      </div>

      {loadingSummary ? (
        <CardSkeleton count={1} variant="compact" message={t('hotel.loadingReviewSummary', 'Loading review summary...')} />
      ) : totalReviews > 0 ? (
        <ReviewTrustPanel summary={summary} />
      ) : (
        <p className="detail-reviews-empty">{t('hotel.noReviewsEmpty', 'No reviews yet. Be the first to share your experience.')}</p>
      )}

      {reviewsError && <p className="field-error detail-reviews-error">{reviewsError}</p>}

      {loadingReviews ? (
        <CardSkeleton count={2} variant="compact" message={t('hotel.loadingReviews', 'Loading reviews...')} />
      ) : reviews.length > 0 ? (
        <>
          <div className="reviews-list">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          {(hasPrevious || hasNext) && (
            <div className="reviews-pagination">
              <button
                type="button"
                className="link-button"
                disabled={!hasPrevious || loadingReviews}
                onClick={() => loadReviews(page - 1)}
              >
                {t('common.previous', 'Previous')}
              </button>
              <span>
                {t('hotel.pageLabel', 'Page {{page}}', { page })}
                {count > 0 ? t('hotel.pageTotal', ' · {{count}} total', { count }) : ''}
              </span>
              <button
                type="button"
                className="link-button"
                disabled={!hasNext || loadingReviews}
                onClick={() => loadReviews(page + 1)}
              >
                {t('common.next', 'Next')}
              </button>
            </div>
          )}
        </>
      ) : (
        !isEmpty && !reviewsError && <p className="admin-hint">{t('hotel.noReviewsOnPage', 'No reviews on this page.')}</p>
      )}

      <AddReviewModal
        propertyId={propertyId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleReviewSuccess}
      />
    </section>
  );
};

export default PropertyReviewsSection;
