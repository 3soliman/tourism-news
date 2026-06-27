'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Link } from '@/lib/router-compat';
import { BRAND } from '../../config/brand';
import SearchBar from '../search/SearchBar';
import { searchToQueryString } from '../../utils/searchUtils';
import { useBooking } from '../../context/BookingContext';
import { useHotels } from '../../context/HotelsContext';
import { useTranslation } from '../../context/I18nContext';
import { getHotelAmenities } from '../../utils/mapHotel';
import { getAmenityDisplayName } from '../../utils/amenityDisplay';
import { getPropertyDisplayName } from '../../utils/propertyDisplay';
import { fetchFeaturedGuestReviews } from '../../api/reviewsApi';
import { ApiError, ApiLoading } from '../shared/ApiStatus';
import Icon from '../icons/Icon';
import StarRating from '../icons/StarRating';
import HotelImageRotator from '../hotel/HotelImageRotator';

/** Only the first N featured hotels rotate images (performance). Set to 0 for maximum speed. */
const HOME_ROTATING_HOTEL_COUNT = 0;

const HERO_SLIDES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=960&q=55&fm=webp', // Beach resort
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=960&q=55&fm=webp', // Maldives overwater
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=960&q=55&fm=webp'  // City boutique
];

const DESTINATION_IMAGES = {
  'Dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=360&q=50&fm=webp',
  'Paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=360&q=50&fm=webp',
  'London': 'https://images.unsplash.com/photo-1513635269975-59663e0ca1ad?auto=format&fit=crop&w=360&q=50&fm=webp',
  'New York': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=360&q=50&fm=webp',
  'Tokyo': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=360&q=50&fm=webp',
  'Barcelona': 'https://images.unsplash.com/photo-1583422409516-2895a77efedd?auto=format&fit=crop&w=360&q=50&fm=webp',
  'Rome': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=360&q=50&fm=webp',
  'Cairo': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=360&q=50&fm=webp',
  'Istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=360&q=50&fm=webp',
  'Bangkok': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=360&q=50&fm=webp'
};

const AMENITY_ICON_MAP = {
  wifi: 'globe',
  pool: 'check',
  spa: 'star',
  gym: 'users',
  restaurant: 'check',
  parking: 'check'
};

const HomePage = () => {
  const { t, isRTL, locale } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [guestReviews, setGuestReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const { search } = useBooking();
  const { hotels, loading, error, refresh, ensureLoaded, loaded, getFeaturedHotels, destinations } = useHotels();
  const featuredHotels = getFeaturedHotels(3);
  const hotelCount = hotels.length;

  const filterOptions = useMemo(() => [
    { id: 'all', label: t('home.filterAll'), icon: 'globe' },
    { id: 'luxury', label: t('home.filterLuxury'), icon: 'star' },
    { id: 'budget', label: t('home.filterBudget'), icon: 'wallet' },
    { id: 'city', label: t('home.filterCity'), icon: 'building-2' }
  ], [t]);

  useEffect(() => {
    if (!loaded) ensureLoaded();
  }, [loaded, ensureLoaded]);

  useEffect(() => {
    if (loading || !hotels.length) return undefined;

    let active = true;
    const loadReviews = () => {
      setReviewsLoading(true);
      fetchFeaturedGuestReviews(hotels, { limit: 5 })
        .then((list) => {
          if (!active) return;
          setGuestReviews(list);
          setActiveTestimonial(0);
        })
        .catch(() => active && setGuestReviews([]))
        .finally(() => active && setReviewsLoading(false));
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => active && loadReviews(), { timeout: 4000 });
      return () => {
        active = false;
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = window.setTimeout(loadReviews, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [hotels, loading]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (guestReviews.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % guestReviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [guestReviews.length]);

  const testimonialOffset = activeTestimonial * (isRTL ? 1 : -1);

  const filteredHotels =
    activeFilter === 'all' ? featuredHotels : featuredHotels.filter((h) => h.type === activeFilter);

  const qs = searchToQueryString(search);
  const cityCount = destinations.length;
  const popularCities = destinations.slice(0, 6);

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-slider-bg">
          {HERO_SLIDES.map((src, idx) => {
            const isActive = idx === heroSlide;
            const isNext = idx === (heroSlide + 1) % HERO_SLIDES.length;
            if (!isActive && !isNext) return null;
            return (
            <div
              key={src}
              className={`hero-slider-item ${isActive ? 'is-active' : ''}`}
            >
              <Image
                src={src}
                alt=""
                fill
                priority={idx === 0}
                sizes="100vw"
                className="hero-slider-image"
              />
            </div>
            );
          })}
        </div>
        <div className="hero-overlay" />
        
        <div className="hero-content">
          <h1>
            {loading ? (
              t('home.heroLoading')
            ) : (
              <>
                {t('home.heroTitle1')}
                <br />
                <span className="hero-accent">{t('home.heroTitle2')}</span>
              </>
            )}
          </h1>
          <p>
            {t('home.heroDesc', null, {
              tagline: BRAND.tagline,
              count: hotelCount || t('home.heroDescCurated'),
              destinations: cityCount || t('home.heroDescGlobal')
            })}
          </p>
          <SearchBar variant="hero" destinations={destinations} />
          <div className="hero-trust-row">
            <span><Icon name="check" size={14} /> {t('home.instantConfirmation')}</span>
            <span><Icon name="check" size={14} /> {t('home.bestRateSearch')}</span>
            <span><Icon name="check" size={14} /> {t('home.secureCheckout')}</span>
          </div>
        </div>
      </section>

      {error && <ApiError message={error} onRetry={refresh} />}
      {loading && !error && <ApiLoading variant="property" message={t('loading.featuredProperties')} />}

      {!loading && !error && (
        <>
          <section className="platform-stats">
            <div className="stat-item">
              <strong>{hotelCount}+</strong>
              <span>{t('home.hotelsListed')}</span>
            </div>
            <div className="stat-item">
              <strong>{cityCount}+</strong>
              <span>{t('home.destinations')}</span>
            </div>
            <div className="stat-item">
              <strong>24/7</strong>
              <span>{t('home.onlineBooking')}</span>
            </div>
            <div className="stat-item">
              <strong>Live</strong>
              <span>{t('home.realtimeApi')}</span>
            </div>
          </section>

          {popularCities.length > 0 && (
            <section className="destinations-section">
              <h2>{t('home.trendingDestinations')}</h2>
              <p className="section-subtitle">{t('home.trendingSubtitle')}</p>
              <div className="destinations-grid">
                {popularCities.map((city, index) => {
                  const image = DESTINATION_IMAGES[city] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=360&q=50&fm=webp';
                  return (
                    <Link
                      key={city}
                      to={`/search?${searchToQueryString({ ...search, destination: city })}`}
                      className="destination-card-visual"
                      style={{ animationDelay: `${index * 0.06}s` }}
                    >
                      <img
                        className="destination-card-visual__bg"
                        src={image}
                        alt={city}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="destination-card-visual__overlay" />
                      <div className="destination-card-visual__content">
                        <span className="destination-card-visual__badge">{t('home.exploreStays')}</span>
                        <h3 className="destination-card-visual__title">{city}</h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section className="featured-hotels-section">
            <div className="section-header-row">
              <div className="section-header-info">
                <h2>{t('home.editorsPicks')}</h2>
                <p className="section-subtitle">{t('home.editorsSubtitle')}</p>
              </div>
              <div className="filter-buttons">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`filter-button-pill ${activeFilter === option.id ? 'active' : ''}`}
                    onClick={() => setActiveFilter(option.id)}
                  >
                    <Icon name={option.icon} size={15} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredHotels.length === 0 ? (
              <p className="section-subtitle">{t('home.noHotels')}</p>
            ) : (
              <div className="hotels-grid">
                {filteredHotels.map((hotel, index) => (
                  <article key={hotel.id} className="hotel-card" style={{ position: 'relative' }}>
                    {hotel.stars >= 5 && (
                      <div className="hotel-card-badge">{t('home.luxuryBadge')}</div>
                    )}
                    {index < HOME_ROTATING_HOTEL_COUNT ? (
                      <HotelImageRotator hotel={hotel} className="hotel-image">
                        <StarRating value={hotel.stars} size={14} className="hotel-rating" />
                      </HotelImageRotator>
                    ) : (
                      <div className="hotel-image">
                        {hotel.image ? (
                          <img
                            src={hotel.image}
                            alt={getPropertyDisplayName(hotel, locale)}
                            loading="lazy"
                            decoding="async"
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="hotel-card-img"
                          />
                        ) : (
                          <div className="hotel-image-placeholder" style={{ backgroundColor: '#e7e5e4', height: '100%', width: '100%' }} />
                        )}
                        <StarRating value={hotel.stars} size={14} className="hotel-rating" />
                      </div>
                    )}
                    <div className="hotel-info">
                      <h3>{getPropertyDisplayName(hotel, locale)}</h3>
                      <p className="hotel-location">
                        <span className="link-with-icon">
                          <Icon name="map-pin" size={14} />
                          <span>{hotel.city}, {hotel.country}</span>
                        </span>
                      </p>

                      {getHotelAmenities(hotel).length > 0 && (
                        <div className="hotel-card-amenities">
                          {getHotelAmenities(hotel).slice(0, 3).map((item) => {
                            const label = getAmenityDisplayName(item, locale);
                            const iconName = AMENITY_ICON_MAP[item.id] || 'check';
                            return (
                              <span key={item.id} className="hotel-card-amenity-tag" title={label}>
                                <Icon name={iconName} size={11} />
                                <span>{label}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="hotel-price">
                        {hotel.priceFrom != null ? (
                          <>
                            <span className="price-amount">${hotel.priceFrom}</span>
                            <span className="price-label">{t('home.perNight')}</span>
                          </>
                        ) : (
                          <span className="price-label">{t('home.priceOnRequest')}</span>
                        )}
                      </div>
                      <Link to={`/hotel/${hotel.id}?${qs}`} className="book-button">
                        {t('home.viewHotel')}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="see-all-wrap">
              <Link to="/search" className="cta-button">
                {t('home.exploreAll', null, { count: hotelCount })}
              </Link>
            </div>
          </section>

          {(reviewsLoading || guestReviews.length > 0) && (
          <section className="testimonials-section">
            <h2>{t('home.testimonialsTitle')}</h2>
            <p className="section-subtitle">{t('home.testimonialsSubtitle')}</p>

            {reviewsLoading ? (
              <ApiLoading variant="room" message={t('home.loadingReviews')} />
            ) : (
            <div className="testimonials-slider-container">
              <button
                type="button"
                className="testimonials-arrow testimonials-arrow--prev"
                onClick={() => setActiveTestimonial((prev) => (prev - 1 + guestReviews.length) % guestReviews.length)}
                aria-label={t('home.prevTestimonial')}
                disabled={guestReviews.length <= 1}
              >
                <Icon name="arrow-left" size={18} />
              </button>

              <div className="testimonials-slider-viewport">
                <div
                  className="testimonials-slider-track"
                  style={{ transform: `translateX(${testimonialOffset * 100}%)` }}
                >
                  {guestReviews.map((item) => (
                    <div key={item.id} className="testimonial-slide-wrapper">
                      <div className="testimonial-card-premium">
                        <div className="testimonial-rating">
                          <StarRating value={item.rating} size={16} />
                        </div>
                        {item.title ? <h3 className="testimonial-review-title">{item.title}</h3> : null}
                        <p className="testimonial-text">&ldquo;{item.comment}&rdquo;</p>
                        <div className="testimonial-author-info">
                          <div className="testimonial-avatar">{item.initials}</div>
                          <div className="testimonial-author-meta">
                            <span className="testimonial-author-name">{item.guestName}</span>
                            <span className="testimonial-author-title">
                              {item.propertyName ? (
                                <Link to={`/hotel/${item.propertyId}`} className="testimonial-property-link">
                                  {t('home.reviewAt', null, {
                                    property: getPropertyDisplayName(
                                      { name: item.propertyName, nameAr: item.propertyNameAr },
                                      locale
                                    )
                                  })}
                                </Link>
                              ) : null}
                              <span className="testimonial-verified-badge">
                                <Icon name="check" size={10} /> {t('home.verifiedGuest')}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="testimonials-arrow testimonials-arrow--next"
                onClick={() => setActiveTestimonial((prev) => (prev + 1) % guestReviews.length)}
                aria-label={t('home.nextTestimonial')}
                disabled={guestReviews.length <= 1}
              >
                <Icon name="arrow-right" size={18} />
              </button>

              <div className="testimonials-dots">
                {guestReviews.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`testimonials-dot ${i === activeTestimonial ? 'is-active' : ''}`}
                    onClick={() => setActiveTestimonial(i)}
                    aria-label={t('home.goToSlide', null, { n: i + 1 })}
                  />
                ))}
              </div>
            </div>
            )}
          </section>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;
