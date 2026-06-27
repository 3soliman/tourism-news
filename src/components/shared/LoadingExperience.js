'use client';

import React, { useEffect, useState } from 'react';
import { BRAND } from '../../config/brand';
import { useTranslation } from '../../context/I18nContext';
import BrandLogo from '../shared/BrandLogo';

const LoadingExperience = ({
  title,
  subtitle,
  messages,
  compact = false
}) => {
  const { t } = useTranslation();
  const [messageIndex, setMessageIndex] = useState(0);

  const defaultMessages = [
    t('loading.workspace'),
    t('loading.dashboard'),
    t('loading.properties'),
    t('loading.bookings')
  ];

  const displayTitle = title || BRAND.name;
  const displaySubtitle = subtitle || t('auth.propertyManagementPlatform');
  const displayMessages = messages || defaultMessages;

  useEffect(() => {
    if (!displayMessages.length) return undefined;
    const timer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % displayMessages.length);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [displayMessages]);

  const currentMessage = displayMessages[messageIndex] || defaultMessages[0];

  return (
    <section className={`loading-experience ${compact ? 'loading-experience--compact' : ''}`} role="status" aria-live="polite">
      <div className="loading-experience__content">
        <div className="loading-experience__brand" aria-hidden="true">
          <span className="loading-experience__ring" />
          <span className="loading-experience__mark loading-experience__mark--full">
            <BrandLogo variant="full" size="loading" priority />
          </span>
        </div>

        <div className="loading-experience__copy">
          <p>{displaySubtitle}</p>
        </div>

        <div className="loading-experience__progress" aria-hidden="true">
          <span />
        </div>
        <p className="loading-experience__message">{currentMessage}</p>

        {!compact && (
          <div className="loading-experience__skeleton" aria-hidden="true">
            <div className="loading-skeleton__sidebar">
              <span />
              <span />
              <span />
            </div>
            <div className="loading-skeleton__main">
              <span className="loading-skeleton__bar loading-skeleton__bar--wide" />
              <div className="loading-skeleton__cards">
                <span />
                <span />
                <span />
              </div>
              <span className="loading-skeleton__table" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LoadingExperience;
