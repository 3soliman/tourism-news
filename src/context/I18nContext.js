'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import arCommon from '../locales/ar/common.json';
import arGuest from '../locales/ar/guest.json';
import arAdmin from '../locales/ar/admin.json';
import arTrust from '../locales/ar/trust.json';

const I18nContext = createContext();

function deepMerge(target, ...sources) {
  const result = { ...target };
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const value = source[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

const arTranslations = deepMerge({}, arCommon, arGuest, arAdmin, { trust: arTrust });

let enTranslationsPromise = null;

async function loadEnTranslations() {
  if (!enTranslationsPromise) {
    enTranslationsPromise = Promise.all([
      import('../locales/en/common.json'),
      import('../locales/en/guest.json'),
      import('../locales/en/admin.json'),
      import('../locales/en/trust.json')
    ]).then(([enCommon, enGuest, enAdmin, enTrust]) =>
      deepMerge({}, enCommon.default, enGuest.default, enAdmin.default, { trust: enTrust.default })
    );
  }
  return enTranslationsPromise;
}

function interpolate(text, vars) {
  if (!text || !vars) return text;
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : `{{${key}}}`
  );
}

export const I18nProvider = ({ children }) => {
  const [locale, setLocale] = useState('ar');
  const [enTranslations, setEnTranslations] = useState(null);

  useEffect(() => {
    const storedLocale = localStorage.getItem('i18n_locale');
    if (['en', 'ar'].includes(storedLocale)) {
      setLocale(storedLocale);
    }
  }, []);

  useEffect(() => {
    if (locale !== 'en') return;
    let active = true;
    loadEnTranslations().then((dict) => {
      if (active) setEnTranslations(dict);
    });
    return () => {
      active = false;
    };
  }, [locale]);

  useEffect(() => {
    const isArabic = locale === 'ar';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.body.dir = isArabic ? 'rtl' : 'ltr';
    document.body.lang = isArabic ? 'ar' : 'en';
    document.body.classList.toggle('rtl-arabic', isArabic);
    document.body.classList.toggle('ltr-english', !isArabic);
  }, [locale]);

  const dictionary = useMemo(() => {
    if (locale === 'ar') return arTranslations;
    return enTranslations || arTranslations;
  }, [locale, enTranslations]);

  const t = useCallback(
    (key, defaultText, vars) => {
      const value = key.split('.').reduce((acc, part) => acc && acc[part], dictionary);
      const text =
        value && typeof value === 'object' && !Array.isArray(value)
          ? defaultText ?? key
          : value ?? defaultText ?? key;
      return vars ? interpolate(text, vars) : text;
    },
    [dictionary]
  );

  const changeLanguage = useCallback((newLocale) => {
    if (!['en', 'ar'].includes(newLocale)) return;
    setLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18n_locale', newLocale);
    }
  }, []);

  const value = useMemo(
    () => ({ locale, changeLanguage, t, isRTL: locale === 'ar' }),
    [locale, changeLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
