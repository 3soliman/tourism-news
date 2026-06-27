import React from 'react';
import StarRating from '../icons/StarRating';
import { useTranslation } from '../../context/I18nContext';

const SUB_RATINGS = [
  { key: 'cleanliness', labelKey: 'hotel.cleanliness' },
  { key: 'location', labelKey: 'hotel.locationScore' },
  { key: 'staff', labelKey: 'hotel.staff' },
  { key: 'comfort', labelKey: 'hotel.comfort' },
  { key: 'valueForMoney', labelKey: 'hotel.value' }
];

function formatReviewDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const ReviewCard = ({ review }) => {
  const { t } = useTranslation();
  const subScores = SUB_RATINGS.filter(({ key }) => review[key] != null);

  return (
    <article className="review-card">
      <header className="review-card__header">
        <div className="review-card__author-block">
          <strong className="review-card__author">{review.guestName}</strong>
          {review.createdAt && (
            <time className="review-card__date" dateTime={review.createdAt}>
              {formatReviewDate(review.createdAt)}
            </time>
          )}
        </div>
        <div className="review-card__rating">
          <StarRating value={review.rating} size={16} />
          <span>{review.rating.toFixed(1)}</span>
        </div>
      </header>

      {review.title && <h3 className="review-card__title">{review.title}</h3>}
      <p className="review-card__comment">{review.comment}</p>

      {subScores.length > 0 && (
        <ul className="review-card__subscores">
          {subScores.map(({ key, labelKey }) => (
            <li key={key}>
              <span>{t(labelKey)}</span>
              <StarRating value={review[key]} size={12} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};

export default ReviewCard;
