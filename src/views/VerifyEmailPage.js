'use client';

import React from 'react';
import { Link } from '@/lib/router-compat';
import { useTranslation } from '../context/I18nContext';
import Icon from '../components/icons/Icon';
import AuthLayout from '../components/auth/AuthLayout';
import AuthCard from '../components/auth/AuthCard';

const VerifyEmailPage = () => {
  const { t } = useTranslation();

  return (
    <AuthLayout variant="guest">
      <AuthCard title={t('auth.emailVerifiedTitle')} subtitle={t('auth.emailVerifiedSubtitle')}>
        <div className="auth-verification-state auth-verification-state--success" role="status">
          <span className="auth-verification-icon" aria-hidden="true">
            <Icon name="check" size={28} />
          </span>
          <p className="auth-verification-message">{t('auth.emailVerifiedMessage')}</p>
          <Link className="auth-primary-btn auth-verification-cta" to="/login">
            {t('auth.continueToLogin')}
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
