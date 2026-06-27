'use client';

import React from 'react';
import { useTranslation } from '../../context/I18nContext';

const SocialLoginButtons = ({ onUnavailable }) => {
  const { t } = useTranslation();

  return (
    <div className="auth-social-stack" aria-label={t('auth.socialLoginOptions')}>
      <button type="button" className="auth-social-btn" onClick={() => onUnavailable?.('Google')}>
        <span aria-hidden="true" className="auth-social-btn__mark auth-social-btn__mark--google">G</span>
        <span>{t('auth.continueWithGoogle')}</span>
      </button>
    </div>
  );
};

export default SocialLoginButtons;
