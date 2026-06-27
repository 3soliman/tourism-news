import React from 'react';
import StarRating from '../icons/StarRating';
import { useTranslation } from '../../context/I18nContext';

const CATEGORY_KEYS = {
  cleanliness: 'hotel.cleanliness',
  location: 'hotel.locationScore',
  staff: 'hotel.staff',
  comfort: 'hotel.comfort',
  valueForMoney: 'hotel.value'
};

function formatScore(value, emDash) {
  if (value == null || Number.isNaN(value) || Number(value) <= 0) return emDash;
  return Number(value).toFixed(1);
}

function hasCategoryScore(value) {
  return value != null && !Number.isNaN(Number(value)) && Number(value) > 0;
}

const ReviewTrustPanel = ({ summary, variant = 'guest' }) => {
  const { t } = useTranslation();
  const emDash = t('common.emDash', '—');

  if (!summary) return null;

  const { averageRating, totalReviews, ratingBreakdown, categoryAverages } = summary;
  const categories = Object.entries(CATEGORY_KEYS).filter(([key]) =>
    hasCategoryScore(categoryAverages[key])
  );

  const panelClass =
    variant === 'admin'
      ? 'review-trust-panel review-trust-panel--admin'
      : 'review-trust-panel';

  const reviewCountLabel =
    totalReviews === 1
      ? t('hotel.totalReviewsCount', '{{count}} review', { count: totalReviews })
      : t('hotel.totalReviewsCountPlural', '{{count}} reviews', { count: totalReviews });

  const starLabel = (star) =>
    star === 1
      ? t('hotel.starCount', '{{star}} star', { star })
      : t('hotel.starCountPlural', '{{star}} stars', { star });

  return (
    <div className={panelClass}>
      <div className="review-trust-panel__score">
        <div className="review-trust-panel__score-main">
          <span className="review-trust-panel__average">
            {averageRating != null ? averageRating.toFixed(1) : emDash}
          </span>
          <StarRating value={averageRating || 0} size={18} />
          <span className="review-trust-panel__count">{reviewCountLabel}</span>
        </div>
      </div>

      <div className="review-trust-panel__breakdown">
        <h3 className="review-trust-panel__heading">{t('hotel.ratingBreakdown', 'Rating breakdown')}</h3>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingBreakdown[star] || 0;
          const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
          return (
            <div key={star} className="review-trust-bar-row">
              <span className="review-trust-bar-label">{starLabel(star)}</span>
              <div className="review-trust-bar-track" aria-hidden>
                <span className="review-trust-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="review-trust-bar-count">{count}</span>
            </div>
          );
        })}
      </div>

      {categories.length > 0 && (
        <div className="review-trust-panel__categories">
          <h3 className="review-trust-panel__heading">{t('hotel.categoryScores', 'Category scores')}</h3>
          {categories.map(([key, labelKey]) => {
            const score = categoryAverages[key];
            const pct = Math.round((score / 5) * 100);
            return (
              <div key={key} className="review-trust-bar-row">
                <span className="review-trust-bar-label">{t(labelKey)}</span>
                <div className="review-trust-bar-track" aria-hidden>
                  <span className="review-trust-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="review-trust-bar-count">{formatScore(score, emDash)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewTrustPanel;
