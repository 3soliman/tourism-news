'use client';

import React from 'react';
import { useTranslation } from '../context/I18nContext';
import LoginForm from '../components/auth/LoginForm';

const AuthenticationPage = ({ onLogin }) => {
  const { t } = useTranslation();

  return (
    <div className="auth-page">
      <div className="form-container">
        <h2>{t('auth.welcomeBack')}</h2>
        <LoginForm onLogin={onLogin} />
        <p className="auth-switch">{t('auth.accountsByTeam')}</p>
      </div>
    </div>
  );
};

export default AuthenticationPage;
