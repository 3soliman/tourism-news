'use client';

import React, { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { useTranslation } from '../../context/I18nContext';
import { acceptCookieConsent, hasCookieConsent } from '../../utils/cookieConsent';

const CookieConsent = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasCookieConsent());
  }, []);

  const handleAccept = () => {
    acceptCookieConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="cookie-consent"
      role="dialog"
      aria-live="polite"
      aria-label={t('trust.cookieConsent.ariaLabel')}
    >
      <div className="cookie-consent__inner">
        <p className="cookie-consent__message">{t('trust.cookieConsent.message')}</p>
        <div className="cookie-consent__actions">
          <Link to="/cookies" className="cookie-consent__link">
            {t('trust.cookieConsent.learnMore')}
          </Link>
          <button type="button" className="cookie-consent__accept" onClick={handleAccept}>
            {t('trust.cookieConsent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
