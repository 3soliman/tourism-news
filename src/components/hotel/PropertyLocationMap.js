import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from '../icons/Icon';
import {
  MAP_TILES,
  formatAddressLabel,
  formatCoordsLabel,
  googleDirectionsUrl,
  googleMapsSearchUrl,
  openStreetMapUrl
} from '../../utils/geocoding';
import { resolvePropertyMapCoords as resolveCoords } from '../../utils/propertyMapCoords';
import { useTranslation } from '../../context/I18nContext';

const markerIcon = L.divIcon({
  className: 'hotel-map-marker-wrap',
  html: '<span class="hotel-map-marker-pin" aria-hidden="true"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const fix = () => map.invalidateSize({ animate: false });
    fix();
    const t1 = setTimeout(fix, 100);
    const t2 = setTimeout(fix, 450);
    window.addEventListener('resize', fix);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', fix);
    };
  }, [map]);

  return null;
}

function resolveMapHeight(baseHeight, compact) {
  if (typeof window === 'undefined') {
    return compact ? 200 : baseHeight;
  }
  const width = window.innerWidth;
  if (compact) {
    if (width <= 480) return 160;
    if (width <= 768) return 180;
    return 200;
  }
  if (width <= 480) return 190;
  if (width <= 768) return 220;
  return baseHeight;
}

function useResponsiveMapHeight(baseHeight, compact) {
  const [mapHeight, setMapHeight] = useState(() => resolveMapHeight(baseHeight, compact));

  useEffect(() => {
    const update = () => setMapHeight(resolveMapHeight(baseHeight, compact));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [baseHeight, compact]);

  return mapHeight;
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

const PropertyLocationMap = ({
  latitude,
  longitude,
  address = '',
  city = '',
  country = '',
  label,
  className = '',
  height = 360,
  compact = false
}) => {
  const { t } = useTranslation();
  const propertyLabel = label ?? t('hotel.property', 'Property');
  const coords = useMemo(() => resolveCoords(latitude, longitude), [latitude, longitude]);
  const [mapReady, setMapReady] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(null);
  const copyTimer = useRef(null);
  const mapHeight = useResponsiveMapHeight(height, compact);

  const addressLabel = useMemo(
    () => formatAddressLabel([address, city, country]) || propertyLabel,
    [address, city, country, propertyLabel]
  );
  const coordsLabel = useMemo(
    () => (coords ? formatCoordsLabel(coords.lat, coords.lng) : ''),
    [coords]
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setMapReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const showCopyFeedback = useCallback((message) => {
    setCopyFeedback(message);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyFeedback(null), 2200);
  }, []);

  const handleCopy = useCallback(
    async (text, successMessage) => {
      const ok = await copyText(text);
      showCopyFeedback(ok ? successMessage : t('hotel.couldNotCopy', 'Could not copy'));
    },
    [showCopyFeedback, t]
  );

  if (!coords) return null;

  const zoom = compact ? 14 : 15;
  const mapsUrl = googleMapsSearchUrl(coords.lat, coords.lng, addressLabel);
  const directionsUrl = googleDirectionsUrl(coords.lat, coords.lng, addressLabel);
  const osmUrl = openStreetMapUrl(coords.lat, coords.lng, zoom);

  return (
    <div className={`property-location-map ${compact ? 'property-location-map--compact' : ''} ${className}`.trim()}>
      {mapReady && (
        <div className="property-location-map__frame" style={{ height: mapHeight }}>
          <MapContainer
            center={[coords.lat, coords.lng]}
            zoom={zoom}
            scrollWheelZoom={!compact}
            className="property-location-map__leaflet"
          >
            <TileLayer
              attribution={MAP_TILES.attribution}
              url={MAP_TILES.url}
              subdomains={MAP_TILES.subdomains}
            />
            <Marker position={[coords.lat, coords.lng]} icon={markerIcon} />
            <MapResizeFix />
          </MapContainer>
        </div>
      )}
      {!mapReady && (
        <div className="property-location-map__frame property-location-map__loading" style={{ height: mapHeight }}>
          <span className="skeleton map-skeleton-fill" aria-label={t('hotel.loadingMap', 'Loading map')} />
        </div>
      )}

      <div className="property-location-map__footer">
        {coordsLabel && <span className="property-location-map__coords">{coordsLabel}</span>}
        {copyFeedback && <span className="property-location-map__copy-feedback">{copyFeedback}</span>}
      </div>

      <div className="property-location-map__actions">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="property-location-map__action property-location-map__action--primary"
        >
          <Icon name="navigation" size={16} />
          {t('hotel.getDirections', 'Get directions')}
        </a>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="property-location-map__action">
          <Icon name="external-link" size={16} />
          {t('hotel.googleMaps', 'Google Maps')}
        </a>
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="property-location-map__action property-location-map__action--muted"
        >
          <Icon name="external-link" size={16} />
          {t('hotel.openStreetMap', 'OpenStreetMap')}
        </a>
        {addressLabel && (
          <button
            type="button"
            className="property-location-map__action property-location-map__action--btn"
            onClick={() => handleCopy(addressLabel, t('hotel.addressCopied', 'Address copied'))}
          >
            <Icon name="copy" size={16} />
            {t('hotel.copyAddress', 'Copy address')}
          </button>
        )}
        <button
          type="button"
          className="property-location-map__action property-location-map__action--btn"
          onClick={() => handleCopy(coordsLabel, t('hotel.coordinatesCopied', 'Coordinates copied'))}
        >
          <Icon name="copy" size={16} />
          {t('hotel.copyCoords', 'Copy coords')}
        </button>
      </div>
    </div>
  );
};

export default PropertyLocationMap;
export { resolveCoords as resolvePropertyMapCoords };
