'use client';

import React, { useState } from 'react';
import { useTranslation } from '../../context/I18nContext';
import { loginUser } from '../../services/firebaseService';

const LoginForm = ({ onLogin }) => {
  const { t } = useTranslation();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await loginUser(credentials.email, credentials.password);

    if (result.success) {
      onLogin({
        id: result.user.uid,
        name: result.user.name || credentials.email.split('@')[0],
        email: credentials.email
      });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group">
        <label htmlFor="email">{t('auth.email')}</label>
        <input
          type="email"
          id="email"
          name="email"
          value={credentials.email}
          onChange={handleChange}
          required
          placeholder={t('auth.enterEmail')}
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">{t('auth.password')}</label>
        <input
          type="password"
          id="password"
          name="password"
          value={credentials.password}
          onChange={handleChange}
          required
          placeholder={t('auth.enterPassword')}
        />
      </div>
      <div className="form-group">
        <button type="submit" disabled={loading}>
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
