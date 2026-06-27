'use client';

import React from 'react';
import Icon from '../../icons/Icon';

const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' }
];

export default function PropertyLocaleTabs({
  activeLocale,
  onLocaleChange,
  onCopyFromEnglish,
  showCopyAction = false,
  copyLabel = 'Copy from English',
  className = ''
}) {
  return (
    <div className={`property-locale-tabs${className ? ` ${className}` : ''}`}>
      <div className="property-locale-tabs__row">
        <div className="property-locale-tabs__buttons" role="tablist" aria-label="Content language">
          {LOCALES.map((locale) => (
            <button
              key={locale.id}
              type="button"
              role="tab"
              aria-selected={activeLocale === locale.id}
              className={`property-locale-tabs__btn${activeLocale === locale.id ? ' is-active' : ''}`}
              onClick={() => onLocaleChange(locale.id)}
            >
              {locale.label}
            </button>
          ))}
        </div>
        {showCopyAction && activeLocale === 'ar' && onCopyFromEnglish && (
          <button type="button" className="property-locale-tabs__copy" onClick={onCopyFromEnglish}>
            <Icon name="copy" size={14} />
            <span>{copyLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
