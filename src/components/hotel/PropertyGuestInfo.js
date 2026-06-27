'use client';

import React, { useMemo } from 'react';
import Icon from '../icons/Icon';
import { useTranslation } from '../../context/I18nContext';
import {
  getPropertyPolicyCards,
  getPropertySocialLinks,
  mapPropertyContacts
} from '../../utils/propertyDetails';

function InfoTile({ icon, label, children, href, external = false }) {
  const content = (
    <>
      <span className="property-info-tile__icon" aria-hidden="true">
        <Icon name={icon} size={18} />
      </span>
      <span className="property-info-tile__body">
        <span className="property-info-tile__label">{label}</span>
        <span className="property-info-tile__value">{children}</span>
      </span>
      {external && (
        <span className="property-info-tile__external" aria-hidden="true">
          <Icon name="external-link" size={14} />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a
        className="property-info-tile property-info-tile--link"
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return <div className="property-info-tile">{content}</div>;
}

function formatExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const PropertyGuestInfo = ({ hotel }) => {
  const { t, locale } = useTranslation();

  const contacts = useMemo(() => mapPropertyContacts(hotel?.contacts), [hotel?.contacts]);
  const socialLinks = useMemo(() => getPropertySocialLinks(hotel?.socialMedia), [hotel?.socialMedia]);
  const policyCards = useMemo(
    () => getPropertyPolicyCards(hotel?.policy, { locale, t }),
    [hotel?.policy, locale, t]
  );

  const hasDirectContact = Boolean(hotel?.phone || hotel?.email || hotel?.website);
  const hasContactSection = hasDirectContact || contacts;
  const hasAnySection = hasContactSection || socialLinks.length > 0 || policyCards.length > 0;

  if (!hasAnySection) return null;

  return (
    <section className="detail-section detail-section--property-info" aria-label={t('hotel.propertyInfo', 'Property information')}>
      <h2>{t('hotel.propertyInfo', 'Property information')}</h2>
      <p className="detail-section-lead">
        {t('hotel.propertyInfoLead', 'Contact details, social channels, and house rules for your stay')}
      </p>

      <div className="property-info-layout">
        {hasContactSection && (
          <article className="property-info-card property-info-card--wide">
            <header className="property-info-card__head">
              <Icon name="phone" size={20} />
              <h3>{t('hotel.contactDetails', 'Contact details')}</h3>
            </header>
            <div className="property-info-card__grid property-info-card__grid--contact">
              {hotel.phone && (
                <InfoTile icon="phone" label={t('hotel.phone', 'Phone')} href={`tel:${hotel.phone}`}>
                  {hotel.phone}
                </InfoTile>
              )}
              {hotel.email && (
                <InfoTile icon="mail" label={t('hotel.email', 'Email')} href={`mailto:${hotel.email}`}>
                  {hotel.email}
                </InfoTile>
              )}
              {hotel.website && (
                <InfoTile
                  icon="globe"
                  label={t('hotel.website', 'Website')}
                  href={hotel.website}
                  external
                >
                  {formatExternalUrl(hotel.website)}
                </InfoTile>
              )}
              {contacts?.primaryContactPerson && (
                <InfoTile icon="user" label={t('hotel.primaryContact', 'Primary contact')}>
                  <span className="property-info-tile__stack">
                    <span>{contacts.primaryContactPerson}</span>
                    {contacts.contactPosition && (
                      <span className="property-info-tile__sub">{contacts.contactPosition}</span>
                    )}
                  </span>
                </InfoTile>
              )}
              {contacts?.emergencyContactNumber && (
                <InfoTile
                  icon="shield"
                  label={t('hotel.emergencyContact', 'Emergency contact')}
                  href={`tel:${contacts.emergencyContactNumber}`}
                >
                  {contacts.emergencyContactNumber}
                </InfoTile>
              )}
            </div>
          </article>
        )}

        {socialLinks.length > 0 && (
          <article className="property-info-card property-info-card--wide">
            <header className="property-info-card__head">
              <Icon name="globe" size={20} />
              <h3>{t('hotel.socialMedia', 'Social media')}</h3>
            </header>
            <div className="property-info-card__grid property-info-card__grid--social">
              {socialLinks.map((link) => (
                <InfoTile
                  key={link.key}
                  icon="external-link"
                  label={t(link.labelKey, link.defaultLabel)}
                  href={link.url}
                  external
                >
                  {formatExternalUrl(link.url)}
                </InfoTile>
              ))}
            </div>
          </article>
        )}

        {policyCards.length > 0 && (
          <article className="property-info-card property-info-card--wide">
            <header className="property-info-card__head">
              <Icon name="clipboard-list" size={20} />
              <h3>{t('hotel.policies', 'Hotel policies')}</h3>
            </header>
            <div className="property-policy-grid">
              {policyCards.map((card) => (
                <div key={card.key} className="property-policy-item">
                  <span className="property-policy-item__icon" aria-hidden="true">
                    <Icon name={card.icon} size={18} />
                  </span>
                  <div className="property-policy-item__body">
                    <span className="property-policy-item__label">{card.label}</span>
                    <p className="property-policy-item__value">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>
    </section>
  );
};

export default PropertyGuestInfo;
