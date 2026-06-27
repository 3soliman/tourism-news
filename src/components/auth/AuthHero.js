import React from 'react';
import { BRAND } from '../../config/brand';
import { useTranslation } from '../../context/I18nContext';
import BrandLogo from '../shared/BrandLogo';
import Icon from '../icons/Icon';

const AuthHero = ({
  eyebrow = 'Curated Stays Worldwide',
  title = 'Curated Hotel Experiences',
  description = 'Manage bookings, properties, and guest experiences from a unified platform.',
  highlights,
  trustText = 'Trusted by hotel owners worldwide'
}) => {
  const { t } = useTranslation();
  const displayHighlights = highlights || [
    t('auth.realTimeReservations', 'Real-time reservations'),
    t('auth.propertyManagement', 'Property management'),
    t('auth.revenueInsights', 'Revenue insights'),
    t('auth.secureAccess', 'Secure access')
  ];

  return (
    <section className="auth-luxury-hero" aria-label={`${BRAND.name} ${t('auth.hospitalityPlatform', 'hospitality platform')}`}>
      <div className="auth-luxury-hero__content">
        <div className="auth-brand-lockup auth-brand-lockup--full">
          <BrandLogo variant="full" size="auth" priority />
        </div>

        <div className="auth-luxury-hero__copy">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>

        <ul className="auth-hero-highlights" aria-label={t('auth.platformHighlights', 'Platform highlights')}>
          {displayHighlights.map((item) => (
            <li key={item}>
              <Icon name="check" size={16} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="auth-hero-trust">
        <Icon name="shield" size={18} />
        <span>{trustText}</span>
      </div>
    </section>
  );
};

export default AuthHero;
