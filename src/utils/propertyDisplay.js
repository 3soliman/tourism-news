import { pickLocalizedText } from './localeContent';

/** Guest/admin property name — prefer Arabic when locale is ar */
export function getPropertyDisplayName(property, locale = 'en') {
  return pickLocalizedText(
    locale,
    property?.nameAr || property?.name_ar,
    property?.name,
    'Hotel'
  );
}

/** Guest/admin property description — prefer Arabic when locale is ar */
export function getPropertyDescription(property, locale = 'en') {
  return pickLocalizedText(
    locale,
    property?.descriptionAr || property?.description_ar,
    property?.description
  );
}

/** Shorter guest blurb when available */
export function getPropertyShortDescription(property, locale = 'en') {
  return pickLocalizedText(
    locale,
    property?.shortDescriptionAr || property?.short_description_ar,
    property?.shortDescription || property?.short_description
  );
}

/** Localized policy text field from mapped policy object */
export function getPropertyPolicyText(policy, field, locale = 'en') {
  if (!policy) return '';
  const arKey = `${field}Ar`;
  return pickLocalizedText(locale, policy[arKey], policy[field]);
}
