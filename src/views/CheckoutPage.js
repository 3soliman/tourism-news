'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { useBooking } from '../context/BookingContext';
import { useHotels } from '../context/HotelsContext';
import { useTranslation } from '../context/I18nContext';
import { calcBookingTotal, nightsBetween } from '../utils/searchUtils';
import { formatMoney, formatStayDate } from '../utils/roomAvailability';
import { formatApiErrors } from '../utils/hotelPayload';
import { checkRoomAvailabilityForStay } from '../api/availabilityBlocksApi';
import { fetchGuestPropertyRooms } from '../api/roomTypesApi';
import { getPropertyDisplayName } from '../utils/propertyDisplay';
import { getRoomDisplayName, getRoomDescription } from '../utils/roomDisplay';
import { printBookingInvoice } from '../utils/printBookingInvoice';
import Icon from '../components/icons/Icon';

const PAYMENT_METHOD_KEYS = [
  { id: 'card', labelKey: 'checkout.paymentCard', icon: 'credit-card' },
  { id: 'paypal', labelKey: 'checkout.paymentPaypal', icon: 'wallet' },
  { id: 'cash', labelKey: 'checkout.paymentCash', icon: 'banknote' }
];

const STEP_KEYS = [
  { id: 1, labelKey: 'checkout.stepStay', hintKey: 'checkout.stepStayHint' },
  { id: 2, labelKey: 'checkout.stepGuest', hintKey: 'checkout.stepGuestHint' },
  { id: 3, labelKey: 'checkout.stepPayment', hintKey: 'checkout.stepPaymentHint' }
];

const STATUS_KEYS = {
  new: 'checkout.statusSubmitted',
  confirmed: 'checkout.statusConfirmed',
  cancelled: 'checkout.statusCancelled',
  pending: 'checkout.statusPending'
};

const CheckoutPage = () => {
  const { t, locale } = useTranslation();
  const { cart, setCart, addBooking, user, login, bookings } = useBooking();
  const { getHotelById } = useHotels();
  const [guestRooms, setGuestRooms] = useState([]);
  const [step, setStep] = useState(1);
  const [stay, setStay] = useState({
    checkIn: cart?.checkIn || '',
    checkOut: cart?.checkOut || '',
    adults: cart?.adults ?? 2,
    children: cart?.children ?? 0,
    infants: cart?.infants ?? 0
  });
  const [payment, setPayment] = useState('card');
  const [guest, setGuest] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    specialRequests: ''
  });
  const [extraBedNeeded, setExtraBedNeeded] = useState(false);
  const [extraBedCount, setExtraBedCount] = useState(1);
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [confirmed, setConfirmed] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState(null);

  const today = new Date().toISOString().split('T')[0];
  const emDash = t('common.emDash', '—');

  const paymentMethods = useMemo(
    () => PAYMENT_METHOD_KEYS.map((m) => ({ ...m, label: t(m.labelKey) })),
    [t]
  );

  const steps = useMemo(
    () => STEP_KEYS.map((s) => ({ ...s, label: t(s.labelKey), hint: t(s.hintKey) })),
    [t]
  );

  const nights = useMemo(
    () => nightsBetween(stay.checkIn, stay.checkOut),
    [stay.checkIn, stay.checkOut]
  );

  const pricing = useMemo(
    () =>
      cart
        ? calcBookingTotal(cart.roomPrice, nights, 0, cart.stayTotal)
        : { subtotal: 0, tax: 0, total: 0, nights },
    [cart, nights]
  );

  const statusLabel = useCallback(
    (status) => t(STATUS_KEYS[status], status),
    [t]
  );

  useEffect(() => {
    if (!cart?.hotelId) {
      setGuestRooms([]);
      return undefined;
    }
    let active = true;
    fetchGuestPropertyRooms(cart.hotelId)
      .then((rooms) => active && setGuestRooms(rooms))
      .catch(() => active && setGuestRooms([]));
    return () => {
      active = false;
    };
  }, [cart?.hotelId]);

  const displayHotelName = useMemo(() => {
    const hotel = cart?.hotelId ? getHotelById(cart.hotelId) : null;
    if (hotel) return getPropertyDisplayName(hotel, locale);
    return cart?.hotelName || '';
  }, [cart?.hotelId, cart?.hotelName, getHotelById, locale]);

  const displayRoom = useMemo(
    () => guestRooms.find((room) => String(room.id) === String(cart?.roomId)),
    [guestRooms, cart?.roomId]
  );

  const displayRoomName = useMemo(
    () => (displayRoom ? getRoomDisplayName(displayRoom, locale) : (cart?.roomName || '')),
    [displayRoom, cart?.roomName, locale]
  );

  const displayRoomDescription = useMemo(
    () => (displayRoom ? getRoomDescription(displayRoom, locale) : (cart?.roomDescription || '')),
    [displayRoom, cart?.roomDescription, locale]
  );

  const validateStep1 = useCallback(() => {
    if (!stay.checkIn || !stay.checkOut) {
      return t('checkout.selectDates', 'Select check-in and check-out dates to continue.');
    }
    if (stay.checkOut <= stay.checkIn) {
      return t('checkout.checkoutAfterCheckin', 'Check-out must be after check-in.');
    }
    return null;
  }, [stay.checkIn, stay.checkOut, t]);

  const validateStep2 = useCallback(() => {
    if (!guest.firstName?.trim() || !guest.lastName?.trim()) {
      return t('checkout.nameRequired', 'First and last name are required.');
    }
    if (!guest.email?.trim()) return t('checkout.emailRequired', 'Email is required.');
    if (!guest.phone?.trim()) return t('checkout.phoneRequired', 'Phone number is required.');
    return null;
  }, [guest, t]);

  if (!cart && !confirmed) {
    return (
      <div className="page-center checkout-empty">
        <h2>{t('checkout.emptyTitle', 'Your cart is empty')}</h2>
        <p>{t('checkout.emptyDesc', 'Search for a hotel and select a room to continue.')}</p>
        <Link to="/search" className="cta-button">{t('checkout.searchHotels', 'Search hotels')}</Link>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="page-center checkout-success">
        <div className="success-message">
          <div className="check-icon"><Icon name="check" size={40} /></div>
          <h2>{t('checkout.submitted', 'Booking submitted!')}</h2>
          <p>{t('checkout.confirmation', 'Confirmation #:')} <strong>{confirmed.id}</strong></p>
          <p>{t('checkout.status', 'Status:')} <strong>{statusLabel(confirmed.status)}</strong></p>
          <p>{displayHotelName} · {displayRoomName}</p>
          <p>{confirmed.checkIn} → {confirmed.checkOut}</p>
          {confirmed.total != null && (
            <p>{t('checkout.estimatedTotal', 'Estimated total:')} <strong>${confirmed.total}</strong></p>
          )}
        </div>
        <div className="checkout-success-actions">
          <button
            type="button"
            className="cta-button"
            onClick={() => printBookingInvoice({ ...confirmed, payment })}
          >
            {t('checkout.printPdf', 'Print / Save PDF')}
          </button>
          <Link to="/my-bookings" className="book-button secondary">{t('checkout.viewBookings', 'View my bookings')}</Link>
          <Link to="/search" className="link-button">{t('checkout.bookAnother', 'Book another stay')}</Link>
        </div>
      </div>
    );
  }

  const updateStay = (field, value) => {
    setStay((prev) => ({ ...prev, [field]: value }));
    setStepError(null);
  };

  const verifyAvailability = async (activeCart) => {
    const availability = await checkRoomAvailabilityForStay({
      propertyId: activeCart.hotelId,
      roomTypeId: activeCart.roomId,
      checkIn: activeCart.checkIn,
      checkOut: activeCart.checkOut,
      totalUnits: activeCart.totalUnits ?? 1,
      adults: activeCart.adults,
      children: activeCart.children ?? 0,
      knownBookings: bookings,
      isStaff: user?.is_staff === true
    });

    if (!availability.available) {
      return availability.message || t('errors.roomUnavailable', 'This room is not available for the selected dates.');
    }
    return null;
  };

  const applyStayToCart = () => {
    setCart({
      ...cart,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: stay.adults,
      children: stay.children,
      infants: stay.infants,
      nights
    });
  };

  const handleContinue = async () => {
    setStepError(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setStepError(err);
        return;
      }

      const activeCart = {
        ...cart,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: stay.adults,
        children: stay.children,
        infants: stay.infants,
        nights
      };

      setSubmitting(true);
      try {
        const availabilityErr = await verifyAvailability(activeCart);
        if (availabilityErr) {
          setStepError(availabilityErr);
          return;
        }
        applyStayToCart();
        setStep(2);
      } catch (err) {
        setStepError(err.message || t('checkout.couldNotVerifyAvailability', 'Could not verify room availability.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) {
        setStepError(err);
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStepError(null);

    const stayErr = validateStep1();
    if (stayErr) {
      setStepError(stayErr);
      setStep(1);
      return;
    }
    const guestErr = validateStep2();
    if (guestErr) {
      setStepError(guestErr);
      setStep(2);
      return;
    }

    applyStayToCart();

    const activeCart = {
      ...cart,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: stay.adults,
      children: stay.children,
      infants: stay.infants,
      nights
    };

    setSubmitting(true);
    try {
      const availabilityErr = await verifyAvailability(activeCart);
      if (availabilityErr) {
        setStepError(availabilityErr);
        setStep(1);
        return;
      }

      const booking = await addBooking({
        hotelId: activeCart.hotelId,
        hotelName: activeCart.hotelName,
        hotelImage: activeCart.hotelImage,
        city: activeCart.city,
        roomId: activeCart.roomId,
        roomName: activeCart.roomName,
        roomImage: activeCart.roomImage,
        checkIn: activeCart.checkIn,
        checkOut: activeCart.checkOut,
        adults: activeCart.adults,
        children: activeCart.children,
        infants: activeCart.infants,
        nights,
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        total: pricing.total,
        payment,
        guest: { ...guest },
        breakfast: activeCart.breakfast,
        refundable: activeCart.refundable,
        extraBedNeeded,
        extraBedCount: extraBedNeeded ? extraBedCount : 0,
        cart: activeCart
      });
      setConfirmed(booking);
    } catch (err) {
      setStepError(formatApiErrors(err.data) || err.message || t('checkout.couldNotCompleteBooking', 'Could not complete booking'));
    } finally {
      setSubmitting(false);
    }
  };

  const nightsLabel =
    nights === 1
      ? t('checkout.nights', '{{count}} night', { count: nights })
      : t('checkout.nightsPlural', '{{count}} nights', { count: nights });

  const guestsSummary = `${t('checkout.guestsSummary', '{{adults}} adults, {{children}} children', {
    adults: stay.adults,
    children: stay.children
  })}${stay.infants > 0 ? t('checkout.guestsSummaryInfants', ', {{infants}} infants', { infants: stay.infants }) : ''}`;

  return (
    <div className="checkout-page checkout-page--compact">
      <div className="checkout-page-header">
        <div>
          <h1>{t('checkout.title', 'Complete your booking')}</h1>
          <p>{t('checkout.subtitle', 'Review your stay, add guest details, and submit your booking request securely.')}</p>
        </div>
        <div className="checkout-trust-strip" aria-label={t('checkout.checkoutTrustSignals', 'Checkout trust signals')}>
          <span>
            <Icon name="shield" size={15} />
            {t('checkout.secureCheckout', 'Secure checkout')}
          </span>
          <span>
            <Icon name="check" size={15} />
            {t('checkout.finalPriceShown', 'Final price shown')}
          </span>
          {cart.refundable && (
            <span>
              <Icon name="check" size={15} />
              {t('hotel.freeCancellation', 'Free cancellation on most rooms')}
            </span>
          )}
        </div>
      </div>

      <nav className="checkout-steps" aria-label={t('checkout.bookingSteps', 'Booking steps')}>
        {steps.map((s) => (
          <div
            key={s.id}
            className={`checkout-step ${step === s.id ? 'is-active' : ''} ${step > s.id ? 'is-done' : ''}`}
          >
            <span className="checkout-step-num">{step > s.id ? '✓' : s.id}</span>
            <span className="checkout-step-text">
              <strong>{s.label}</strong>
              <small>{s.hint}</small>
            </span>
          </div>
        ))}
      </nav>

      <div className="checkout-layout">
        <div className="checkout-form checkout-form--compact">
          {stepError && (
            <div className="error-message auth-form-error checkout-step-error">
              <pre>{stepError}</pre>
            </div>
          )}

          {step === 1 && (
            <section className="checkout-section">
              <h2>{t('checkout.stayDetails', 'Stay details')}</h2>
              <p className="checkout-section-lead">{t('checkout.stayLead', 'Confirm your dates and guests before we check live availability.')}</p>

              <div className="checkout-stay-card checkout-stay-card--inline checkout-stay-card--rich">
                {cart.roomImage && (
                  <div
                    className="checkout-stay-card__image"
                    style={{ backgroundImage: `url(${cart.roomImage})` }}
                    aria-hidden="true"
                  />
                )}
                <div className="checkout-stay-card__copy">
                  <strong>{displayRoomName}</strong>
                  <span>{displayHotelName} · {cart.city}</span>
                  {cart.roomSize && <span>{cart.roomSize}</span>}
                  {displayRoomDescription && (
                    <p className="checkout-stay-card__desc">{displayRoomDescription}</p>
                  )}
                  {cart.maxAdults != null && (
                    <span>
                      {t('hotel.upToGuests', 'Up to {{count}} guests', { count: cart.roomCapacity ?? cart.maxAdults })}
                    </span>
                  )}
                </div>
              </div>

              <div className="checkout-compact-grid checkout-compact-grid--5">
                <div className="form-group">
                  <label htmlFor="checkout-check-in">{t('hotel.checkIn', 'Check-in')} {t('common.required', '*')}</label>
                  <input
                    id="checkout-check-in"
                    type="date"
                    min={today}
                    required
                    value={stay.checkIn}
                    onChange={(e) => updateStay('checkIn', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-check-out">{t('hotel.checkOut', 'Check-out')} {t('common.required', '*')}</label>
                  <input
                    id="checkout-check-out"
                    type="date"
                    min={stay.checkIn || today}
                    required
                    value={stay.checkOut}
                    onChange={(e) => updateStay('checkOut', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-adults">{t('checkout.adults', 'Adults')}</label>
                  <select
                    id="checkout-adults"
                    value={stay.adults}
                    onChange={(e) => updateStay('adults', Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-children">{t('checkout.children', 'Children')}</label>
                  <select
                    id="checkout-children"
                    value={stay.children}
                    onChange={(e) => updateStay('children', Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-infants">{t('checkout.infants', 'Infants')}</label>
                  <select
                    id="checkout-infants"
                    value={stay.infants}
                    onChange={(e) => updateStay('infants', Number(e.target.value))}
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {cart.extraBedAllowed && (
                <div className="checkout-extra-bed checkout-extra-bed--inline">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={extraBedNeeded}
                      onChange={(e) => setExtraBedNeeded(e.target.checked)}
                    />
                    <span>{t('checkout.extraBed', 'Extra bed')}</span>
                  </label>
                  {extraBedNeeded && (
                    <div className="form-group checkout-extra-bed-qty">
                      <label htmlFor="checkout-extra-beds">{t('checkout.qty', 'Qty')}</label>
                      <select
                        id="checkout-extra-beds"
                        value={extraBedCount}
                        onChange={(e) => setExtraBedCount(Number(e.target.value))}
                      >
                        {[1, 2, 3].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="checkout-step-actions">
                <Link to={`/hotel/${cart.hotelId}`} className="link-button">{t('checkout.changeRoom', 'Change room')}</Link>
                <button type="button" className="submit-button" onClick={handleContinue} disabled={submitting}>
                  {submitting
                    ? t('checkout.checkingAvailability', 'Checking availability…')
                    : t('checkout.continueToGuestInfo', 'Continue to guest info')}
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="checkout-section">
              <h2>{t('checkout.guestInformation', 'Guest information')}</h2>
              <p className="checkout-section-lead">{t('checkout.guestInfoLead', 'Use the details the property should receive for this reservation.')}</p>

              <div className="checkout-compact-grid checkout-compact-grid--4">
                <div className="form-group">
                  <label htmlFor="checkout-first-name">{t('checkout.firstName', 'First name')} {t('common.required', '*')}</label>
                  <input
                    id="checkout-first-name"
                    required
                    value={guest.firstName}
                    onChange={(e) => {
                      setGuest({ ...guest, firstName: e.target.value });
                      setStepError(null);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-last-name">{t('checkout.lastName', 'Last name')} {t('common.required', '*')}</label>
                  <input
                    id="checkout-last-name"
                    required
                    value={guest.lastName}
                    onChange={(e) => {
                      setGuest({ ...guest, lastName: e.target.value });
                      setStepError(null);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-email">{t('checkout.email', 'Email')} {t('common.required', '*')}</label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    value={guest.email}
                    onChange={(e) => {
                      setGuest({ ...guest, email: e.target.value });
                      setStepError(null);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="checkout-phone">{t('checkout.phone', 'Phone')} {t('common.required', '*')}</label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    value={guest.phone}
                    onChange={(e) => {
                      setGuest({ ...guest, phone: e.target.value });
                      setStepError(null);
                    }}
                  />
                </div>
              </div>
              <div className="form-group checkout-special-requests">
                <label htmlFor="checkout-special-requests">{t('checkout.specialRequests', 'Special requests')}</label>
                <textarea
                  id="checkout-special-requests"
                  rows={2}
                  value={guest.specialRequests}
                  onChange={(e) => setGuest({ ...guest, specialRequests: e.target.value })}
                />
              </div>

              <div className="checkout-step-actions">
                <button type="button" className="book-button secondary" onClick={handleBack}>
                  {t('checkout.back', 'Back')}
                </button>
                <button type="button" className="submit-button" onClick={handleContinue}>
                  {t('checkout.continueToPayment', 'Continue to payment')}
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <form className="checkout-section" onSubmit={handleSubmit}>
              <h2>{t('checkout.stepPayment', 'Payment')}</h2>
              <p className="checkout-section-lead">{t('checkout.paymentLead', 'Choose how you want this demo booking recorded.')}</p>

              <div className="checkout-review-strip checkout-review-strip--compact">
                <div>
                  <strong>{displayHotelName}</strong>
                  <span>{displayRoomName}</span>
                </div>
                <div>
                  <strong>{stay.checkIn} → {stay.checkOut}</strong>
                  <span>{nightsLabel} · {t('checkout.reviewAdults', '{{count}} adults', { count: stay.adults })}</span>
                </div>
                <div>
                  <strong>{guest.firstName} {guest.lastName}</strong>
                  <span>{guest.email}</span>
                </div>
              </div>

              <div className="payment-options payment-options--compact">
                {paymentMethods.map((m) => (
                  <label key={m.id} className={`payment-option ${payment === m.id ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value={m.id}
                      checked={payment === m.id}
                      onChange={() => setPayment(m.id)}
                      disabled={submitting}
                    />
                    <span>
                      <Icon name={m.icon} size={20} />
                      {m.label}
                    </span>
                  </label>
                ))}
              </div>

              {payment === 'card' && (
                <div className="card-fields card-fields--compact">
                  <div className="checkout-compact-grid checkout-compact-grid--2">
                    <div className="form-group checkout-compact-grid--full">
                      <label htmlFor="checkout-card-name">{t('checkout.cardName', 'Name on card')}</label>
                      <input
                        id="checkout-card-name"
                        value={card.name}
                        onChange={(e) => setCard({ ...card, name: e.target.value })}
                        placeholder={t('checkout.demoCardPlaceholder', 'Demo only — no real charge')}
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group checkout-compact-grid--full">
                      <label htmlFor="checkout-card-number">{t('checkout.cardNumber', 'Card number')}</label>
                      <input
                        id="checkout-card-number"
                        value={card.number}
                        onChange={(e) => setCard({ ...card, number: e.target.value })}
                        placeholder="4242 4242 4242 4242"
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="checkout-card-expiry">{t('checkout.expiry', 'Expiry')}</label>
                      <input
                        id="checkout-card-expiry"
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                        placeholder="MM/YY"
                        disabled={submitting}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="checkout-card-cvv">{t('checkout.cvv', 'CVV')}</label>
                      <input
                        id="checkout-card-cvv"
                        value={card.cvv}
                        onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                        placeholder="123"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="checkout-step-actions">
                <button type="button" className="book-button secondary" onClick={handleBack} disabled={submitting}>
                  {t('checkout.back', 'Back')}
                </button>
                <button type="submit" className="submit-button" disabled={submitting}>
                  {submitting ? t('checkout.submitting', 'Submitting…') : t('checkout.confirmBooking', 'Confirm booking')}
                </button>
              </div>

              <p className="checkout-note">
                {t('checkout.demoNote', 'Your booking is sent to the property with status "new". Payment is simulated on this demo.')}
              </p>
            </form>
          )}
        </div>

        <aside className="checkout-summary">
          <div
            className="summary-hotel-image"
            style={{ backgroundImage: cart.hotelImage ? `url(${cart.hotelImage})` : undefined }}
          />
          <h3>{displayHotelName}</h3>
          <p className="link-with-icon">
            <Icon name="map-pin" size={16} />
            <span>{cart.city}</span>
          </p>
          <hr />
          {cart.roomImage && (
            <div
              className="summary-room-image"
              style={{ backgroundImage: `url(${cart.roomImage})` }}
              role="img"
              aria-label={displayRoomName}
            />
          )}
          <dl className="summary-dl">
            <dt>{t('checkout.room', 'Room')}</dt>
            <dd>
              <span>{displayRoomName}</span>
              {cart.roomSize && <small>{cart.roomSize}</small>}
              {displayRoomDescription && (
                <p className="summary-room-desc">{displayRoomDescription}</p>
              )}
            </dd>
            <dt>{t('checkout.dates', 'Dates')}</dt>
            <dd>
              {stay.checkIn && stay.checkOut
                ? `${stay.checkIn} → ${stay.checkOut}`
                : t('checkout.selectDatesStep1', 'Select dates in step 1')}
            </dd>
            <dt>{t('hotel.guests', 'Guests')}</dt>
            <dd>{guestsSummary}</dd>
            <dt>{t('checkout.nightsLabel', 'Nights')}</dt>
            <dd>{stay.checkIn && stay.checkOut ? nights : emDash}</dd>
            <dt>{t('checkout.breakfast', 'Breakfast')}</dt>
            <dd>{cart.breakfast}</dd>
            {extraBedNeeded && (
              <>
                <dt>{t('checkout.extraBed', 'Extra bed')}</dt>
                <dd>{extraBedCount}</dd>
              </>
            )}
          </dl>
          {cart.nightlyPrices?.length > 0 && (
            <div className="checkout-nightly-prices">
              <p className="checkout-nightly-prices__title">{t('checkout.nightlyRates', 'Nightly rates')}</p>
              <ul>
                {cart.nightlyPrices.map((night) => (
                  <li key={night.date}>
                    <span>{formatStayDate(night.date)}</span>
                    <span>{formatMoney(night.price, cart.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <hr />
          <div className="summary-total">
            <span>{t('checkout.total', 'Total')}</span>
            <strong>{formatMoney(pricing.total, cart.currency)}</strong>
          </div>
          {cart.refundable && (
            <p className="refund-note link-with-icon">
              <Icon name="check" size={16} />
              <span>{t('checkout.freeCancellationDemo', 'Free cancellation before check-in (demo policy)')}</span>
            </p>
          )}
          <div className="checkout-summary-trust">
            <span>
              <Icon name="shield" size={15} />
              {t('checkout.secureRequest', 'Secure request')}
            </span>
            <span>
              <Icon name="clipboard-list" size={15} />
              {t('checkout.bookingSentToProperty', 'Booking sent to property')}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPage;
