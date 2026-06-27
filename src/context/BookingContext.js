'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { defaultSearch } from '../utils/searchUtils';
import { clearAuthTokens, logoutApi, hasStoredAuth, fetchCurrentUser, updateCurrentUser, mapApiUser } from '../api/authApi';
import { submitBookingInquiry, fetchBookings, cancelBookingById, mergeBookingWithCheckoutData } from '../api/bookingsApi';
import { checkRoomAvailabilityForStay } from '../api/availabilityBlocksApi';
import { usePublicHotel } from './PublicHotelContext';

const STORAGE_KEY = 'almohit_bookings';
const USER_KEY = 'almohit_user';

const BookingContext = createContext(null);

export const BookingProvider = ({ children }) => {
  const publicContext = usePublicHotel();
  const [search, setSearch] = useState(defaultSearch);
  const [cart, setCart] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(USER_KEY);
      if (cached) setUser(JSON.parse(cached));
    } catch {
      // ignore invalid cached user
    }
  }, []);

  const persistBookings = useCallback((list) => {
    setBookings(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setBookings(JSON.parse(saved));
    } catch (e) {
      console.warn('Could not load saved data', e);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!hasStoredAuth()) {
      setUser(null);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    try {
      const u = await fetchCurrentUser();
      setUser(u);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      return u;
    } catch (e) {
      if (e.status === 401) {
        setUser(null);
        localStorage.removeItem(USER_KEY);
        clearAuthTokens();
      }
      throw e;
    }
  }, []);

  useEffect(() => {
    if (!hasStoredAuth()) return undefined;

    const run = () => {
      refreshUser().catch((e) => console.warn('Could not load profile', e));
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = window.setTimeout(run, 200);
    return () => window.clearTimeout(timer);
  }, [refreshUser]);

  const refreshBookings = useCallback(async () => {
    if (!hasStoredAuth()) return;
    setBookingsLoading(true);
    try {
      const list = await fetchBookings();
      persistBookings(list);
    } catch (e) {
      console.warn('Could not load bookings from API', e);
    } finally {
      setBookingsLoading(false);
    }
  }, [persistBookings]);

  const addBooking = useCallback(
    async (bookingData) => {
      const cart = bookingData.cart || bookingData;
      const requestedHotelId = cart.hotelId || bookingData.hotelId;
      if (publicContext.isHotelSite && String(requestedHotelId) !== String(publicContext.hotel?.id)) {
        throw new Error('This booking does not belong to the current hotel website.');
      }
      const availability = await checkRoomAvailabilityForStay({
        propertyId: requestedHotelId,
        roomTypeId: cart.roomId || bookingData.roomId,
        checkIn: cart.checkIn || bookingData.checkIn,
        checkOut: cart.checkOut || bookingData.checkOut,
        totalUnits: cart.totalUnits ?? bookingData.totalUnits ?? 1,
        adults: cart.adults ?? bookingData.adults,
        children: cart.children ?? bookingData.children ?? 0,
        knownBookings: bookings,
        isStaff: user?.is_staff === true
      });

      if (!availability.available) {
        const err = new Error(
          availability.message || 'This room is not available for the selected dates.'
        );
        throw err;
      }

      const apiBooking = await submitBookingInquiry(bookingData);
      const entry = mergeBookingWithCheckoutData(bookingData, apiBooking);
      persistBookings([entry, ...bookings]);
      setCart(null);
      return entry;
    },
    [bookings, persistBookings, user, publicContext.isHotelSite, publicContext.hotel]
  );

  const cancelBooking = useCallback(
    async (id) => {
      if (hasStoredAuth()) {
        try {
          const updated = await cancelBookingById(id);
          persistBookings(
            bookings.map((b) => (b.id === id ? mergeBookingWithCheckoutData(b, updated) : b))
          );
          return;
        } catch (e) {
          console.warn('Could not cancel booking via API', e);
          throw e;
        }
      }

      persistBookings(
        bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
      );
    },
    [bookings, persistBookings]
  );

  const login = useCallback((userData, legacyName) => {
    let u;
    if (typeof userData === 'string') {
      u = mapApiUser({ email: userData, full_name: legacyName || '' }, { email: userData });
    } else {
      u = mapApiUser(userData);
    }
    if (!u) return;
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const u = await updateCurrentUser(payload);
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (e) {
      console.warn('Logout API failed', e);
    }
    setUser(null);
    localStorage.removeItem(USER_KEY);
    clearAuthTokens();
  }, []);

  const visibleBookings = publicContext.isHotelSite && publicContext.hotel
    ? bookings.filter((booking) => String(booking.hotelId || booking.propertyId) === String(publicContext.hotel.id))
    : bookings;

  const value = useMemo(
    () => ({
      search,
      setSearch,
      cart,
      setCart,
      bookings: visibleBookings,
      bookingsLoading,
      refreshBookings,
      addBooking,
      cancelBooking,
      user,
      login,
      logout,
      refreshUser,
      updateProfile
    }),
    [
      search,
      cart,
      visibleBookings,
      bookingsLoading,
      refreshBookings,
      addBooking,
      cancelBooking,
      user,
      login,
      logout,
      refreshUser,
      updateProfile
    ]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};
