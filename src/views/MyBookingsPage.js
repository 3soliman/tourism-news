'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Link, Navigate } from '@/lib/router-compat';
import { useBooking } from '../context/BookingContext';
import { useTranslation } from '../context/I18nContext';
import BookingCard from '../components/bookings/BookingCard';
import Icon from '../components/icons/Icon';
import { enrichBookingsWithRoomImages } from '../api/bookingsApi';
import { printBookingInvoice } from '../utils/printBookingInvoice';
import { CardSkeleton } from '../components/shared/LoadingSkeletons';

const MyBookingsPage = () => {
  const { t } = useTranslation();
  const { bookings, cancelBooking, bookingsLoading, refreshBookings, user } = useBooking();
  const [tab, setTab] = useState('upcoming');
  const [displayBookings, setDisplayBookings] = useState([]);

  const tabs = useMemo(() => [
    { id: 'upcoming', label: t('trips.tabUpcoming'), icon: 'calendar' },
    { id: 'past', label: t('trips.tabPast'), icon: 'clock' },
    { id: 'cancelled', label: t('trips.tabCancelled'), icon: 'x' },
    { id: 'all', label: t('trips.tabAll'), icon: 'clipboard-list' }
  ], [t]);

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  useEffect(() => {
    let cancelled = false;

    if (!bookings.length) {
      setDisplayBookings([]);
      return undefined;
    }

    enrichBookingsWithRoomImages(bookings)
      .then((list) => {
        if (!cancelled) setDisplayBookings(list);
      })
      .catch(() => {
        if (!cancelled) setDisplayBookings(bookings);
      });

    return () => {
      cancelled = true;
    };
  }, [bookings]);

  const today = new Date().toISOString().split('T')[0];

  const categorized = useMemo(() => {
    const source = displayBookings.length ? displayBookings : bookings;
    const active = source.filter((b) => b.status !== 'cancelled');
    const cancelled = source.filter((b) => b.status === 'cancelled');
    const upcoming = active.filter((b) => !b.checkOut || b.checkOut >= today);
    const past = active.filter((b) => b.checkOut && b.checkOut < today);
    return { upcoming, past, cancelled, all: source };
  }, [displayBookings, bookings, today]);

  const list = categorized[tab] || [];

  const handlePrint = (booking) => {
    printBookingInvoice(booking);
  };

  if (!user && bookings.length === 0) return <Navigate to="/login" replace />;

  return (
    <div className="trips-page">
      <header className="trips-page__hero">
        <div className="trips-page__hero-copy">
          <p className="trips-page__eyebrow">{t('trips.eyebrow')}</p>
          <h1>{t('trips.title')}</h1>
          <p className="trips-page__subtitle">
            {t('trips.subtitle')}
          </p>
        </div>
        <div className="trips-page__hero-actions">
          <Link to="/search" className="trips-page__cta">
            <Icon name="search" size={18} />
            <span>{t('trips.findHotel')}</span>
          </Link>
          <Link to="/profile" className="trips-page__link">
            <Icon name="users" size={18} />
            <span>{t('trips.accountSettings')}</span>
          </Link>
        </div>
      </header>

      <section className="trips-page__stats" aria-label={t('trips.summary')}>
        {[
          { label: t('trips.upcoming'), value: categorized.upcoming.length, tone: 'primary' },
          { label: t('trips.pastStays'), value: categorized.past.length, tone: 'neutral' },
          { label: t('trips.cancelled'), value: categorized.cancelled.length, tone: 'muted' },
          { label: t('common.total'), value: categorized.all.length, tone: 'accent' }
        ].map((item) => (
          <article key={item.label} className={`trips-stat trips-stat--${item.tone}`}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </section>

      <nav className="trips-tabs" aria-label={t('trips.filters')}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`trips-tabs__btn ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
            <em>{categorized[item.id]?.length ?? 0}</em>
          </button>
        ))}
      </nav>

      {bookingsLoading && (
        <CardSkeleton count={3} variant="compact" message={t('trips.loading')} />
      )}

      {!bookingsLoading && list.length === 0 ? (
        <div className="trips-empty">
          <div className="trips-empty__icon" aria-hidden="true">
            <Icon name="calendar" size={36} />
          </div>
          <h3>{t('trips.emptyTitle')}</h3>
          <p>{t('trips.emptyDesc')}</p>
          <Link to="/search" className="trips-page__cta">{t('trips.browseHotels')}</Link>
        </div>
      ) : (
        <div className="trips-list">
          {list.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPrint={handlePrint}
              onCancel={cancelBooking}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
