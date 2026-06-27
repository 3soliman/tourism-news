'use client';

import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from '@/lib/router-compat';
import { useAdmin } from '../../context/AdminContext';
import { useTranslation } from '../../context/I18nContext';
import {
  adminLoginApi,
  clearAuthTokens,
  isAdminAuthRole,
  parseAuthLoginResponse
} from '../../api/authApi';
import { formatApiErrors } from '../../utils/hotelPayload';
import { BRAND } from '../../config/brand';
import Icon from '../../components/icons/Icon';
import LanguageSwitcher from '../../components/shared/LanguageSwitcher';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthCard from '../../components/auth/AuthCard';
import '../../styles/admin-panel.css';
import '../../styles/admin-ui.css';

const AdminLoginPage = () => {
  const { login, adminUser, loaded } = useAdmin();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (loaded && adminUser) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const next = {};
    if (!email.trim()) next.email = t('auth.emailRequired', 'Email is required');
    if (!password) next.password = t('auth.passwordRequired', 'Password is required');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const data = await adminLoginApi({ email, password });
      const session = parseAuthLoginResponse(data, { email });

      if (!isAdminAuthRole(session.role, session.user)) {
        clearAuthTokens();
        setSubmitError(t('auth.notAuthorized', 'This account is not authorized for the admin panel.'));
        return;
      }

      login({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        full_name: session.user.full_name,
        phone: session.user.phone,
        role: session.role || session.user.role || 'admin'
      });
      navigate(session.redirectPath || '/admin');
    } catch (err) {
      const fieldErrors = err.data && typeof err.data === 'object' ? err.data : null;
      if (fieldErrors && !fieldErrors.detail) {
        const mapped = {};
        Object.entries(fieldErrors).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setErrors(mapped);
      }
      setSubmitError(formatApiErrors(err.data) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      variant="owner"
      heroProps={{
        eyebrow: t('auth.ownerHeroEyebrow', 'Hospitality Management Platform'),
        title: t('auth.ownerHeroTitle', 'Manage Your Hospitality Business'),
        description: t('auth.ownerHeroDesc', 'One platform for reservations, guests, property performance, and multi-property operations.'),
        highlights: [
          t('auth.ownerFeatureReservations', 'Reservation Management'),
          t('auth.ownerFeatureDashboard', 'Property Dashboard'),
          t('auth.ownerFeatureRevenue', 'Revenue Analytics'),
          t('auth.ownerFeatureInsights', 'Booking Insights'),
          t('auth.ownerFeatureSecure', 'Secure Access'),
          t('auth.ownerFeatureMulti', 'Multi-property Support')
        ],
        trustText: t('auth.ownerHeroTrust', 'Secure access for property owners and hotel teams')
      }}
    >
      <AuthCard
        title={t('auth.ownerPortalTitle', 'Property Owner Portal')}
        subtitle={t('auth.ownerPortalSubtitle', 'Manage reservations, guests, and property performance from a single dashboard.')}
      >
        <div className="owner-auth-toolbar">
          <span>{t('auth.ownerSignInDesc', 'Sign in to manage properties on')} <strong>{BRAND.name}</strong></span>
          <LanguageSwitcher />
        </div>
 
        {submitError && (
          <div className="error-message auth-premium-error" role="alert">
            <pre>{submitError}</pre>
          </div>
        )}
 
        <form className="auth-premium-form owner-auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-premium-field">
            <label htmlFor="admin-email">{t('auth.email', 'Email *')}</label>
            <div className="auth-input-shell">
              <Icon name="mail" size={18} />
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                  setSubmitError(null);
                }}
                disabled={submitting}
                placeholder={t('auth.ownerEmailPlaceholder', 'owner@example.com')}
                autoComplete="email"
              />
            </div>
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="auth-premium-field">
            <label htmlFor="admin-password">{t('auth.password', 'Password *')}</label>
            <div className="auth-input-shell">
              <Icon name="lock" size={18} />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                  setSubmitError(null);
                }}
                disabled={submitting}
                placeholder={t('auth.passwordPlaceholder', 'Your password')}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={submitting}
                aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <button type="submit" className="auth-primary-btn owner-auth-submit" disabled={submitting}>
            {submitting ? <span className="auth-spinner" aria-hidden="true" /> : null}
            <span>{submitting ? t('auth.signingIn', 'Signing in...') : t('auth.signIn', 'Sign In')}</span>
          </button>
        </form>
 
        <div className="owner-auth-note">
          <Icon name="shield" size={16} />
          <span>{t('auth.ownerOnlyDesc', 'Owner accounts are created by system administrators only.')}</span>
        </div>

        <div className="auth-trust-strip owner-auth-trust">
          <span><Icon name="check" size={14} /> {t('auth.secureLogin', 'Secure Access')}</span>
          <span><Icon name="check" size={14} /> {t('auth.encryptedData', 'Encrypted Data')}</span>
          <span><Icon name="check" size={14} /> {t('auth.propertyManagementPlatform', 'Property Management Platform')}</span>
        </div>
 
        <Link to="/" className="auth-secondary-link">
          <Icon name="arrow-left" size={16} />
          <span>{t('auth.backGuest', 'Back to Website')}</span>
        </Link>
      </AuthCard>
    </AuthLayout>
  );
};

export default AdminLoginPage;
