'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { fetchProperties, fetchPropertyById } from '../api/propertiesApi';
import { getDestinationsFromHotels } from '../utils/mapHotel';
import { usePublicHotel } from './PublicHotelContext';

const HotelsContext = createContext(null);

export const HotelsProvider = ({ children, initialHotels = null }) => {
  const publicContext = usePublicHotel();
  const hasInitialHotels = Array.isArray(initialHotels) && initialHotels.length > 0;
  const [hotels, setHotels] = useState(() => (hasInitialHotels ? initialHotels : []));
  const [loading, setLoading] = useState(!hasInitialHotels);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(hasInitialHotels);
  const hotelsRef = useRef(hotels);

  useEffect(() => {
    hotelsRef.current = hotels;
  }, [hotels]);

  useEffect(() => {
    if (!hasInitialHotels) return;
    setHotels(initialHotels);
    setLoaded(true);
    setLoading(false);
    setError(null);
  }, [hasInitialHotels, initialHotels]);

  const loadHotels = useCallback(async ({ force = false } = {}) => {
    if (loaded && !force) return;
    if (publicContext.isHotelSite && publicContext.hotel) {
      const scoped = [publicContext.hotel];
      setHotels(scoped);
      setLoaded(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProperties();
      setHotels(list);
      setLoaded(true);
    } catch (e) {
      setError(e.message || 'Failed to load properties');
      setHotels([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [loaded, publicContext.isHotelSite, publicContext.hotel]);

  const getHotelById = useCallback(
    (id) => hotels.find((h) => h.id === String(id)),
    [hotels]
  );

  const getFeaturedHotels = useCallback(
    (limit = 6) => [...hotels].sort((a, b) => b.stars - a.stars || b.popularity - a.popularity).slice(0, limit),
    [hotels]
  );

  const loadHotelById = useCallback(
    async (id, { force = false } = {}) => {
      if (publicContext.isHotelSite && publicContext.hotel && String(id) !== String(publicContext.hotel.id)) {
        throw new Error('This property is not available on this hotel site.');
      }
      if (!force) {
        const cached = hotelsRef.current.find((h) => h.id === String(id));
        if (cached) return cached;
      }
      if (publicContext.hotel && String(publicContext.hotel.id) === String(id)) {
        return publicContext.hotel;
      }
      try {
        const hotel = await fetchPropertyById(id);
        setHotels((prev) => {
          const exists = prev.some((h) => h.id === hotel.id);
          return exists ? prev.map((h) => (h.id === hotel.id ? hotel : h)) : [...prev, hotel];
        });
        return hotel;
      } catch (err) {
        const cached = hotelsRef.current.find((h) => h.id === String(id));
        if (cached) return cached;
        throw err;
      }
    },
    [publicContext.isHotelSite, publicContext.hotel]
  );

  const seedHotel = useCallback((hotel) => {
    if (!hotel?.id) return;
    setHotels((prev) => {
      const exists = prev.some((h) => h.id === hotel.id);
      return exists ? prev.map((h) => (h.id === hotel.id ? hotel : h)) : [...prev, hotel];
    });
    setLoaded(true);
    setLoading(false);
  }, []);

  const destinations = useMemo(() => getDestinationsFromHotels(hotels), [hotels]);

  const refresh = useCallback(() => loadHotels({ force: true }), [loadHotels]);

  const value = useMemo(
    () => ({
      hotels,
      loading,
      error,
      destinations,
      loaded,
      refresh,
      ensureLoaded: loadHotels,
      getHotelById,
      getFeaturedHotels,
      loadHotelById,
      seedHotel
    }),
    [
      hotels,
      loading,
      error,
      destinations,
      loaded,
      refresh,
      loadHotels,
      getHotelById,
      getFeaturedHotels,
      loadHotelById,
      seedHotel
    ]
  );

  return <HotelsContext.Provider value={value}>{children}</HotelsContext.Provider>;
};

export const useHotels = () => {
  const ctx = useContext(HotelsContext);
  if (!ctx) throw new Error('useHotels must be used within HotelsProvider');
  return ctx;
};
