'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from '@/lib/router-compat';
import { useTranslation } from '../../context/I18nContext';
import { useHotels } from '../../context/HotelsContext';
import { getPropertyDisplayName } from '../../utils/propertyDisplay';
import Icon from '../icons/Icon';

function formatStayRange(checkIn, checkOut, emDash) {
  if (!checkIn || !checkOut) return emDash;
  try {
    const opts = { month: 'short', day: 'numeric', year: 'numeric' };
    const start = new Date(`${checkIn}T12:00:00`).toLocaleDateString(undefined, opts);
    const end = new Date(`${checkOut}T12:00:00`).toLocaleDateString(undefined, opts);
    return `${start} – ${end}`;
  } catch {
    return `${checkIn} → ${checkOut}`;
  }
}

const BookingCard = ({ booking, onPrint, onCancel }) => {
  const { t, locale } = useTranslation();
  const { getHotelById } = useHotels();
  const [imageFailed, setImageFailed] = useState(false);

  const displayHotelName = useMemo(() => {
    const hotel = booking.hotelId ? getHotelById(booking.hotelId) : null;
    if (hotel) return getPropertyDisplayName(hotel, locale);
    return booking.hotelName || t('common.property');
  }, [booking.hotelId, booking.hotelName, getHotelById, locale, t]);

  const STATUS_META = {
    new: { label: t('bookingCard.statusNew'), className: 'is-submitted' },
    confirmed: { label: t('bookingCard.statusConfirmed'), className: 'is-confirmed' },
    cancelled: { label: t('bookingCard.statusCancelled'), className: 'is-cancelled' },
    pending: { label: t('checkout.statusPending'), className: 'is-pending' }
  };

  const guestLabel = (item) => {
    const name = `${item.guest?.firstName || ''} ${item.guest?.lastName || ''}`.trim();
    return name || item.guest?.email || t('common.guest');
  };

  const status = STATUS_META[booking.status] || {
    label: booking.status || t('common.emDash'),
    className: 'is-pending'
  };
  const nights = booking.nights ?? 0;
  const cardImage = !imageFailed ? (booking.roomImage || booking.hotelImage || '') : '';

  useEffect(() => {
    setImageFailed(false);
  }, [booking.id, booking.roomImage, booking.hotelImage]);

  const nightsLabel = nights === 1 ? t('bookingCard.night') : t('bookingCard.nights');
  const adults = booking.adults ?? 0;
  const children = booking.children ?? 0;
  const guestsLabel = children > 0
    ? `${adults} ${t('search.adults')} · ${children} ${t('search.children')}`
    : `${adults} ${t('search.adults')}`;

  return (
    <article className={`trip-card ${booking.status === 'cancelled' ? 'trip-card--cancelled' : ''}`}>
      <div className="trip-card__media">
        {cardImage ? (
          <img
            className="trip-card__photo"
            src={cardImage}
            alt={booking.roomName || displayHotelName || t('common.property')}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="trip-card__media-fallback is-visible" aria-hidden="true">
            <Icon name="bed-double" size={32} />
          </div>
        )}
        <span className={`trip-card__status ${status.className}`}>{status.label}</span>
      </div>

      <div className="trip-card__body">
        <div className="trip-card__head">
          <div>
            <p className="trip-card__eyebrow">{booking.city || t('common.property')}</p>
            <h3>{displayHotelName}</h3>
            <p className="trip-card__room">{booking.roomName}</p>
          </div>
          {booking.total != null && (
            <div className="trip-card__price">
              <span>{t('bookingCard.total')}</span>
              <strong>${Number(booking.total).toFixed(0)}</strong>
            </div>
          )}
        </div>

        <div className="trip-card__meta">
          <div className="trip-card__chip">
            <Icon name="calendar" size={16} />
            <span>{formatStayRange(booking.checkIn, booking.checkOut, t('common.emDash'))}</span>
          </div>
          <div className="trip-card__chip">
            <Icon name="clock" size={16} />
            <span>{nights} {nightsLabel}</span>
          </div>
          <div className="trip-card__chip">
            <Icon name="users" size={16} />
            <span>{guestsLabel}</span>
          </div>
          <div className="trip-card__chip trip-card__chip--muted">
            <Icon name="clipboard-list" size={16} />
            <span>#{booking.id}</span>
          </div>
        </div>

        <p className="trip-card__guest">
          <Icon name="users" size={15} />
          <span>{guestLabel(booking)}</span>
          {booking.guest?.email && <span className="trip-card__guest-email">{booking.guest.email}</span>}
        </p>

        <div className="trip-card__actions">
          {booking.hotelId && (
            <Link to={`/hotel/${booking.hotelId}`} className="trip-card__btn trip-card__btn--ghost">
              {t('bookingCard.viewProperty')}
            </Link>
          )}
          <button type="button" className="trip-card__btn trip-card__btn--ghost" onClick={() => onPrint(booking)}>
            {t('bookingCard.printPdf')}
          </button>
          {(booking.status === 'confirmed' || booking.status === 'new') && booking.refundable !== false && (
            <button type="button" className="trip-card__btn trip-card__btn--danger" onClick={() => onCancel(booking.id)}>
              {t('bookingCard.cancelBooking')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default BookingCard;
