'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPublicHotelContext } from '../api/propertiesApi';
import { getPublicHostContext } from '../utils/publicHost';
import { useTranslation } from './I18nContext';
import LoadingExperience from '../components/shared/LoadingExperience';
import BrandLogo from '../components/shared/BrandLogo';

const PublicHotelContext = createContext(null);

const InvalidHotelPage = ({ status }) => {
  const { t } = useTranslation();
  const isUnavailable = status === 'unavailable';

  return (
    <main className="invalid-hotel-page">
      <div className="invalid-hotel-card">
        <div className="invalid-hotel-brand">
          <BrandLogo variant="full" size="md" />
        </div>
        <h1>{isUnavailable ? t('errors.hotelUnavailable') : t('errors.unknownHotel')}</h1>
        <p>{isUnavailable ? t('errors.hotelUnavailableDesc') : t('errors.unknownHotelDesc')}</p>
      </div>
    </main>
  );
};

export const PublicHotelProvider = ({ children }) => {
  const host = useMemo(() => getPublicHostContext(), []);
  const [state, setState] = useState({ loading: host.type === 'hotel', status: 'bypass', hotel: null, branding: null });

  useEffect(() => {
    if (host.type !== 'hotel') return;
    let active = true;
    fetchPublicHotelContext()
      .then((data) => active && setState({ loading: false, ...data }))
      .catch((error) => active && setState({ loading: false, status: error.data?.status || 'invalid', hotel: null, branding: null }));
    return () => { active = false; };
  }, [host]);

  const value = useMemo(() => ({ ...state, host, isHotelSite: host.type === 'hotel' }), [state, host]);
  if (state.loading) return <LoadingExperience />;
  if (host.type === 'hotel' && state.status !== 'available') return <InvalidHotelPage status={state.status} />;
  return <PublicHotelContext.Provider value={value}>{children}</PublicHotelContext.Provider>;
};

export const usePublicHotel = () => useContext(PublicHotelContext) || {
  loading: false, status: 'bypass', hotel: null, branding: null, host: { type: 'local', subdomain: null }, isHotelSite: false
};
