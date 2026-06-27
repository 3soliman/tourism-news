'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from '@/lib/router-compat';
import { useBooking } from '../context/BookingContext';
import { useHotels } from '../context/HotelsContext';
import { useTranslation } from '../context/I18nContext';
import { parseSearchFromParams, nightsBetween, searchToQueryString, filterGuestRooms, defaultSearch } from '../utils/searchUtils';
import { getHotelAmenities, resolveMediaUrl } from '../utils/mapHotel';
import PropertyGuestInfo from '../components/hotel/PropertyGuestInfo';
import HotelPropertyVideos from '../components/hotel/HotelPropertyVideos';
import HotelAmenities from '../components/hotel/HotelAmenities';
import { fetchGuestPropertyServices } from '../api/propertyServicesApi';
import { fetchGuestPropertyRooms } from '../api/roomTypesApi';
import { checkRoomAvailabilityForStay } from '../api/availabilityBlocksApi';
import {
  fetchMappedPropertyAvailability,
  fetchPropertyRates,
  resolveStayPricePerNight,
  resolveStayPriceTotal
} from '../api/propertyStayApi';
import RoomAvailabilityBadge from '../components/hotel/RoomAvailabilityBadge';
import RoomRateBreakdown from '../components/hotel/RoomRateBreakdown';
import RoomBookingModal from '../components/hotel/RoomBookingModal';
import { formatMoney, getAvailabilityBadge } from '../utils/roomAvailability';
import PropertyLocationMap from '@/components/maps/PropertyLocationMapDynamic';
import { resolvePropertyMapCoords } from '@/utils/propertyMapCoords';
import PropertyServicesList from '../components/hotel/PropertyServicesList';
import PropertyReviewsSection from '../components/hotel/PropertyReviewsSection';
import SearchBar from '../components/search/SearchBar';
import { ApiError, ApiLoading } from '../components/shared/ApiStatus';
import { CardSkeleton } from '../components/shared/LoadingSkeletons';
import Icon from '../components/icons/Icon';
import StarRating from '../components/icons/StarRating';
import { normalizeDisplayImages, mergePropertyHotelUpdate } from '../utils/hotelImages';
import { getRoomDisplayName, getRoomDescription } from '../utils/roomDisplay';
import { getPropertyDisplayName, getPropertyDescription, getPropertyShortDescription } from '../utils/propertyDisplay';

const HotelDetailPage = ({ initialHotel = null }) => {
  const { t, locale } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCart, setSearch, search: globalSearch, bookings, user } = useBooking();
  const { getHotelById, loadHotelById, seedHotel, loading, error, refresh, destinations } = useHotels();
  const [hotel, setHotel] = useState(() => initialHotel || getHotelById(id));
  const [detailLoading, setDetailLoading] = useState(!(initialHotel || getHotelById(id)));
  const [detailError, setDetailError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [propertyServices, setPropertyServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [guestRooms, setGuestRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomMinGuests, setRoomMinGuests] = useState('');
  const [roomBreakfastOnly, setRoomBreakfastOnly] = useState(false);
  const [reserveError, setReserveError] = useState(null);
  const [stayAvailability, setStayAvailability] = useState(null);
  const [stayRates, setStayRates] = useState(null);
  const [stayDataLoading, setStayDataLoading] = useState(false);
  const [stayDataError, setStayDataError] = useState(null);
  const [reservingRoomId, setReservingRoomId] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [searchOverride, setSearchOverride] = useState(null);

  const [params] = useSearchParams();
  const searchParamsKey = params.toString();

  const localSearch = useMemo(() => {
    if (searchOverride) {
      return { ...defaultSearch, ...searchOverride };
    }
    const fromUrl = parseSearchFromParams(new URLSearchParams(searchParamsKey));
    return {
      ...defaultSearch,
      destination: fromUrl.destination || globalSearch.destination,
      checkIn: fromUrl.checkIn || globalSearch.checkIn,
      checkOut: fromUrl.checkOut || globalSearch.checkOut,
      adults: fromUrl.adults || globalSearch.adults,
      children: fromUrl.children ?? globalSearch.children,
      infants: fromUrl.infants ?? globalSearch.infants ?? 0,
      rooms: fromUrl.rooms || globalSearch.rooms
    };
  }, [searchOverride, searchParamsKey, globalSearch]);
  useEffect(() => {
    if (!searchOverride) return undefined;
    const fromUrl = parseSearchFromParams(new URLSearchParams(searchParamsKey));
    if (
      fromUrl.checkIn === searchOverride.checkIn &&
      fromUrl.checkOut === searchOverride.checkOut &&
      String(fromUrl.adults) === String(searchOverride.adults) &&
      String(fromUrl.children ?? 0) === String(searchOverride.children ?? 0)
    ) {
      setSearchOverride(null);
    }
    return undefined;
  }, [searchParamsKey, searchOverride]);

  useEffect(() => {
    const parsed = parseSearchFromParams(new URLSearchParams(searchParamsKey));
    if (!parsed.checkIn && !parsed.checkOut && !parsed.destination) return;
    setSearch((prev) => {
      const next = { ...prev, ...parsed };
      const changed = ['destination', 'checkIn', 'checkOut', 'adults', 'children', 'infants', 'rooms'].some(
        (key) => String(next[key] ?? '') !== String(prev[key] ?? '')
      );
      return changed ? next : prev;
    });
  }, [searchParamsKey, setSearch]);

  const nights = nightsBetween(localSearch.checkIn, localSearch.checkOut);
  const hasStayDates = Boolean(
    localSearch.checkIn &&
      localSearch.checkOut &&
      localSearch.checkOut > localSearch.checkIn
  );
  const images = useMemo(
    () => (hotel ? normalizeDisplayImages(hotel) : []),
    [hotel]
  );

  const propertyDisplayName = useMemo(
    () => (hotel ? getPropertyDisplayName(hotel, locale) : ''),
    [hotel, locale]
  );

  const propertyDescription = useMemo(
    () =>
      hotel
        ? getPropertyDescription(hotel, locale) || getPropertyShortDescription(hotel, locale)
        : '',
    [hotel, locale]
  );

  const [isMobileStickyVisible, setIsMobileStickyVisible] = useState(false);

  const lowestPrice = useMemo(() => {
    if (!guestRooms || guestRooms.length === 0) return null;
    let minPrice = Infinity;
    let minCurrency = 'USD';
    guestRooms.forEach(room => {
      const rate = stayRates?.byRoomId?.[room.id];
      const unit = stayAvailability?.byRoomId?.[room.id];
      const perNight = hasStayDates
        ? resolveStayPricePerNight(rate, {
            roomPrice: room.price,
            nights,
            pricePerNight: unit?.pricePerNight
          })
        : room.price;
      if (perNight < minPrice) {
        minPrice = perNight;
        minCurrency = rate?.currency || room.currency || 'USD';
      }
    });
    return minPrice === Infinity ? null : { amount: minPrice, currency: minCurrency };
  }, [guestRooms, stayRates, stayAvailability, nights, hasStayDates]);

  const scrollToRooms = () => {
    document.getElementById('hotel-rooms')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      const roomsEl = document.getElementById('hotel-rooms');
      if (!roomsEl) return;
      const rect = roomsEl.getBoundingClientRect();
      const isRoomsInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      const isPastHero = window.scrollY > 300;
      setIsMobileStickyVisible(isPastHero && !isRoomsInViewport);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (initialHotel?.id) seedHotel(initialHotel);
  }, [initialHotel, seedHotel]);

  useEffect(() => {
    let cancelled = false;
    const cached = initialHotel || getHotelById(id);
    if (cached) {
      setHotel(cached);
    }
    setDetailLoading(!cached);
    setDetailError(null);

    // Always fetch full property detail (policies, social, contacts are not on list cards)
    loadHotelById(id, { force: true })
      .then((h) => {
        if (!cancelled && h) {
          setHotel((prev) => mergePropertyHotelUpdate(prev, h));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          if (!cached) setDetailError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // loadHotelById is stable; getHotelById only seeds first paint from cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, initialHotel?.id]);

  useEffect(() => {
    let cancelled = false;
    setServicesLoading(true);
    fetchGuestPropertyServices(id)
      .then((list) => {
        if (!cancelled) setPropertyServices(list);
      })
      .catch(() => {
        if (!cancelled) setPropertyServices([]);
      })
      .finally(() => {
        if (!cancelled) setServicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    setRoomsError(null);
    fetchGuestPropertyRooms(id, {
      adults: localSearch.adults,
      children: localSearch.children
    })
      .then((list) => {
        if (!cancelled) {
          setGuestRooms(list);
          setRoomsError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setGuestRooms([]);
          setRoomsError(err.message || t('hotel.couldNotLoadRooms', 'Could not load rooms from the server.'));
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, localSearch.adults, localSearch.children]);

  useEffect(() => {
    setRoomSearchQuery('');
    setRoomMinGuests('');
    setRoomBreakfastOnly(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    if (!hasStayDates) {
      setStayAvailability(null);
      setStayRates(null);
      setStayDataError(null);
      setStayDataLoading(false);
      return undefined;
    }

    setStayDataLoading(true);
    setStayDataError(null);

    Promise.all([
      fetchMappedPropertyAvailability({
        propertyId: id,
        checkIn: localSearch.checkIn,
        checkOut: localSearch.checkOut,
        adults: localSearch.adults,
        children: localSearch.children ?? 0,
        force: true
      }),
      fetchPropertyRates(id, localSearch.checkIn, localSearch.checkOut, { force: true })
    ])
      .then(([availability, rates]) => {
        if (!cancelled) {
          setStayAvailability(availability);
          setStayRates(rates);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStayAvailability(null);
          setStayRates(null);
          setStayDataError(err.message || t('hotel.couldNotLoadRates', 'Could not load availability and rates.'));
        }
      })
      .finally(() => {
        if (!cancelled) setStayDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasStayDates,
    id,
    localSearch.checkIn,
    localSearch.checkOut,
    localSearch.adults,
    localSearch.children
  ]);

  const displayRooms = useMemo(() => {
    const fallback = hotel?.rooms || [];
    return guestRooms.length > 0 ? guestRooms : fallback;
  }, [guestRooms, hotel]);

  const filteredRooms = useMemo(
    () =>
      filterGuestRooms(displayRooms, roomSearchQuery, {
        minGuests: roomMinGuests ? Number(roomMinGuests) : 0,
        breakfastOnly: roomBreakfastOnly
      }),
    [displayRooms, roomSearchQuery, roomMinGuests, roomBreakfastOnly]
  );

  const hasRoomFilters = Boolean(roomSearchQuery.trim() || roomMinGuests || roomBreakfastOnly);
  const showRoomSearch = displayRooms.length > 1;

  if (detailLoading || (loading && !hotel)) {
    return <ApiLoading message={t('hotel.loading', 'Loading hotel details...')} variant="property-detail" />;
  }

  if (detailError || error) {
    const errMsg = detailError || error;
    if (errMsg === 'This property does not belong to the current hotel website.') {
      return (
        <main className="invalid-hotel-page">
          <div className="invalid-hotel-card">
            <span className="invalid-hotel-brand">Almohit Hotels</span>
            <h1>{t('hotel.unavailable', 'Property Unavailable')}</h1>
            <p>{t('errors.propertyNotOnSite', 'This property does not belong to the current hotel website.')}</p>
            <Link to="/" className="cta-button" style={{ marginTop: '24px', display: 'inline-block' }}>{t('hotel.backToHome', 'Back to home')}</Link>
          </div>
        </main>
      );
    }
    return <ApiError message={errMsg} onRetry={refresh} />;
  }

  if (!hotel) {
    return (
      <main className="invalid-hotel-page">
        <div className="invalid-hotel-card">
          <span className="invalid-hotel-brand">Almohit Hotels</span>
          <h1>{t('hotel.notFound', 'Hotel Not Found')}</h1>
          <p>{t('hotel.notFoundWebsiteDesc', 'We could not find the requested property on this hotel website.')}</p>
          <Link to="/" className="cta-button" style={{ marginTop: '24px', display: 'inline-block' }}>{t('hotel.backToHome', 'Back to home')}</Link>
        </div>
      </main>
    );
  }

  const amenities = getHotelAmenities(hotel);
  const mapCoords = resolvePropertyMapCoords(hotel.latitude, hotel.longitude);
  const guestAverageRating =
    reviewSummary?.averageRating ?? hotel.averageRating ?? (hotel.reviewCount > 0 ? hotel.rating : null);
  const guestReviewCount = reviewSummary?.totalReviews ?? hotel.reviewCount ?? 0;

  const handleReserve = (room) => {
    setReserveError(null);

    if (!localSearch.checkIn || !localSearch.checkOut) {
      setReserveError(t('hotel.selectDatesAbove', 'Please select check-in and check-out dates in the search bar above, then try again.'));
      document.querySelector('.detail-search-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (localSearch.checkOut <= localSearch.checkIn) {
      setReserveError(t('checkout.checkoutAfterCheckin', 'Check-out must be after check-in.'));
      return;
    }

    const unit = stayAvailability?.byRoomId?.[room.id];
    const badge = unit
      ? getAvailabilityBadge(unit.availableUnits, unit.isAvailable, {
          totalUnits: unit.totalUnits ?? room.totalUnits
        })
      : null;
    if (badge && !badge.bookable) {
      setReserveError(t('hotel.soldOutForDates', 'This room is sold out for the selected dates.'));
      return;
    }

    setBookingRoom(room);
  };

  const handleConfirmBooking = async () => {
    const room = bookingRoom;
    if (!room || !hotel) return;

    setReservingRoomId(room.id);
    setReserveError(null);
    try {
      const availability = await checkRoomAvailabilityForStay({
        propertyId: hotel.id,
        roomTypeId: room.id,
        checkIn: localSearch.checkIn,
        checkOut: localSearch.checkOut,
        totalUnits: room.totalUnits ?? 1,
        adults: localSearch.adults,
        children: localSearch.children ?? 0,
        knownBookings: bookings,
        isStaff: user?.is_staff === true
      });

      if (!availability.available) {
        setReserveError(availability.message || t('errors.roomUnavailable', 'This room is not available for the selected dates.'));
        return;
      }

      setSearch(localSearch);
      const rate = stayRates?.byRoomId?.[room.id];
      const stayTotal = resolveStayPriceTotal(rate, {
        roomPrice: room.price,
        nights,
        pricePerNight: stayAvailability?.byRoomId?.[room.id]?.pricePerNight
      });
      const currency = rate?.currency || room.currency || 'USD';

      setCart({
        hotelId: hotel.id,
        hotelName: propertyDisplayName,
        hotelImage: hotel.image,
        city: hotel.city,
        roomId: room.id,
        roomName: getRoomDisplayName(room, locale),
        roomImage: room.image || room.images?.[0] || '',
        roomImages: room.images || [],
        roomDescription: getRoomDescription(room, locale),
        roomSize: room.size || '',
        roomBed: room.bed || room.size || '',
        roomCapacity: room.capacity,
        maxAdults: room.maxAdults,
        maxChildren: room.maxChildren,
        roomPrice: nights > 0 ? stayTotal / nights : room.price,
        stayTotal,
        nightlyPrices: rate?.nightlyPrices ?? null,
        currency,
        totalUnits: room.totalUnits ?? 1,
        checkIn: localSearch.checkIn,
        checkOut: localSearch.checkOut,
        adults: localSearch.adults,
        children: localSearch.children,
        infants: localSearch.infants ?? 0,
        rooms: localSearch.rooms,
        nights,
        breakfast: room.breakfast,
        refundable: room.refundable,
        extraBedAllowed: room.extraBedAllowed === true
      });
      setBookingRoom(null);
      navigate('/checkout');
    } catch (err) {
      setReserveError(err.message || t('hotel.couldNotVerifyAvailabilityRetry', 'Could not verify room availability. Please try again.'));
    } finally {
      setReservingRoomId(null);
    }
  };

  const qs = searchToQueryString(localSearch);

  return (
    <div className="hotel-detail-page">
      <div className="breadcrumb">
        <Link to="/">{t('hotel.breadcrumbHome', 'Home')}</Link> / <Link to={`/search?${qs}`}>{t('hotel.breadcrumbSearch', 'Search')}</Link> / <span>{propertyDisplayName}</span>
      </div>

      <div className="detail-search-wrap">
        <SearchBar
          variant="compact"
          destinations={destinations}
          search={localSearch}
          onSearch={(normalized) => {
            setSearch(normalized);
            setSearchOverride(normalized);
            setStayAvailability(null);
            setStayRates(null);
            navigate(`/hotel/${id}?${searchToQueryString(normalized)}`, { replace: true });
          }}
        />
      </div>

      <div className="detail-gallery">
        <div
          className="detail-main-image"
          style={{
            backgroundImage: images[activeImage] ? `url(${images[activeImage]})` : undefined,
            backgroundColor: images.length ? undefined : '#e7e5e4'
          }}
        />
        {images.length > 1 && (
          <div className="detail-thumbs">
            {images.map((img, i) => (
              <button
                key={`${img}-${i}`}
                type="button"
                className={i === activeImage ? 'thumb active' : 'thumb'}
                style={{ backgroundImage: `url(${img})` }}
                onClick={() => setActiveImage(i)}
                aria-label={t('hotel.viewImage', 'View image {{n}}', { n: i + 1 })}
                aria-current={i === activeImage ? 'true' : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="detail-header">
        <div>
          <h1>{propertyDisplayName}</h1>
          <p className="detail-address">
            <span className="link-with-icon">
              <Icon name="map-pin" size={18} />
              <span>{hotel.address}, {hotel.city}, {hotel.country}</span>
            </span>
          </p>
          <div className="detail-meta">
            <span className="detail-stars">
              <StarRating value={hotel.stars} size={16} /> {t('hotel.starHotel', '{{stars}}-star hotel', { stars: hotel.stars })}
            </span>
            <span className="detail-rating">
              {guestReviewCount > 0 && guestAverageRating != null ? (
                <>
                  <StarRating value={guestAverageRating} size={14} />
                  <span>
                    {Number(guestAverageRating).toFixed(1)} · {guestReviewCount === 1
                      ? t('hotelCard.review', '1 review')
                      : t('hotelCard.reviews', '{{count}} reviews', { count: guestReviewCount })}
                  </span>
                </>
              ) : (
                <span className="detail-rating-empty">{t('hotel.noReviews', 'No reviews yet')}</span>
              )}
            </span>
          </div>

          <div className="trust-badges-inline" style={{ marginTop: '12px', marginBottom: '8px' }}>
            <span className="trust-badge-pill">
              <Icon name="check" size={12} />
              <span>{t('hotel.freeCancellation', 'Free cancellation on most rooms')}</span>
            </span>
            <span className="trust-badge-pill secured">
              <Icon name="shield" size={12} />
              <span>{t('hotel.instantConfirmation', 'Instant Confirmation')}</span>
            </span>
            <span className="trust-badge-pill secured">
              <Icon name="lock" size={12} />
              <span>{t('hotel.secureCheckoutLabel', 'Secure Checkout')}</span>
            </span>
          </div>

          {hotel.imageCaption && <p className="detail-caption">{hotel.imageCaption}</p>}
        </div>
      </div>

      <div className="detail-grid detail-grid--full">
        <div className="detail-main">
          <section className="detail-section">
            <h2>{t('hotel.about', 'About this property')}</h2>
            <p>{propertyDescription || t('hotel.noDescription', 'No description provided.')}</p>
          </section>

          <HotelPropertyVideos
            videoUrl={hotel.videoUrl}
            title={t('hotel.propertyVideo', 'Property video')}
            embedTitle={t('hotel.propertyVideoEmbed', 'Property video tour')}
          />

          <section id="hotel-rooms" className="detail-section detail-section--rooms">
            <h2>
              {t('hotel.availabilityRooms', 'Availability & rooms')}
              {!roomsLoading && displayRooms.length > 0 && (
                <span className="detail-section-count">
                  {hasRoomFilters
                    ? t('hotel.ofCount', '({{filtered}} of {{total}})', {
                        filtered: filteredRooms.length,
                        total: displayRooms.length
                      })
                    : t('hotel.countOnly', '({{count}})', { count: displayRooms.length })}
                </span>
              )}
            </h2>
            {reserveError && !bookingRoom && (
              <div className="error-message auth-form-error detail-reserve-error">
                <pre>{reserveError}</pre>
              </div>
            )}
            <p className="stay-dates">
              {hasStayDates
                ? `${localSearch.checkIn} → ${localSearch.checkOut} (${nights} ${nights > 1 ? t('bookingCard.nights', 'nights') : t('bookingCard.night', 'night')}) · ${localSearch.adults} ${localSearch.adults !== 1 ? t('checkout.adults', 'Adults').toLowerCase() : t('search.adults', 'Adults').toLowerCase().replace(/s$/, '')}${localSearch.children ? `, ${localSearch.children} ${localSearch.children !== 1 ? t('checkout.children', 'Children').toLowerCase() : t('search.children', 'Children').toLowerCase().replace(/ren$/, '')}` : ''}`
                : t('hotel.selectDatesForRates', 'Select dates in the search bar above to see live availability and seasonal rates')}
            </p>
            {stayDataError && <p className="field-error detail-stay-error">{stayDataError}</p>}
            {hasStayDates && stayAvailability && !stayAvailability.isAvailable && (
              <p className="detail-stay-notice">{t('hotel.noRoomsForDates', 'This property has no available rooms for the selected dates.')}</p>
            )}
            {roomsError && (
              <p className="field-error detail-rooms-error">{roomsError}</p>
            )}
            {roomsLoading ? (
              <CardSkeleton count={2} variant="room" message={t('hotel.loadingRooms', 'Loading rooms...')} />
            ) : displayRooms.length > 0 ? (
              <>
                {showRoomSearch && (
                  <div className="detail-room-search">
                    <div className="detail-room-search__row">
                      <label className="detail-room-search__field detail-room-search__field--grow">
                        <span className="detail-room-search__label">{t('hotel.searchRooms', 'Search rooms')}</span>
                        <div className="detail-room-search__input-wrap">
                          <Icon name="search" size={18} />
                          <input
                            type="search"
                            value={roomSearchQuery}
                            onChange={(e) => setRoomSearchQuery(e.target.value)}
                            placeholder={t('hotel.searchRoomsPlaceholder', 'Room name, type, guests, price…')}
                            autoComplete="off"
                            aria-label={t('hotel.searchRooms', 'Search rooms')}
                          />
                          {roomSearchQuery && (
                            <button
                              type="button"
                              className="detail-room-search__clear"
                              onClick={() => setRoomSearchQuery('')}
                              aria-label={t('hotel.clearRoomSearch', 'Clear room search')}
                            >
                              <Icon name="x" size={16} />
                            </button>
                          )}
                        </div>
                      </label>
                      <label className="detail-room-search__field">
                        <span className="detail-room-search__label">{t('hotel.minGuests', 'Min guests')}</span>
                        <select
                          value={roomMinGuests}
                          onChange={(e) => setRoomMinGuests(e.target.value)}
                          aria-label={t('hotel.minGuests', 'Min guests')}
                        >
                          <option value="">{t('hotel.any', 'Any')}</option>
                          <option value="2">2+</option>
                          <option value="3">3+</option>
                          <option value="4">4+</option>
                          <option value="5">5+</option>
                          <option value="6">6+</option>
                          <option value="8">8+</option>
                        </select>
                      </label>
                      <label className="detail-room-search__check">
                        <input
                          type="checkbox"
                          checked={roomBreakfastOnly}
                          onChange={(e) => setRoomBreakfastOnly(e.target.checked)}
                        />
                        <span>{t('hotel.breakfastIncluded', 'Breakfast included')}</span>
                      </label>
                    </div>
                    {hasRoomFilters && (
                      <p className="detail-room-search__meta">
                        {filteredRooms.length === displayRooms.length
                          ? (displayRooms.length === 1
                            ? t('hotel.showingRooms', 'Showing {{filtered}} of {{total}} room', {
                                filtered: filteredRooms.length,
                                total: displayRooms.length
                              })
                            : t('hotel.showingRoomsPlural', 'Showing {{filtered}} of {{total}} rooms', {
                                filtered: filteredRooms.length,
                                total: displayRooms.length
                              }))
                          : (displayRooms.length === 1
                            ? t('hotel.showingRooms', 'Showing {{filtered}} of {{total}} room', {
                                filtered: filteredRooms.length,
                                total: displayRooms.length
                              })
                            : t('hotel.showingRoomsPlural', 'Showing {{filtered}} of {{total}} rooms', {
                                filtered: filteredRooms.length,
                                total: displayRooms.length
                              }))}
                        {filteredRooms.length === 0 && t('hotel.tryDifferentSearch', ' — try a different search')}
                      </p>
                    )}
                  </div>
                )}
                {filteredRooms.length > 0 ? (
              <div className="rooms-list-detail">
                {filteredRooms.map((room) => {
                  const roomTitle = getRoomDisplayName(room, locale);
                  const roomDesc = getRoomDescription(room, locale);
                  const unit = stayAvailability?.byRoomId?.[room.id];
                  const rate = stayRates?.byRoomId?.[room.id];
                  const badge =
                    hasStayDates && unit
                      ? getAvailabilityBadge(unit.availableUnits, unit.isAvailable, {
                          totalUnits: unit.totalUnits ?? room.totalUnits
                        })
                      : null;
                  const isSoldOut = Boolean(badge && !badge.bookable);
                  const isChecking = hasStayDates && stayDataLoading;
                  const isReserving = reservingRoomId === room.id;
                  const currency = rate?.currency || room.currency || 'USD';
                  const totalPrice = resolveStayPriceTotal(rate, {
                    roomPrice: room.price,
                    nights,
                    pricePerNight: unit?.pricePerNight
                  });
                  const priceLabel = formatMoney(totalPrice, currency);
                  const perNightLabel = formatMoney(
                    resolveStayPricePerNight(rate, {
                      roomPrice: room.price,
                      nights,
                      pricePerNight: unit?.pricePerNight
                    }),
                    currency
                  );

                  return (
                    <div key={room.id} className={`room-row ${isSoldOut ? 'room-row-unavailable' : ''}`}>
                      <div className="room-row-image">
                        {room.images?.[0] ? (
                          <img
                            src={resolveMediaUrl(room.images[0])}
                            alt={roomTitle}
                            loading="lazy"
                            decoding="async"
                            className="room-card-img"
                          />
                        ) : (
                          <div className="room-image-placeholder" style={{ backgroundColor: '#e7e5e4', height: '100%', width: '100%' }} />
                        )}
                        {badge && (
                          <div className="room-row-image__badge">
                            <RoomAvailabilityBadge badge={badge} />
                          </div>
                        )}
                      </div>
                      <div className="room-row-info">
                        <h3>{roomTitle}</h3>
                        <p>
                          {room.size} · {t('hotel.upToGuests', 'Up to {{count}} guests', { count: room.capacity })}
                          {room.maxAdults != null && t('hotel.adultsChildren', ' ({{adults}} adults{{children}})', {
                            adults: room.maxAdults,
                            children: room.maxChildren
                              ? t('hotel.childrenSuffix', ', {{count}} children', { count: room.maxChildren })
                              : ''
                          })}
                        </p>
                        {roomDesc && <p className="room-row-desc">{roomDesc}</p>}
                        {room.breakfast && <p className="room-row-meta">{room.breakfast}</p>}
                        {hasStayDates && rate && <RoomRateBreakdown rate={rate} nights={nights} />}
                        {!hasStayDates && (
                          <p className="room-row-meta">
                            {t('hotel.fromPerNight', 'From {{price}} / night', {
                              price: formatMoney(room.price, room.currency)
                            })}
                          </p>
                        )}
                      </div>
                      <div className="room-row-book">
                        <div className="room-price">
                          <strong>{hasStayDates ? priceLabel : perNightLabel}</strong>
                          <span>
                            {hasStayDates
                              ? (nights > 1
                                ? t('hotel.totalForNightsShortPlural', 'total for {{nights}} nights', { nights })
                                : t('hotel.totalForNightsShort', 'total for {{nights}} night', { nights }))
                              : t('hotel.perNightSelectDates', 'per night · select dates for total')}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="book-button"
                          disabled={isSoldOut || isChecking || isReserving}
                          onClick={() => handleReserve(room)}
                        >
                          {isSoldOut
                            ? t('hotel.soldOut', 'Sold out')
                            : isChecking
                              ? t('hotel.checking', 'Checking…')
                              : isReserving
                                ? t('hotel.reserving', 'Reserving…')
                                : t('hotel.reserve', 'Reserve')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
                ) : (
                  <p className="admin-hint">{t('hotel.noRoomsMatch', 'No rooms match your search. Clear filters to see all rooms.')}</p>
                )}
              </>
            ) : (
              <p className="admin-hint">
                {t('hotel.noRoomTypes', 'No room types available for this property yet.')}
                {!roomsError && t('hotel.tryAnotherHotel', ' Try another hotel or refresh the page.')}
              </p>
            )}
          </section>

          {amenities.length > 0 && (
            <section className="detail-section detail-section--amenities">
              <h2>{t('hotel.amenities', 'Amenities')}</h2>
              <p className="detail-section-lead">
                {t('hotel.amenitiesLead', 'Services and facilities available at this property')}
              </p>
              <HotelAmenities hotel={hotel} variant="grid" />
            </section>
          )}

          {(servicesLoading || propertyServices.length > 0) && (
            <section className="detail-section">
              <h2>{t('hotel.services', 'Services')}</h2>
              {servicesLoading ? (
                <CardSkeleton count={2} variant="compact" message={t('hotel.loadingServices', 'Loading services...')} />
              ) : (
                <PropertyServicesList services={propertyServices} />
              )}
            </section>
          )}

          <PropertyGuestInfo hotel={hotel} />

          {(mapCoords || hotel.address) && (
            <section className="detail-section detail-section--location">
              <h2>{t('hotel.location', 'Location')}</h2>
              {mapCoords ? (
                <div className="detail-location-block">
                  <p className="detail-location-label">
                    <Icon name="map-pin" size={18} />
                    <span>
                      {[hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ') ||
                        `${hotel.city}, ${hotel.country}`}
                    </span>
                  </p>
                  <PropertyLocationMap
                    latitude={hotel.latitude}
                    longitude={hotel.longitude}
                    address={hotel.address}
                    city={hotel.city}
                    country={hotel.country}
                    label={propertyDisplayName}
                    height={320}
                    className="detail-location-map-full"
                  />
                </div>
              ) : (
                <p className="detail-location-label detail-location-label--solo">
                  <Icon name="map-pin" size={18} />
                  <span>
                    {[hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ') ||
                      `${hotel.city}, ${hotel.country}`}
                  </span>
                </p>
              )}
            </section>
          )}

          <PropertyReviewsSection propertyId={id} onSummaryChange={setReviewSummary} />
        </div>
      </div>
      {isMobileStickyVisible && (
        <div className="mobile-sticky-cta">
          <div className="mobile-sticky-cta-info">
            <span className="mobile-sticky-cta-price">
              {lowestPrice ? `$${lowestPrice.amount.toFixed(0)}` : t('hotel.selectDatesCta', 'Select dates')}
            </span>
            <span className="mobile-sticky-cta-label">
              {lowestPrice ? `/ ${t('hotel.perNight', 'per night')}` : t('hotel.toViewPrices', 'to view prices')}
            </span>
          </div>
          <button type="button" className="mobile-sticky-cta-btn" onClick={scrollToRooms}>
            {t('hotel.selectRoom', 'Select a room')}
          </button>
        </div>
      )}
      <RoomBookingModal
        open={Boolean(bookingRoom)}
        room={bookingRoom}
        hotelName={propertyDisplayName}
        search={localSearch}
        nights={nights}
        rate={bookingRoom ? stayRates?.byRoomId?.[bookingRoom.id] : null}
        availabilityUnit={bookingRoom ? stayAvailability?.byRoomId?.[bookingRoom.id] : null}
        badge={
          bookingRoom && stayAvailability?.byRoomId?.[bookingRoom.id]
            ? getAvailabilityBadge(
                stayAvailability.byRoomId[bookingRoom.id].availableUnits,
                stayAvailability.byRoomId[bookingRoom.id].isAvailable,
                {
                  totalUnits:
                    stayAvailability.byRoomId[bookingRoom.id].totalUnits ?? bookingRoom.totalUnits
                }
              )
            : null
        }
        confirming={Boolean(bookingRoom && reservingRoomId === bookingRoom.id)}
        error={bookingRoom ? reserveError : null}
        onClose={() => {
          if (!reservingRoomId) {
            setBookingRoom(null);
            setReserveError(null);
          }
        }}
        onConfirm={handleConfirmBooking}
      />
    </div>
  );
};

export default HotelDetailPage;
