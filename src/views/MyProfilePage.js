'use client';

import React from 'react';
import { Link, Navigate } from '@/lib/router-compat';
import { useBooking } from '../context/BookingContext';
import { useTranslation } from '../context/I18nContext';
import GuestProfileSection from '../components/profile/GuestProfileSection';
import Icon from '../components/icons/Icon';

const MyProfilePage = () => {
  const { t } = useTranslation();
  const { user } = useBooking();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="profile-page">
      <header className="profile-page__hero">
        <div>
          <p className="profile-page__eyebrow">{t('profile.account')}</p>
          <h1>{t('profile.title')}</h1>
          <p className="profile-page__subtitle">
            {t('auth.continue')}
          </p>
        </div>
        <Link to="/my-bookings" className="profile-page__back">
          <Icon name="arrow-left" size={18} />
          <span>{t('profile.backToTrips')}</span>
        </Link>
      </header>

      <GuestProfileSection variant="page" />
    </div>
  );
};

export default MyProfilePage;
