'use client';

import React from 'react';
import { useTranslation } from '../../context/I18nContext';
import AuthHero from './AuthHero';
import './auth-experience.css';

const AuthLayout = ({ children, heroProps, variant = 'guest' }) => {
  const { t } = useTranslation();

  return (
    <main className={`auth-luxury-page auth-luxury-page--${variant}`}>
      <AuthHero {...heroProps} />
      <section className="auth-luxury-panel" aria-label={t('auth.signIn')}>
        <div className="auth-mobile-hero">
          <span>{heroProps?.eyebrow || t('auth.heroTitle')}</span>
          <h1>{heroProps?.title || t('auth.curatedExperiences')}</h1>
          <p>{heroProps?.description || t('auth.heroDesc')}</p>
        </div>
        {children}
      </section>
    </main>
  );
};

export default AuthLayout;
