'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from '@/lib/router-compat';
import { customerSignupApi, resendOTPApi, verifyOTPApi } from '../api/authApi';
import { formatApiErrors } from '../utils/hotelPayload';
import { useBooking } from '../context/BookingContext';
import { useTranslation } from '../context/I18nContext';
import Icon from '../components/icons/Icon';
import AuthLayout from '../components/auth/AuthLayout';
import AuthCard from '../components/auth/AuthCard';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';

const OTP_LENGTH = 6;
const COUNTDOWN_SECONDS = 600;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function OtpInput({ value, onChange, disabled, error }) {
  const inputsRef = useRef([]);

  const handleChange = (index, digit) => {
    if (digit.length > 1) return;
    if (!/^\d*$/.test(digit)) return;
    const next = value.slice(0, index) + digit + value.slice(index + 1);
    onChange(next.slice(0, OTP_LENGTH));
    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      onChange(value.slice(0, index - 1) + value.slice(index));
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted) {
      onChange(pasted);
      const nextEmpty = pasted.length;
      const focusIdx = nextEmpty < OTP_LENGTH ? nextEmpty : OTP_LENGTH - 1;
      inputsRef.current[focusIdx]?.focus();
    }
  };

  return (
    <div className={`otp-input-group${error ? ' otp-input-group--error' : ''}`} role="group" aria-label="Verification code">
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          className="otp-digit"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] || ''}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function CountdownTimer({ seconds, onExpire }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  return (
    <span className="otp-countdown">
      {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </span>
  );
}

const SignupPage = () => {
  const { user } = useBooking();
  const { t } = useTranslation();
  const [fields, setFields] = useState({ first_name: '', last_name: '', email: '', password: '', password_confirm: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);

  if (user) return <Navigate to="/my-bookings" replace />;

  const update = (name, value) => {
    setFields((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError('');
  };

  const validate = () => {
    const next = {};
    if (!fields.first_name.trim()) next.first_name = 'First name is required';
    if (!fields.last_name.trim()) next.last_name = 'Last name is required';
    if (!emailPattern.test(fields.email.trim())) next.email = 'Enter a valid email address';
    if (fields.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (fields.password !== fields.password_confirm) next.password_confirm = 'Passwords do not match';
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      await customerSignupApi(fields);
      setCreated(true);
      setCountdownKey((k) => k + 1);
    } catch (error) {
      if (error.status === 503 && String(error.data?.detail || '').startsWith('Account created')) {
        setCreated(true);
        setOtpMessage(error.data.detail);
        return;
      }
      const data = error.data && typeof error.data === 'object' ? error.data : null;
      if (data && !data.detail) {
        setErrors(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value)])));
      }
      setSubmitError(formatApiErrors(error.data) || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async () => {
    const code = otpValue.trim();
    if (code.length !== OTP_LENGTH || !/^\d{6}$/.test(code)) {
      setOtpError('Enter the full 6-digit code.');
      return;
    }
    setOtpSubmitting(true);
    setOtpError('');
    try {
      await verifyOTPApi(fields.email, code);
      setOtpVerified(true);
    } catch (error) {
      const msg = error.data?.detail || 'Verification failed.';
      setOtpError(msg);
      if (error.data?.code === 'otp_expired' || error.data?.code === 'otp_attempts_exhausted') {
        setResendDisabled(false);
      }
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    setOtpError('');
    setOtpValue('');
    setOtpMessage('Sending...');
    setCountdownKey((k) => k + 1);
    try {
      const response = await resendOTPApi(fields.email);
      setOtpMessage(response.detail);
    } catch (error) {
      setOtpMessage(formatApiErrors(error.data) || error.message);
      if (error.status !== 429) setResendDisabled(false);
    }
  };

  const handleExpire = () => {
    setOtpError('Code expired. Request a new one.');
    setResendDisabled(false);
  };

  const input = (name, label, type, icon, autoComplete) => (
    <div className="auth-premium-field">
      <label htmlFor={`signup-${name}`}>{label} *</label>
      <div className="auth-input-shell">
        <Icon name={icon} size={18} />
        <input id={`signup-${name}`} type={type} value={fields[name]} onChange={(event) => update(name, event.target.value)} disabled={submitting} autoComplete={autoComplete} required />
      </div>
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </div>
  );

  if (otpVerified) {
    return (
      <AuthLayout variant="guest" heroProps={{ title: t('auth.heroTitle', 'Curated Hotel Experiences'), description: t('auth.heroDesc', 'Manage bookings and guest experiences from one secure account.'), trustText: t('auth.heroTrust', 'Trusted by travelers worldwide') }}>
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
  }

  if (created) {
    return (
      <AuthLayout variant="guest" heroProps={{ title: t('auth.heroTitle', 'Curated Hotel Experiences'), description: t('auth.heroDesc', 'Manage bookings and guest experiences from one secure account.'), trustText: t('auth.heroTrust', 'Trusted by travelers worldwide') }}>
        <AuthCard title="Verify your email" subtitle={`Enter the 6-digit code sent to ${fields.email}.`} footer={<><Link to="/login">{t('auth.signInLink', 'Sign In')}</Link></>}>
          <div className="owner-auth-toolbar" style={{ justifyContent: 'flex-end' }}><LanguageSwitcher /></div>
          <form className="auth-premium-form" onSubmit={(e) => { e.preventDefault(); handleOtpSubmit(); }} noValidate>
            <OtpInput value={otpValue} onChange={setOtpValue} disabled={otpSubmitting} error={otpError} />
            {otpError && <span className="field-error" style={{ textAlign: 'center' }}>{otpError}</span>}
            <button type="submit" className="auth-primary-btn" disabled={otpSubmitting || otpValue.length !== OTP_LENGTH}>
              {otpSubmitting && <span className="auth-spinner" aria-hidden="true" />}
              <span>{otpSubmitting ? 'Verifying...' : 'Verify email'}</span>
            </button>
            <div className="otp-resend-row">
              <CountdownTimer key={countdownKey} seconds={COUNTDOWN_SECONDS} onExpire={handleExpire} />
              <button type="button" className="otp-resend-btn" disabled={resendDisabled} onClick={handleResend}>
                Resend code
              </button>
            </div>
            {otpMessage && <p className="auth-inline-message" style={{ textAlign: 'center' }}>{otpMessage}</p>}
          </form>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="guest" heroProps={{ title: t('auth.heroTitle', 'Curated Hotel Experiences'), description: t('auth.heroDesc', 'Manage bookings and guest experiences from one secure account.'), trustText: t('auth.heroTrust', 'Trusted by travelers worldwide') }}>
      <AuthCard title={t('auth.createAccount', 'Create an account')} subtitle="Create your customer account to manage upcoming stays." footer={<>{t('auth.alreadyHaveAccount', 'Already have an account?')} <Link to="/login">{t('auth.signInLink', 'Sign In')}</Link></>}>
        <div className="owner-auth-toolbar" style={{ justifyContent: 'flex-end' }}><LanguageSwitcher /></div>
        {submitError && <div className="error-message auth-premium-error" role="alert"><pre>{submitError}</pre></div>}
        <form className="auth-premium-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-name-grid">
            {input('first_name', 'First name', 'text', 'users', 'given-name')}
            {input('last_name', 'Last name', 'text', 'users', 'family-name')}
          </div>
          {input('email', t('auth.email', 'Email'), 'email', 'mail', 'email')}
          {input('password', t('auth.password', 'Password'), 'password', 'lock', 'new-password')}
          {input('password_confirm', t('auth.passwordConfirm', 'Confirm password'), 'password', 'lock', 'new-password')}
          <button type="submit" className="auth-primary-btn" disabled={submitting}>{submitting && <span className="auth-spinner" aria-hidden="true" />}<span>{submitting ? 'Creating account...' : 'Create account'}</span></button>
        </form>
        <Link to="/" className="auth-secondary-link"><Icon name="arrow-left" size={16} /><span>{t('auth.backHome', 'Back to home')}</span></Link>
      </AuthCard>
    </AuthLayout>
  );
};

export default SignupPage;
