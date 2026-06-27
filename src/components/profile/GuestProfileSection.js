'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { useBooking } from '../../context/BookingContext';
import { useTranslation } from '../../context/I18nContext';
import { hasStoredAuth } from '../../api/authApi';
import { formatApiErrors } from '../../utils/hotelPayload';
import Icon from '../icons/Icon';
import { useNotifications } from '../shared/notifications/NotificationProvider';
import { FormSkeleton } from '../shared/LoadingSkeletons';

function formatMemberSince(iso, emDash = '—') {
  if (!iso) return emDash;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return iso;
  }
}

function initialsFromName(name, email) {
  const source = (name || email || 'G').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const GuestProfileSection = ({ variant = 'embedded' }) => {
  const { t } = useTranslation();
  const { user, refreshUser, updateProfile } = useBooking();
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const notify = useNotifications();

  const isPage = variant === 'page';
  const sectionClass = isPage ? 'profile-section profile-section--page' : 'profile-section';

  useEffect(() => {
    if (!hasStoredAuth()) {
      setLoading(false);
      return;
    }
    setLoadError(null);
    refreshUser()
      .catch((err) => setLoadError(err.message || t('errors.couldNotLoad')))
      .finally(() => setLoading(false));
  }, [refreshUser, t]);

  useEffect(() => {
    if (!user) return;
    setForm({
      full_name: user.full_name || user.name || '',
      phone: user.phone || ''
    });
  }, [user]);

  const avatarLabel = useMemo(
    () => initialsFromName(user?.full_name || user?.name, user?.email),
    [user]
  );

  if (!hasStoredAuth()) {
    return (
      <section className={sectionClass}>
        {!isPage && <h2>{t('profile.title')}</h2>}
        <div className="profile-guest-card profile-guest-card--empty">
          <div className="profile-guest-card__icon" aria-hidden="true">
            <Icon name="log-in" size={28} />
          </div>
          <h3>{t('profile.signInPrompt')}</h3>
          <p>{t('auth.heroDesc')}</p>
          <Link to="/login" className="profile-guest-card__cta">{t('nav.signIn')}</Link>
        </div>
      </section>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(false);

    const next = {};
    if (!form.full_name.trim()) next.full_name = t('auth.firstNameRequired');
    setFormErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await updateProfile({
        full_name: form.full_name,
        phone: form.phone
      });
      setSuccess(true);
      notify.success(t('profile.updateSuccess'), {
        message: t('profile.updateSuccess')
      });
    } catch (err) {
      const fieldErrors = err.data && typeof err.data === 'object' ? err.data : null;
      if (fieldErrors && !fieldErrors.detail) {
        const mapped = {};
        Object.entries(fieldErrors).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFormErrors(mapped);
      }
      const message = formatApiErrors(err.data) || err.message || t('profile.updateError');
      setSubmitError(message);
      notify.error(t('profile.updateError'), { message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={sectionClass}>
      {!isPage && <h2>{t('profile.title')}</h2>}

      {loading && <FormSkeleton fields={4} message={t('loading.userDetails')} />}
      {loadError && !loading && (
        <div className="error-message auth-form-error profile-error">
          <pre>{loadError}</pre>
        </div>
      )}

      {!loading && user && (
        <div className="profile-guest-card">
          <div className="profile-guest-card__header">
            <div className="profile-avatar" aria-hidden="true">{avatarLabel}</div>
            <div className="profile-guest-card__identity">
              <h3>{user.full_name || user.name || t('common.guest')}</h3>
              <p>{user.email}</p>
              <span className="profile-member-badge">
                {t('profile.memberSince')} {formatMemberSince(user.created_at, t('common.emDash'))}
              </span>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <div className="error-message auth-form-error">
                <pre>{submitError}</pre>
              </div>
            )}
            {success && (
              <p className="profile-success">{t('profile.updateSuccess')}</p>
            )}

            <div className="profile-form-grid">
              <div className="form-group">
                <label htmlFor="profile-full-name">{t('profile.firstName')} {t('common.required')}</label>
                <input
                  id="profile-full-name"
                  value={form.full_name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, full_name: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, full_name: undefined }));
                    setSuccess(false);
                  }}
                  disabled={saving}
                  autoComplete="name"
                />
                {formErrors.full_name && <span className="field-error">{formErrors.full_name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="profile-phone">{t('profile.phone')}</label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, phone: e.target.value }));
                    setFormErrors((prev) => ({ ...prev, phone: undefined }));
                    setSuccess(false);
                  }}
                  disabled={saving}
                  placeholder={t('common.optional')}
                  autoComplete="tel"
                />
                {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="profile-email">{t('profile.email')}</label>
                <input id="profile-email" type="email" value={user.email} readOnly disabled />
              </div>

              <div className="form-group">
                <label htmlFor="profile-member-since">{t('profile.memberSince')}</label>
                <input
                  id="profile-member-since"
                  type="text"
                  value={formatMemberSince(user.created_at, t('common.emDash'))}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {user.is_staff && (
              <p className="profile-staff-note">
                {t('admin.roleStaff')} — <Link to="/login">{t('nav.ownerPortal')}</Link>
              </p>
            )}

            <div className="profile-form-actions">
              <button type="submit" className="submit-button" disabled={saving}>
                {saving ? t('profile.saving') : t('profile.saveProfile')}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default GuestProfileSection;
