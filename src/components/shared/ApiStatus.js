'use client';

import React from 'react';
import { useTranslation } from '../../context/I18nContext';
import {
  CardSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  PageSkeleton,
  TableSkeleton
} from './LoadingSkeletons';

export const ApiLoading = ({ message, variant = 'default' }) => {
  const { t } = useTranslation();
  const displayMessage = message || t('common.loading');

  if (variant === 'property') {
    return <CardSkeleton count={3} variant="property" message={displayMessage} />;
  }

  if (variant === 'room') {
    return <CardSkeleton count={2} variant="room" message={displayMessage} />;
  }

  if (variant === 'table') {
    return <TableSkeleton columns={5} rows={5} message={displayMessage} />;
  }

  if (variant === 'dashboard') {
    return <DashboardSkeleton message={displayMessage} />;
  }

  if (variant === 'form') {
    return <FormSkeleton message={displayMessage} />;
  }

  if (variant === 'property-detail') {
    return <PageSkeleton type="property-detail" message={displayMessage} />;
  }

  return <PageSkeleton message={displayMessage} />;
};

export const ApiError = ({ message, onRetry }) => {
  const { t } = useTranslation();
  const rawMessage = typeof message === 'string' ? message : '';
  const exposesTechnicalDetails =
    /App\\|vendor\\|Controller|Argument #|Stack trace|\.php|\/api\b|Cannot reach the API|Request failed/i.test(rawMessage);
  const safeMessage = exposesTechnicalDetails
    ? t('errors.unexpected')
    : rawMessage || t('errors.unexpected');

  return (
    <div className="api-status api-error" role="alert">
      <p><strong>{t('errors.couldNotLoad')}</strong></p>
      <p>{safeMessage}</p>
      {onRetry && (
        <button type="button" className="cta-button" onClick={onRetry}>
          {t('errors.tryAgain')}
        </button>
      )}
    </div>
  );
};
