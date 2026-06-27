import React, { useState } from 'react';
import '../icons/icons.css';

const STAR_PATH =
  'M12 2l2.4 4.86 5.36.78-3.88 3.78.92 5.34L12 14.77l-4.8 2.99.92-5.34-3.88-3.78 5.36-.78L12 2z';

const InteractiveStarRating = ({
  value = 0,
  onChange,
  max = 5,
  size = 22,
  className = '',
  label = 'Rating',
  disabled = false
}) => {
  const [hover, setHover] = useState(0);
  const display = hover || value || 0;

  return (
    <div
      className={`interactive-star-rating star-rating ${className}`.trim()}
      role="group"
      aria-label={label}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= display;
        return (
          <button
            key={starValue}
            type="button"
            className={`interactive-star-rating__btn ${filled ? 'is-filled' : ''}`}
            disabled={disabled}
            aria-label={`${starValue} out of ${max} stars`}
            onMouseEnter={() => !disabled && setHover(starValue)}
            onMouseLeave={() => !disabled && setHover(0)}
            onFocus={() => !disabled && setHover(starValue)}
            onBlur={() => !disabled && setHover(0)}
            onClick={() => !disabled && onChange?.(starValue)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={size}
              height={size}
              viewBox="0 0 24 24"
              className={filled ? 'star star-filled' : 'star star-empty'}
              aria-hidden
            >
              <path d={STAR_PATH} />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

export default InteractiveStarRating;
