'use client';

import React, { useMemo } from 'react';
import { useTranslation } from '../../../context/I18nContext';
import Icon from '../../icons/Icon';
import { computePublishReadiness } from '../../../utils/propertyWizardReadiness';

export default function PropertyWizardSummary({
  values,
  photoCount = 0,
  amenityCount = 0,
  currentStep,
  totalSteps
}) {
  const { t } = useTranslation();
  const ft = (key, fallback, vars) => t(`pages.addHotel.form.${key}`, fallback, vars);

  const readiness = useMemo(
    () => computePublishReadiness(values, photoCount, amenityCount),
    [values, photoCount, amenityCount]
  );

  const displayName = values.name?.trim() || values.name_ar?.trim() || ft('summaryUntitled', 'Untitled property');

  return (
    <aside className="property-wizard-summary" aria-label={ft('summaryAria', 'Property summary')}>
      <div className="property-wizard-summary__card">
        <p className="property-wizard-summary__eyebrow">{ft('summaryTitle', 'Property summary')}</p>
        <h3 className="property-wizard-summary__name">{displayName}</h3>
        <ul className="property-wizard-summary__facts">
          {values.property_type && (
            <li>
              <Icon name="building-2" size={14} />
              <span>{values.property_type}</span>
            </li>
          )}
          {values.stars && (
            <li>
              <Icon name="star" size={14} />
              <span>{ft('summaryStars', '{{n}} stars', { n: values.stars })}</span>
            </li>
          )}
          {(values.city || values.country) && (
            <li>
              <Icon name="map-pin" size={14} />
              <span>{[values.city, values.country].filter(Boolean).join(', ')}</span>
            </li>
          )}
          <li>
            <Icon name="upload" size={14} />
            <span>{ft('summaryPhotos', '{{count}} photos', { count: photoCount })}</span>
          </li>
        </ul>

        <div className="property-wizard-summary__progress">
          <div className="property-wizard-summary__progress-head">
            <span>{ft('publishRequirements', 'Publish requirements')}</span>
            <strong>{readiness.requiredDone}/{readiness.requiredTotal}</strong>
          </div>
          <div className="property-wizard-summary__progress-bar">
            <div className="property-wizard-summary__progress-fill" style={{ width: `${readiness.percent}%` }} />
          </div>
          <p className="property-wizard-summary__hint">
            {ft('summaryOptionalHint', 'You can publish now and complete contact details and policies later.')}
          </p>
        </div>

        <p className="property-wizard-summary__step">
          {ft('stepBadge', 'Step {{step}} of {{total}}', { step: currentStep, total: totalSteps })}
        </p>
      </div>
    </aside>
  );
}
