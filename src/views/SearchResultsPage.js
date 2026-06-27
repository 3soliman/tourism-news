'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { useBooking } from '../context/BookingContext';
import { useHotels } from '../context/HotelsContext';
import { useTranslation } from '../context/I18nContext';
import { getPropertyDisplayName } from '../utils/propertyDisplay';
import { parseSearchFromParams, filterHotels, sortHotels } from '../utils/searchUtils';
import SearchBar from '../components/search/SearchBar';
import FiltersPanel from '../components/search/FiltersPanel';
import HotelResultCard from '../components/search/HotelResultCard';
import { ApiError } from '../components/shared/ApiStatus';
import { Link } from '@/lib/router-compat';
import Icon from '../components/icons/Icon';

const defaultFilters = {
  stars: [],
  minPrice: null,
  maxPrice: null,
  amenities: [],
  breakfast: [],
  types: []
};

const SearchResultsSkeleton = ({ loadingLabel }) => (
  <div className="src-layout src-layout--loading" aria-label={loadingLabel} aria-busy="true">
    <aside className="src-filter-skeleton" aria-hidden="true">
      <span className="src-shimmer src-shimmer--title" />
      <span className="src-shimmer" /><span className="src-shimmer" /><span className="src-shimmer src-shimmer--short" />
    </aside>
    <div className="src-list">
      {[0, 1, 2].map((item) => (
        <article className="src-card src-card--skeleton" key={item} aria-hidden="true">
          <div className="src-shimmer src-card-skeleton-image" />
          <div className="src-card-skeleton-body">
            <span className="src-shimmer src-shimmer--title" />
            <span className="src-shimmer src-shimmer--short" />
            <span className="src-shimmer" />
            <div className="src-card-skeleton-footer">
              <span className="src-shimmer src-shimmer--price" />
              <span className="src-shimmer src-shimmer--button" />
            </div>
          </div>
        </article>
      ))}
    </div>
  </div>
);

const DiscoveryRail = ({ title, eyebrow, hotels, viewAllLabel, fromLabel, viewRatesLabel, isRTL, locale }) => {
  if (!hotels.length) return null;
  return (
    <section className="search-discovery-section">
      <div className="search-section-heading">
        <div><span>{eyebrow}</span><h2>{title}</h2></div>
        <Link to="/search">{viewAllLabel} <Icon name={isRTL ? 'arrow-left' : 'arrow-right'} size={15} /></Link>
      </div>
      <div className="search-discovery-grid">
        {hotels.map((hotel) => (
          <Link key={hotel.id} to={`/hotel/${hotel.id}`} className="search-discovery-card">
            <div className="search-discovery-image">{hotel.image && <img src={hotel.image} alt="" loading="lazy" />}</div>
            <div><strong>{getPropertyDisplayName(hotel, locale)}</strong><span>{[hotel.city, hotel.country].filter(Boolean).join(', ')}</span></div>
            <div className="search-discovery-meta">
              <b>{hotel.rating != null ? Number(hotel.rating).toFixed(1) : `${hotel.stars}.0`}</b>
              <span>{hotel.priceFrom != null ? <>{fromLabel} <strong>${hotel.priceFrom}</strong></> : viewRatesLabel}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const SearchResultsPage = () => {
  const { t, isRTL, locale } = useTranslation();
  const [params] = useSearchParams();
  const { search, setSearch } = useBooking();
  const { hotels, loading, error, refresh, ensureLoaded, loaded, destinations } = useHotels();
  const [sortBy, setSortBy] = useState('popularity');
  const [filters, setFilters] = useState(defaultFilters);

  const paramsString = params.toString();

  useEffect(() => {
    const parsed = parseSearchFromParams(new URLSearchParams(paramsString));
    const changed = Object.keys(parsed).some((key) => parsed[key] !== search[key]);
    if (changed) {
      setSearch(parsed);
    }
  }, [paramsString, search, setSearch]);

  useEffect(() => {
    if (!loaded) ensureLoaded();
  }, [loaded, ensureLoaded]);

  const results = useMemo(() => {
    const filtered = filterHotels(hotels, search, filters);
    return sortHotels(filtered, sortBy);
  }, [hotels, search, filters, sortBy]);

  const discovery = useMemo(() => {
    const byRating = [...hotels].sort((a, b) => (Number(b.rating) || b.stars) - (Number(a.rating) || a.stars));
    const byPopularity = [...hotels].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    const recommended = [...hotels].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || b.stars - a.stars);
    const destinationsList = Object.values(hotels.reduce((acc, hotel) => {
      const name = hotel.city || hotel.country;
      if (!name) return acc;
      acc[name] = acc[name] || { name, count: 0, image: hotel.image };
      acc[name].count += 1;
      if (!acc[name].image && hotel.image) acc[name].image = hotel.image;
      return acc;
    }, {})).sort((a, b) => b.count - a.count).slice(0, 6);
    return { featured: byPopularity.slice(0, 4), topRated: byRating.slice(0, 4), recommended: recommended.slice(0, 4), destinations: destinationsList };
  }, [hotels]);

  const resultsHeading = search.destination
    ? `${results.length === 1 ? t('searchResults.resultsCountOne') : t('searchResults.resultsCount', null, { count: results.length })} ${t('searchResults.forDestination', null, { destination: search.destination })}`
    : (results.length === 1 ? t('searchResults.resultsCountOne') : t('searchResults.resultsCount', null, { count: results.length }));

  return (
    <div className="search-results-page">
      <section className="search-results-hero">
        <div className="search-results-hero-copy">
          <span className="search-results-eyebrow">{t('searchResults.eyebrow')}</span>
          <h1>{t('searchResults.title')}</h1>
          <p>{t('searchResults.subtitle')}</p>
        </div>
        <SearchBar variant="compact" destinations={destinations} />
        <div className="search-trust-strip" aria-label={t('searchResults.secureBooking')}>
          <span><Icon name="shield" size={16} /> {t('searchResults.secureBooking')}</span>
          <span><Icon name="check" size={16} /> {t('hotel.freeCancellation')}</span>
          <span><Icon name="star" size={16} /> {t('searchResults.topRated')}</span>
        </div>
      </section>

      {error && <ApiError message={error} onRetry={refresh} />}
      {loading && !error && <SearchResultsSkeleton loadingLabel={t('searchResults.loadingStays')} />}

      {!loading && !error && (
        <>
        <div className="src-summary">
          <div>
            <span className="src-summary-kicker">{t('nav.explore')}</span>
            <h2>{resultsHeading}</h2>
          </div>
          <div className="src-sort">
            <label htmlFor="result-sort">{t('searchResults.sortBy')}</label>
            <select id="result-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popularity">{t('searchResults.sortPopularity')}</option>
              <option value="price-asc">{t('searchResults.sortPriceLow')}</option>
              <option value="price-desc">{t('searchResults.sortPriceHigh')}</option>
              <option value="rating">{t('searchResults.sortRating')}</option>
              <option value="stars">{t('searchResults.sortStars')}</option>
            </select>
          </div>
        </div>

        <details className="src-mobile-filters">
          <summary><Icon name="settings" size={17} /> {t('filters.title')}</summary>
          <FiltersPanel filters={filters} onChange={setFilters} />
        </details>

        <div className="src-layout">
          <div className="src-desktop-filters"><FiltersPanel filters={filters} onChange={setFilters} /></div>

          <div className="src-main">
            {results.length === 0 ? (
              <div className="no-results">
                <h3>{t('searchResults.noMatch')}</h3>
                <p>{t('searchResults.noMatchHint')}</p>
              </div>
            ) : (
              <div className="src-list">
                {results.map((hotel) => (
                  <HotelResultCard key={hotel.id} hotel={hotel} search={search} />
                ))}
              </div>
            )}
          </div>
        </div>

        {hotels.length > 0 && (
          <div className="search-discovery">
            <DiscoveryRail
              title={t('searchResults.featuredStays')}
              eyebrow={t('searchResults.handpicked')}
              hotels={discovery.featured}
              viewAllLabel={t('searchResults.viewAll')}
              fromLabel={t('searchResults.from')}
              viewRatesLabel={t('searchResults.viewRates')}
              isRTL={isRTL}
              locale={locale}
            />
            <DiscoveryRail
              title={t('searchResults.recommended')}
              eyebrow={t('searchResults.editorial')}
              hotels={discovery.recommended}
              viewAllLabel={t('searchResults.viewAll')}
              fromLabel={t('searchResults.from')}
              viewRatesLabel={t('searchResults.viewRates')}
              isRTL={isRTL}
              locale={locale}
            />
            <DiscoveryRail
              title={t('searchResults.topRated')}
              eyebrow={t('hotelCard.exceptional')}
              hotels={discovery.topRated}
              viewAllLabel={t('searchResults.viewAll')}
              fromLabel={t('searchResults.from')}
              viewRatesLabel={t('searchResults.viewRates')}
              isRTL={isRTL}
              locale={locale}
            />
            {discovery.destinations.length > 0 && (
              <section className="search-discovery-section">
                <div className="search-section-heading">
                  <div><span>{t('home.trendingDestinations')}</span><h2>{t('searchResults.popularDestinations')}</h2></div>
                </div>
                <div className="destination-tiles">
                  {discovery.destinations.map((destination) => (
                    <Link key={destination.name} to={`/search?destination=${encodeURIComponent(destination.name)}`} className="destination-tile">
                      {destination.image && <img src={destination.image} alt="" loading="lazy" />}
                      <span>
                        <strong>{destination.name}</strong>
                        <small>
                          {destination.count === 1
                            ? t('searchResults.resultsCountOne')
                            : t('searchResults.resultsCount', null, { count: destination.count })}
                        </small>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default SearchResultsPage;
