import React from 'react';
import { useTranslation } from '../../context/I18nContext';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Compact +/- counter for guest/room counts (no dropdown cap).
 */
const GuestCounter = ({ id, label, value, min, max, onChange }) => {
  const { t } = useTranslation();
  const setValue = (next) => onChange(clamp(next, min, max));

  const handleInput = (e) => {
    const raw = e.target.value;
    if (raw === '') return;
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) setValue(n);
  };

  const handleBlur = (e) => {
    const raw = e.target.value;
    if (raw === '' || Number.isNaN(parseInt(raw, 10))) setValue(min);
  };

  return (
    <div className="guest-counter">
      <label htmlFor={id}>{label}</label>
      <div className="guest-counter-controls">
        <button
          type="button"
          className="guest-counter-btn"
          onClick={() => setValue(value - 1)}
          disabled={value <= min}
          aria-label={t('search.decrease', 'Decrease {{label}}', { label })}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          className="guest-counter-input"
          min={min}
          max={max}
          value={value}
          onChange={handleInput}
          onBlur={handleBlur}
          inputMode="numeric"
          aria-label={label}
        />
        <button
          type="button"
          className="guest-counter-btn"
          onClick={() => setValue(value + 1)}
          disabled={value >= max}
          aria-label={t('search.increase', 'Increase {{label}}', { label })}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default GuestCounter;
