import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from '../../icons/Icon';
import {
  DEFAULT_MAP_CENTER,
  MAP_TILES,
  MIN_SEARCH_CHARS,
  formatAddressLabel,
  formatCoordsLabel,
  getCurrentPosition,
  getGeolocationEnvironment,
  parseCoord,
  reverseGeocode,
  searchPlaces
} from '../../../utils/geocoding';
import { useTranslation } from '../../../context/I18nContext';

const PICK_ZOOM = 16;

const markerIcon = L.divIcon({
  className: 'hotel-map-marker-wrap',
  html: '<span class="hotel-map-marker-pin" aria-hidden="true"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

function MapClickHandler({ disabled, onPick }) {
  useMapEvents({
    click(e) {
      if (!disabled) onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function MapResizeFix({ trigger }) {
  const map = useMap();

  useEffect(() => {
    const fix = () => map.invalidateSize({ animate: false });
    fix();
    const t1 = setTimeout(fix, 100);
    const t2 = setTimeout(fix, 450);
    window.addEventListener('resize', fix);

    const container = map.getContainer()?.closest('.hotel-map-container');
    let observer;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => fix());
      observer.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', fix);
      observer?.disconnect();
    };
  }, [map, trigger]);

  return null;
}

function MapViewSync({ lat, lng, zoom, active, useFly }) {
  const map = useMap();
  useEffect(() => {
    if (active && lat != null && lng != null) {
      if (useFly) {
        map.flyTo([lat, lng], zoom, { duration: 0.85 });
      } else {
        map.setView([lat, lng], zoom, { animate: true });
      }
    }
  }, [map, lat, lng, zoom, active, useFly]);
  return null;
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(input);
    return ok;
  }
}

const LocationMapPicker = ({ values, disabled, onLocationPick, fillLayout = false }) => {
  const { t } = useTranslation();
  const geoEnv = getGeolocationEnvironment();
  const lat = parseCoord(values.latitude);
  const lng = parseCoord(values.longitude);
  const hasMarker = lat != null && lng != null;
  const mapZoom = hasMarker ? PICK_ZOOM : DEFAULT_MAP_CENTER.zoom;

  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapNotice, setMapNotice] = useState(null);
  const [flyToMarker, setFlyToMarker] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);

  const searchTimer = useRef(null);
  const searchInputRef = useRef(null);
  const mapContainerRef = useRef(null);
  const copyTimer = useRef(null);

  const selectedLabel = formatAddressLabel([values.address, values.city, values.country]);
  const coordsLabel = formatCoordsLabel(values.latitude, values.longitude);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMapReady(true));
    return () => {
      cancelAnimationFrame(id);
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen]);

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const showCopyFeedback = (message) => {
    setCopyFeedback(message);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyFeedback(null), 2200);
  };

  const applyLocation = useCallback(
    async (pickLat, pickLng, prefill) => {
      setMapError(null);
      setMapNotice(null);
      setFlyToMarker(true);

      const coords = {
        latitude: Number(pickLat).toFixed(6),
        longitude: Number(pickLng).toFixed(6)
      };

      if (prefill) {
        onLocationPick({ ...prefill, ...coords });
        return;
      }

      onLocationPick(coords);

      setResolving(true);
      try {
        const data = await reverseGeocode(pickLat, pickLng);
        const { _geocodeWarning, ...fields } = data;
        onLocationPick({ ...fields, ...coords });
        if (_geocodeWarning) setMapNotice(_geocodeWarning);
      } catch {
        setMapNotice('Coordinates saved. Could not fetch full address — please fill city and country manually.');
      } finally {
        setResolving(false);
      }
    },
    [onLocationPick]
  );

  const handleMapPick = useCallback(
    (pickLat, pickLng) => applyLocation(pickLat, pickLng),
    [applyLocation]
  );

  const handleMarkerDrag = useCallback(
    (e) => {
      const { lat: mLat, lng: mLng } = e.target.getLatLng();
      applyLocation(mLat, mLng);
    },
    [applyLocation]
  );

  const runSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_SEARCH_CHARS) {
      setSuggestions([]);
      setSearchEmpty(false);
      return;
    }

    setSearching(true);
    setMapError(null);
    setSearchEmpty(false);
    setHighlightIdx(-1);

    try {
      const results = await searchPlaces(trimmed);
      setSuggestions(results);
      setSearchEmpty(results.length === 0);
    } catch {
      setSuggestions([]);
      setSearchEmpty(false);
      setMapError('Place search unavailable. Click directly on the map instead.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setSuggestions([]);
    setSearchEmpty(false);
    setHighlightIdx(-1);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (q.trim().length < MIN_SEARCH_CHARS) return;

    searchTimer.current = setTimeout(() => runSearch(q), 450);
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (q.length < MIN_SEARCH_CHARS || searching || resolving || locating) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    runSearch(q);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSearchEmpty(false);
    setHighlightIdx(-1);
    searchInputRef.current?.focus();
  };

  const selectSuggestion = (item) => {
    setSearchQuery(item.label);
    setSuggestions([]);
    setSearchEmpty(false);
    setHighlightIdx(-1);
    const { label: _label, subtitle: _subtitle, type: _type, ...fields } = item;
    applyLocation(Number(item.latitude), Number(item.longitude), fields);
  };

  const handleSearchKeyDown = (e) => {
    if (suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchSubmit();
      }
      if (e.key === 'Escape') clearSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((idx) => (idx + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((idx) => (idx <= 0 ? suggestions.length - 1 : idx - 1));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIdx]);
    } else if (e.key === 'Enter' && suggestions[0]) {
      e.preventDefault();
      selectSuggestion(suggestions[0]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSuggestions([]);
      setSearchEmpty(false);
      setHighlightIdx(-1);
    }
  };

  const resolveLocationError = (err) => {
    if (err?.reason === 'insecure') {
      return t(
        'pages.addHotel.locationInsecure',
        "We can't detect your current location from this page. Click on the map or search for an address instead."
      );
    }
    if (err?.reason === 'denied') {
      return t(
        'pages.addHotel.locationDenied',
        'Location access is turned off. Allow it in your browser settings, or click the map to pick a place manually.'
      );
    }
    if (err?.reason === 'timeout') {
      return t(
        'pages.addHotel.locationTimeout',
        'Finding your location took too long. Try again or pick a point on the map.'
      );
    }
    if (err?.reason === 'unsupported') {
      return t(
        'pages.addHotel.locationUnsupported',
        "Your browser doesn't support location detection. Click the map or search for an address."
      );
    }
    return t(
      'pages.addHotel.locationUnavailable',
      "We couldn't find your location. Try again, or click the map to choose a spot."
    );
  };

  const handleUseCurrentLocation = async () => {
    if (disabled || resolving || locating) return;

    if (!geoEnv.available) {
      setMapError(resolveLocationError({ reason: geoEnv.reason }));
      return;
    }

    setMapError(null);
    setMapNotice(null);
    setLocating(true);

    try {
      const { lat: currentLat, lng: currentLng } = await getCurrentPosition();
      await applyLocation(currentLat, currentLng);
    } catch (err) {
      setMapError(resolveLocationError(err));
    } finally {
      setLocating(false);
    }
  };

  const handleCopyCoords = async () => {
    if (!coordsLabel) return;
    const ok = await copyText(coordsLabel);
    showCopyFeedback(ok ? 'Coordinates copied' : 'Could not copy');
  };

  const handleCopyAddress = async () => {
    if (!selectedLabel) return;
    const ok = await copyText(selectedLabel);
    showCopyFeedback(ok ? 'Address copied' : 'Could not copy');
  };

  const statusText = locating
    ? 'Locating…'
    : resolving
      ? 'Resolving address…'
      : searching
        ? 'Searching…'
        : null;

  const sectionClass = [
    'hotel-location-map-section',
    fillLayout ? 'hotel-location-map-section--fill' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={sectionClass}>
      <div className="hotel-location-map-section__header">
      <div className="hotel-map-toolbar">
        <div className="hotel-map-toolbar-head">
          <label className="hotel-map-search-label" htmlFor="map-place-search">
            Search on map
          </label>
          <div className="hotel-map-toolbar-actions">
            <button
              type="button"
              className="hotel-map-locate-btn"
              onClick={handleUseCurrentLocation}
              disabled={disabled || resolving || locating}
              title={
                geoEnv.available
                  ? t('pages.addHotel.locationMyLocation', 'Go to my current location')
                  : t(
                      'pages.addHotel.locationInsecureHint',
                      'Not available here — use the map or search'
                    )
              }
            >
              <Icon name="locate" size={18} />
              <span>{locating ? t('pages.addHotel.locationLocating', 'Locating…') : t('pages.addHotel.locationMyLocation', 'My location')}</span>
            </button>
            <button
              type="button"
              className="hotel-map-icon-btn"
              onClick={() => setFullscreen((v) => !v)}
              disabled={!mapReady}
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
              aria-pressed={fullscreen}
            >
              <Icon name={fullscreen ? 'minimize' : 'maximize'} size={18} />
            </button>
          </div>
        </div>

        <div className="hotel-map-search-row">
          <Icon name="search" size={18} />
          <input
            ref={searchInputRef}
            id="map-place-search"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            disabled={disabled || resolving || locating}
            placeholder="City, street, landmark…"
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="map-place-suggestions"
            aria-autocomplete="list"
          />
          {searchQuery && !searching && (
            <button
              type="button"
              className="hotel-map-clear-btn"
              onClick={clearSearch}
              disabled={disabled}
              aria-label="Clear search"
            >
              <Icon name="x" size={16} />
            </button>
          )}
          <button
            type="button"
            className="hotel-map-search-btn"
            onClick={handleSearchSubmit}
            disabled={disabled || resolving || locating || searching || searchQuery.trim().length < MIN_SEARCH_CHARS}
          >
            <Icon name="search" size={15} />
            <span>Search</span>
          </button>
          {statusText && <span className="hotel-map-status">{statusText}</span>}
        </div>

        {suggestions.length > 0 && (
          <ul className="hotel-map-suggestions" id="map-place-suggestions" role="listbox">
            {suggestions.map((item, idx) => (
              <li key={`${item.latitude}-${item.longitude}-${item.label}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === highlightIdx}
                  className={idx === highlightIdx ? 'is-active' : ''}
                  onClick={() => selectSuggestion(item)}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  disabled={disabled}
                >
                  <span className="hotel-map-suggestion-label">{item.label}</span>
                  {item.subtitle && (
                    <span className="hotel-map-suggestion-sub">{item.subtitle}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {searchEmpty && !searching && (
          <p className="hotel-map-search-empty">No places found. Try a different search or click the map.</p>
        )}
      </div>

      {hasMarker && (
        <div className="hotel-map-selected">
          <div className="hotel-map-selected-main">
            <Icon name="map-pin" size={18} />
            <div className="hotel-map-selected-text">
              <strong>{selectedLabel || 'Location selected'}</strong>
              {coordsLabel && <span className="hotel-map-coords">{coordsLabel}</span>}
            </div>
          </div>
          <div className="hotel-map-selected-actions">
            {selectedLabel && (
              <button type="button" className="hotel-map-chip-btn" onClick={handleCopyAddress}>
                <Icon name="copy" size={14} />
                Copy address
              </button>
            )}
            {coordsLabel && (
              <button type="button" className="hotel-map-chip-btn" onClick={handleCopyCoords}>
                <Icon name="copy" size={14} />
                Copy coords
              </button>
            )}
          </div>
          {copyFeedback && <span className="hotel-map-copy-feedback">{copyFeedback}</span>}
        </div>
      )}

      <p className="hotel-step-hint">
        Search above, click the map, use <strong>My location</strong>, or drag the pin. Use arrow keys in
        search results, then Enter to select.
      </p>

      {mapNotice && <p className="hotel-map-notice">{mapNotice}</p>}
      {mapError && <p className="field-error hotel-map-error">{mapError}</p>}
      </div>

      <div
        ref={mapContainerRef}
        className={`hotel-location-map-section__canvas hotel-map-container ${disabled ? 'is-disabled' : ''} ${fullscreen ? 'is-fullscreen' : ''}`}
      >
        {mapReady ? (
          <MapContainer
            center={hasMarker ? [lat, lng] : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng]}
            zoom={mapZoom}
            scrollWheelZoom={!disabled}
            className="hotel-leaflet-map"
          >
            <TileLayer
              attribution={MAP_TILES.attribution}
              url={MAP_TILES.url}
              subdomains={MAP_TILES.subdomains}
            />
            <MapResizeFix trigger={fullscreen} />
            <MapViewSync
              lat={lat}
              lng={lng}
              zoom={PICK_ZOOM}
              active={flyToMarker && hasMarker}
              useFly
            />
            <MapClickHandler disabled={disabled} onPick={handleMapPick} />
            {hasMarker && (
              <Marker
                position={[lat, lng]}
                icon={markerIcon}
                draggable={!disabled}
                eventHandlers={{ dragend: handleMarkerDrag }}
              />
            )}
          </MapContainer>
        ) : (
          <div className="hotel-map-loading" aria-label="Loading map">
            <span className="skeleton map-skeleton-fill" />
          </div>
        )}

        {fullscreen && (
          <button
            type="button"
            className="hotel-map-fullscreen-close"
            onClick={() => setFullscreen(false)}
            aria-label="Exit fullscreen"
          >
            <Icon name="x" size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationMapPicker;
