import React, { useEffect, useMemo, useState } from 'react';
import { getHotelDisplayImages, normalizeDisplayImages } from '../../utils/hotelImages';

export const IMAGE_ROTATE_MS = 2000;

/**
 * Home page only — first featured hotels. Cycles every 2s when multiple photos exist.
 * Single image stays static. Other pages use a fixed cover image for performance.
 */
const HotelImageRotator = ({
  hotel,
  images: imagesProp,
  className = '',
  intervalMs = IMAGE_ROTATE_MS,
  activeIndex: controlledIndex,
  onIndexChange,
  children
}) => {
  const images = useMemo(() => {
    if (imagesProp != null) return normalizeDisplayImages(imagesProp);
    return getHotelDisplayImages(hotel);
  }, [hotel, imagesProp]);

  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = controlledIndex != null;
  const activeIndex = isControlled ? controlledIndex : internalIndex;

  const imagesKey = images.join('|');

  useEffect(() => {
    if (!isControlled) setInternalIndex(0);
    else onIndexChange?.(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when image set changes
  }, [imagesKey, isControlled]);

  useEffect(() => {
    if (images.length <= 1) return undefined;

    const timer = setInterval(() => {
      const next = (activeIndex + 1) % images.length;
      if (isControlled) onIndexChange?.(next);
      else setInternalIndex(next);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images.length, intervalMs, isControlled, activeIndex, onIndexChange]);

  const hasImage = images.length > 0;

  return (
    <div
      className={`hotel-image-rotator ${hasImage ? '' : 'hotel-image-rotator--empty'} ${className}`.trim()}
      aria-hidden={!hasImage}
    >
      {hasImage ? (
        images.map((url, index) => (
          <img
            key={`${url}-${index}`}
            src={url}
            alt=""
            className={index === activeIndex ? 'is-active' : ''}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))
      ) : (
        <span className="hotel-image-rotator__placeholder" />
      )}
      {children}
    </div>
  );
};

export default HotelImageRotator;
