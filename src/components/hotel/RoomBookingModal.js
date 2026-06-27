'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../context/I18nContext';
import Icon from '../icons/Icon';
import RoomAvailabilityBadge from './RoomAvailabilityBadge';
import RoomRateBreakdown from './RoomRateBreakdown';
import { formatMoney } from '../../utils/roomAvailability';
import { formatStayDate } from '../../utils/roomAvailability';
import { resolveMediaUrl } from '../../utils/mapHotel';
import { resolveStayPricePerNight, resolveStayPriceTotal } from '../../api/propertyStayApi';
import { getRoomDisplayName, getRoomDescription } from '../../utils/roomDisplay';

const RoomBookingModal = ({
  open,
  room,
  hotelName,
  search,
  nights,
  rate,
  availabilityUnit,
  badge,
  confirming = false,
  error = null,
  onClose,
  onConfirm
}) => {
  const { t, locale } = useTranslation();
  const images = (room?.images?.length ? room.images : room?.image ? [room.image] : [])
    .map((url) => resolveMediaUrl(url))
    .filter(Boolean);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setActiveImage(0);
    const onKey = (event) => {
      if (event.key === 'Escape' && !confirming) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming, onClose, open]);

  if (!open || !room) return null;

  const currency = rate?.currency || room.currency || 'USD';
  const totalPrice = resolveStayPriceTotal(rate, {
    roomPrice: room.price,
    nights,
    pricePerNight: availabilityUnit?.pricePerNight
  });
  const perNight = resolveStayPricePerNight(rate, {
    roomPrice: room.price,
    nights,
    pricePerNight: availabilityUnit?.pricePerNight
  });
  const roomTitle = getRoomDisplayName(room, locale);
  const roomDesc = getRoomDescription(room, locale);

  return (
    <div className="room-booking-modal-overlay" role="presentation" onClick={confirming ? undefined : onClose}>
      <section
        className="room-booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-booking-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="room-booking-modal__header">
          <div>
            <p className="room-booking-modal__eyebrow">{hotelName}</p>
            <h2 id="room-booking-modal-title">{roomTitle}</h2>
          </div>
          <button
            type="button"
            className="room-booking-modal__close"
            onClick={onClose}
            disabled={confirming}
            aria-label={t('common.close')}
          >
            <Icon name="x" size={20} />
          </button>
        </header>

        <div className="room-booking-modal__body">
          <div className="room-booking-modal__gallery">
            <div
              className="room-booking-modal__hero"
              style={{
                backgroundImage: images[activeImage] ? `url(${images[activeImage]})` : undefined,
                backgroundColor: images.length ? undefined : '#e7e5e4'
              }}
            />
            {images.length > 1 && (
              <div className="room-booking-modal__thumbs">
                {images.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    type="button"
                    className={`room-booking-modal__thumb ${index === activeImage ? 'is-active' : ''}`}
                    style={{ backgroundImage: `url(${img})` }}
                    onClick={() => setActiveImage(index)}
                    aria-label={t('hotel.roomPhoto', 'Room photo {{n}}', { n: index + 1 })}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="room-booking-modal__content">
            {badge && (
              <div className="room-booking-modal__badge">
                <RoomAvailabilityBadge badge={badge} />
              </div>
            )}

            <div className="room-booking-modal__facts">
              <div className="room-booking-modal__fact">
                <Icon name="calendar" size={18} />
                <div>
                  <span>{t('hotel.checkIn', 'Check-in')}</span>
                  <strong>{formatStayDate(search.checkIn)}</strong>
                </div>
              </div>
              <div className="room-booking-modal__fact">
                <Icon name="calendar" size={18} />
                <div>
                  <span>{t('hotel.checkOut', 'Check-out')}</span>
                  <strong>{formatStayDate(search.checkOut)}</strong>
                </div>
              </div>
              <div className="room-booking-modal__fact">
                <Icon name="users" size={18} />
                <div>
                  <span>{t('hotel.guests', 'Guests')}</span>
                  <strong>
                    {t('checkout.guestsSummary', '{{adults}} adults, {{children}} children', {
                      adults: search.adults,
                      children: search.children ?? 0
                    })}
                  </strong>
                </div>
              </div>
              <div className="room-booking-modal__fact">
                <Icon name="bed-double" size={18} />
                <div>
                  <span>{t('hotel.roomCapacity', 'Capacity')}</span>
                  <strong>
                    {t('hotel.upToGuests', 'Up to {{count}} guests', { count: room.capacity })}
                    {room.maxAdults != null &&
                      t('hotel.adultsChildren', ' ({{adults}} adults{{children}})', {
                        adults: room.maxAdults,
                        children: room.maxChildren
                          ? t('hotel.childrenSuffix', ', {{count}} children', { count: room.maxChildren })
                          : ''
                      })}
                  </strong>
                </div>
              </div>
              {room.size && (
                <div className="room-booking-modal__fact">
                  <Icon name="maximize" size={18} />
                  <div>
                    <span>{t('hotel.roomType', 'Room type')}</span>
                    <strong>{room.size}</strong>
                  </div>
                </div>
              )}
              {room.breakfast && (
                <div className="room-booking-modal__fact">
                  <Icon name="check" size={18} />
                  <div>
                    <span>{t('checkout.breakfast', 'Breakfast')}</span>
                    <strong>{room.breakfast}</strong>
                  </div>
                </div>
              )}
              {room.extraBedAllowed && (
                <div className="room-booking-modal__fact">
                  <Icon name="bed-double" size={18} />
                  <div>
                    <span>{t('hotel.extraBed', 'Extra bed')}</span>
                    <strong>{t('hotel.extraBedAvailable', 'Available on request')}</strong>
                  </div>
                </div>
              )}
            </div>

            {roomDesc && (
              <div className="room-booking-modal__section">
                <h3>{t('hotel.roomDescription', 'Description')}</h3>
                <p>{roomDesc}</p>
              </div>
            )}

            {rate && <RoomRateBreakdown rate={rate} nights={nights} />}

            <div className="room-booking-modal__pricing">
              <div>
                <span>{t('hotel.perNight', 'per night')}</span>
                <strong>{formatMoney(perNight, currency)}</strong>
              </div>
              <div className="room-booking-modal__pricing-total">
                <span>
                  {nights > 1
                    ? t('hotel.totalForNightsShortPlural', 'total for {{nights}} nights', { nights })
                    : t('hotel.totalForNightsShort', 'total for {{nights}} night', { nights })}
                </span>
                <strong>{formatMoney(totalPrice, currency)}</strong>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="room-booking-modal__error" role="alert">
            {error}
          </div>
        )}

        <footer className="room-booking-modal__footer">
          <button type="button" className="book-button secondary" onClick={onClose} disabled={confirming}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button type="button" className="book-button" onClick={onConfirm} disabled={confirming}>
            {confirming
              ? t('hotel.reserving', 'Reserving…')
              : t('hotel.confirmBooking', 'Continue to checkout')}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default RoomBookingModal;
