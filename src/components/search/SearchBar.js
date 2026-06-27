import React, { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { DESTINATIONS } from '../../data/searchOptions';
import { searchToQueryString } from '../../utils/searchUtils';
import { useBooking } from '../../context/BookingContext';
import GuestCounter from './GuestCounter';
import DateRangePicker from './DateRangePicker';
import { clampGuestField, GUEST_LIMITS } from '../../utils/guestLimits';
import Icon from '../icons/Icon';
import { useTranslation } from '../../context/I18nContext';

const SearchBar = ({ variant = 'hero', onSearch, destinations: destinationsProp, search: searchProp }) => {
  const { search: contextSearch, setSearch } = useBooking();
  const search = searchProp ?? contextSearch;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [local, setLocal] = useState(search);

  useEffect(() => {
    setLocal(search);
  }, [
    search.destination,
    search.checkIn,
    search.checkOut,
    search.adults,
    search.children,
    search.infants,
    search.rooms
  ]);

  const destinations =
    destinationsProp?.length > 0 ? destinationsProp : DESTINATIONS;

  const update = (field, value) => setLocal((prev) => ({ ...prev, [field]: value }));

  const updateGuest = (field, value) => update(field, clampGuestField(field, value));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (local.checkIn && local.checkOut && local.checkOut <= local.checkIn) {
      return;
    }
    const normalized = {
      ...local,
      adults: clampGuestField('adults', local.adults),
      children: clampGuestField('children', local.children),
      infants: clampGuestField('infants', local.infants ?? 0),
      rooms: clampGuestField('rooms', local.rooms)
    };
    setSearch(normalized);
    const qs = searchToQueryString(normalized);
    if (onSearch) onSearch(normalized);
    else navigate(`/search?${qs}`);
  };

  const today = new Date().toISOString().split('T')[0];

  const handleDatesChange = ({ checkIn, checkOut }) => {
    setLocal((prev) => ({ ...prev, checkIn, checkOut }));
  };

  return (
    <form className={`search-bar search-bar--${variant}`} onSubmit={handleSubmit}>
      <div className="search-bar-grid">
        <div className="search-bar-row search-bar-row--primary">
          <div className="search-field search-field--destination search-field--with-icon">
            <label htmlFor="destination">{t('search.destinationLabel', 'Where to?')}</label>
            <div className="search-field-input-wrapper">
              <input
                id="destination"
                list="destinations-list"
                type="text"
                placeholder={t('search.destinationPlaceholder', 'City or hotel name')}
                value={local.destination}
                onChange={(e) => update('destination', e.target.value)}
              />
              <Icon name="map-pin" className="search-field-icon" size={16} />
            </div>
            <datalist id="destinations-list">
              {destinations.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          <div className="search-field search-field--dates">
            <DateRangePicker
              checkIn={local.checkIn}
              checkOut={local.checkOut}
              onChange={handleDatesChange}
              minDate={today}
            />
          </div>

          <button type="submit" className="search-submit">
            {t('search.submit', 'Search')}
          </button>
        </div>

        <div className="search-bar-row search-bar-row--guests">
          <p className="search-guests-heading" id="guests-label">
            {t('search.guestsRooms', 'Guests & rooms')}
          </p>
          <div className="guest-counters" role="group" aria-labelledby="guests-label">
            <GuestCounter
              id="search-adults"
              label={t('search.adults', 'Adults')}
              value={local.adults}
              min={GUEST_LIMITS.adults.min}
              max={GUEST_LIMITS.adults.max}
              onChange={(v) => updateGuest('adults', v)}
            />
            <GuestCounter
              id="search-children"
              label={t('search.children', 'Children')}
              value={local.children}
              min={GUEST_LIMITS.children.min}
              max={GUEST_LIMITS.children.max}
              onChange={(v) => updateGuest('children', v)}
            />
            <GuestCounter
              id="search-infants"
              label={t('search.infants', 'Infants')}
              value={local.infants ?? 0}
              min={GUEST_LIMITS.infants.min}
              max={GUEST_LIMITS.infants.max}
              onChange={(v) => updateGuest('infants', v)}
            />
            <GuestCounter
              id="search-rooms"
              label={t('search.rooms', 'Rooms')}
              value={local.rooms}
              min={GUEST_LIMITS.rooms.min}
              max={GUEST_LIMITS.rooms.max}
              onChange={(v) => updateGuest('rooms', v)}
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;
