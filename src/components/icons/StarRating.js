import React from 'react';
import './icons.css';

const STAR_PATH =
  'M12 2l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 14.77l-4.8 2.99.92-5.34-3.88-3.78 5.36-.78L12 2z';

const StarRating = ({ value = 0, max = 5, size = 16, className = '' }) => {
  const stars = Math.min(max, Math.max(0, Math.round(Number(value) || 0)));

  return (
    <span className={`star-rating ${className}`.trim()} aria-label={`${stars} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          className={i < stars ? 'star star-filled' : 'star star-empty'}
          aria-hidden
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
};

export default StarRating;
