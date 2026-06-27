'use client';

import React from 'react';
import { Link } from '@/lib/router-compat';
import { BRAND } from '@/config/brand';
import { useTranslation } from '@/context/I18nContext';
import { getTrustPageSections } from '@/config/trustPages';
import Icon from '@/components/icons/Icon';

const LAST_UPDATED = '2025-01-01';

const TrustPage = ({ pageId }) => {
  const { t } = useTranslation();
  const vars = {
    brand: BRAND.name,
    email: BRAND.emails?.[0] || BRAND.email || 'info@m-arabi.com',
    date: LAST_UPDATED
  };

  const sections = getTrustPageSections(pageId);
  const isFaq = pageId === 'faq';

  return (
    <article className="trust-page">
      <header className="trust-page__header">
        <p className="trust-page__eyebrow">{t('trust.sectionTitle')}</p>
        <h1>{t(`trust.pages.${pageId}.title`)}</h1>
        <p className="trust-page__intro">{t(`trust.pages.${pageId}.intro`, null, vars)}</p>
        <p className="trust-page__updated">{t('trust.lastUpdated', null, vars)}</p>
      </header>

      <div className="trust-page__body">
        {isFaq ? (
          <div className="trust-faq">
            {sections.map(({ index }) => (
              <details key={index} className="trust-faq__item">
                <summary>{t(`trust.pages.faq.q${index}`)}</summary>
                <p>{t(`trust.pages.faq.a${index}`, null, vars)}</p>
              </details>
            ))}
          </div>
        ) : (
          sections.map(({ id }) => (
            <section key={id} className="trust-section">
              <h2>{t(`trust.pages.${pageId}.${id}Title`)}</h2>
              <p>{t(`trust.pages.${pageId}.${id}Body`, null, vars)}</p>
            </section>
          ))
        )}
      </div>

      <footer className="trust-page__footer">
        <Link to="/contact" className="trust-page__contact">
          <Icon name="circle-help" size={16} />
          <span>{t('nav.contact')}</span>
        </Link>
      </footer>
    </article>
  );
};

export default TrustPage;
