'use client';

import React, { useState } from 'react';
import { useNavigate, Navigate, Link, useLocation } from '@/lib/router-compat';
import { useAdmin } from '../context/AdminContext';
import { useBooking } from '../context/BookingContext';
import { useTranslation } from '../context/I18nContext';
import {
  unifiedLoginApi,
  clearAuthTokens,
  parseAuthLoginResponse,
  getRedirectPathForRole,
  isDashboardRole,
  resendOTPApi,
  verifyOTPApi,
  forgotPasswordApi
} from '../api/authApi';
import { formatApiErrors } from '../utils/hotelPayload';
import Icon from '../components/icons/Icon';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import AuthLayout from '../components/auth/AuthLayout';
import AuthCard from '../components/auth/AuthCard';
import SocialLoginButtons from '../components/auth/SocialLoginButtons';
import '../styles/admin-panel.css';
import '../styles/admin-ui.css';

const LoginPage = () => {
  const { login: adminLogin, adminUser, loaded: adminLoaded } = useAdmin();
  const { login: guestLogin, user: guestUser } = useBooking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  if (adminLoaded && adminUser) {
    return <Navigate to="/" replace />;
  }

  if (guestUser) {
    return <Navigate to="/" replace />;
  }

  const completeLogin = async () => {
    setSubmitError(null);
    setRole(null);

    const next = {};
    if (!email.trim()) next.email = t('auth.emailRequired', 'Email is required');
    if (!password) next.password = t('auth.passwordRequired', 'Password is required');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    // Remove any stale session before the API stores the newly issued token.
    // Clearing after unifiedLoginApi succeeds deletes that new token and causes
    // the protected admin route to redirect straight back to this page.
    clearAuthTokens();
    try {
      const data = await unifiedLoginApi({ email, password });
      const session = parseAuthLoginResponse(data, { email });

      const userRole = session.role || session.user?.role || 'customer';
      setRole(userRole);

      const userData = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        full_name: session.user.full_name,
        phone: session.user.phone,
        role: userRole
      };

      // Admin users get dual-login: AdminContext for dashboard, BookingContext for public site
      if (isDashboardRole(userRole)) {
        adminLogin(userData);
      }
      guestLogin(session.user);
      setUnverifiedEmail('');
      setResendMessage('');
      setOtpCode('');

      navigate(session.redirectPath && session.redirectPath !== '/admin'
        ? session.redirectPath
        : getRedirectPathForRole(userRole));
    } catch (err) {
      const errorCode = Array.isArray(err.data?.code) ? err.data.code[0] : err.data?.code;
      if (errorCode === 'email_not_verified') {
        const pendingEmail = Array.isArray(err.data?.email) ? err.data.email[0] : err.data?.email;
        setUnverifiedEmail(pendingEmail || email.trim());
        setErrors({});
        setSubmitError(null);
        setForgotMessage('');
        setResendMessage(t('auth.verificationCodeSentClear', 'Enter the verification code sent to your email to continue.'));
        return;
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (unverifiedEmail) {
      await handleVerifyOtp();
      return;
    }
    await completeLogin();
  };

  const handleResend = async () => {
    setSubmitError(null);
    setForgotMessage('');
    setErrors((prev) => ({ ...prev, otp: undefined }));
    setResendMessage(t('auth.sendingVerification', 'Sending verification email...'));
    try {
      await resendOTPApi(unverifiedEmail);
      setResendMessage(t('auth.verificationCodeResentClear', 'A new verification code has been sent to your email.'));
    } catch (err) {
      const errorCode = Array.isArray(err.data?.code) ? err.data.code[0] : err.data?.code;
      setResendMessage(
        errorCode === 'resend_locked'
          ? t('auth.verificationResendLocked', 'Please wait a minute before requesting another code.')
          : t('auth.verificationSendError', 'Could not send the verification code. Please try again.')
      );
    }
  };

  const handleVerifyOtp = async () => {
    setSubmitError(null);
    setResendMessage('');

    if (!otpCode.trim()) {
      setErrors((prev) => ({ ...prev, otp: t('auth.otpRequired', 'Verification code is required') }));
      return;
    }

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setErrors((prev) => ({ ...prev, otp: t('auth.otpInvalid', 'Enter the 6-digit verification code') }));
      return;
    }

    setVerifyingOtp(true);
    try {
      await verifyOTPApi(unverifiedEmail || email, otpCode.trim());
      setUnverifiedEmail('');
      setOtpCode('');
      setErrors((prev) => ({ ...prev, otp: undefined }));
      setResendMessage(t('auth.emailVerifiedSigningIn', 'Email verified. Signing you in...'));
      await completeLogin();
    } catch (err) {
      setErrors((prev) => ({ ...prev, otp: formatApiErrors(err.data) || err.message }));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleForgotPassword = async () => {
    setSubmitError(null);
    setForgotMessage('');

    if (!email.trim()) {
      setErrors((prev) => ({ ...prev, email: t('auth.forgotEmailRequired', 'Enter your email first') }));
      return;
    }

    setForgotLoading(true);
    try {
      const response = await forgotPasswordApi(email);
      setForgotMessage(
        response?.detail ||
        response?.message ||
        t('auth.forgotPasswordSent', 'If this email exists, password reset instructions have been sent.')
      );
    } catch (err) {
      setForgotMessage(formatApiErrors(err.data) || t('auth.forgotPasswordError', 'Could not send password reset email.'));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSocialUnavailable = (provider) => {
    setSubmitError(`${provider} sign-in is not available yet. Use email and password to continue.`);
  };

  const isStaffRole = role && isDashboardRole(role);

  return (
    <AuthLayout
      variant={isStaffRole ? 'owner' : 'guest'}
      heroProps={{
        eyebrow: isStaffRole
          ? t('auth.ownerHeroEyebrow', 'Hospitality Management Platform')
          : t('auth.heroTitle', 'Curated Hotel Experiences'),
        title: isStaffRole
          ? t('auth.ownerHeroTitle', 'Manage Your Hospitality Business')
          : t('auth.heroTitle', 'Curated Hotel Experiences'),
        description: isStaffRole
          ? t('auth.ownerHeroDesc', 'One platform for reservations, guests, property performance, and multi-property operations.')
          : t('auth.heroDesc', 'Manage bookings, properties, and guest experiences from a unified platform.'),
        highlights: isStaffRole ? [
          t('auth.ownerFeatureReservations', 'Reservation Management'),
          t('auth.ownerFeatureDashboard', 'Property Dashboard'),
          t('auth.ownerFeatureRevenue', 'Revenue Analytics'),
          t('auth.ownerFeatureInsights', 'Booking Insights'),
          t('auth.ownerFeatureSecure', 'Secure Access'),
          t('auth.ownerFeatureMulti', 'Multi-property Support')
        ] : undefined,
        trustText: isStaffRole
          ? t('auth.ownerHeroTrust', 'Secure access for property owners and hotel teams')
          : t('auth.heroTrust', 'Trusted by travelers and hotel owners worldwide')
      }}
    >
      <AuthCard
        title={t('auth.welcome', 'Welcome back')}
        subtitle={t('auth.continue', 'Sign in to continue.')}
        footer={(
          <>
            {t('auth.needAccount', 'Need an account?')} <Link to="/signup">{t('auth.signUpLink', 'Sign Up')}</Link> &middot; <Link to="/contact">{t('auth.contactTeam', 'Contact the hotel team')}</Link>
          </>
        )}
        brandAction={<LanguageSwitcher />}
      >
        {location.state?.verified && (
          <div className="auth-success-message" role="status">Email verified successfully. You can now sign in.</div>
        )}

        {submitError && (
          <div className="error-message auth-premium-error" role="alert">
            <pre>{submitError}</pre>
          </div>
        )}
        {unverifiedEmail && (
          <div className="auth-resend-panel">
            <span>{t('auth.accountNeedsVerification', 'Your account needs email verification before signing in.')}</span>
            <div className="auth-input-shell">
              <Icon name="shield" size={18} />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setErrors((prev) => ({ ...prev, otp: undefined }));
                  setSubmitError(null);
                }}
                placeholder={t('auth.otpPlaceholder', '6-digit code')}
                disabled={verifyingOtp || submitting}
              />
            </div>
            {errors.otp && <small className="field-error">{errors.otp}</small>}
            <button type="button" onClick={handleVerifyOtp} disabled={verifyingOtp || submitting}>
              {verifyingOtp ? t('auth.verifying', 'Verifying...') : t('auth.verifyAndSignIn', 'Verify and sign in')}
            </button>
            <button type="button" onClick={handleResend} disabled={verifyingOtp || submitting}>
              {t('auth.resendVerificationEmail', 'Resend verification email')}
            </button>
            {resendMessage && <small>{resendMessage}</small>}
          </div>
        )}

        <form className="auth-premium-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-premium-field">
            <label htmlFor="login-email">{t('auth.email', 'Email *')}</label>
            <div className="auth-input-shell">
              <Icon name="mail" size={18} />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                  setSubmitError(null);
                  setUnverifiedEmail('');
                  setOtpCode('');
                  setResendMessage('');
                  setForgotMessage('');
                }}
                disabled={submitting}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="auth-premium-field">
            <label htmlFor="login-password">{t('auth.password', 'Password *')}</label>
            <div className="auth-input-shell">
              <Icon name="lock" size={18} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                  setSubmitError(null);
                  setUnverifiedEmail('');
                  setOtpCode('');
                  setResendMessage('');
                }}
                disabled={submitting}
                placeholder="Your password"
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
          <div className="auth-form-options">
            <button
              type="button"
              className="auth-forgot-link"
              onClick={handleForgotPassword}
              disabled={forgotLoading || submitting || verifyingOtp}
            >
              {forgotLoading ? t('auth.sendingReset', 'Sending...') : t('auth.forgotPassword', 'Forgot password?')}
            </button>
          </div>
          {forgotMessage && (
            <div className="auth-inline-message" role="status">
              {forgotMessage}
            </div>
          )}
          <button type="submit" className="auth-primary-btn" disabled={submitting || verifyingOtp}>
            {submitting || verifyingOtp ? <span className="auth-spinner" aria-hidden="true" /> : null}
            <span>
              {unverifiedEmail
                ? (verifyingOtp ? t('auth.verifying', 'Verifying...') : t('auth.verifyAndSignIn', 'Verify and sign in'))
                : (submitting ? t('auth.signingIn', 'Signing in...') : t('auth.signIn', 'Sign In'))}
            </span>
          </button>
        </form>

        <div className="auth-divider">or</div>
        <SocialLoginButtons onUnavailable={handleSocialUnavailable} />

        <Link to="/" className="auth-secondary-link">
          <Icon name="arrow-left" size={16} />
          <span>{t('auth.backHome', 'Back to home')}</span>
        </Link>
      </AuthCard>
    </AuthLayout>
  );
};

export default LoginPage;
