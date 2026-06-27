import { pickLocalizedText } from './localeContent';

/** Guest/admin label — prefer Arabic when locale is ar and Arabic fields exist */
export function getServiceDisplayName(service, locale = 'en') {
  return pickLocalizedText(
    locale,
    service?.nameAr || service?.name_ar,
    service?.name
  );
}

export function getServiceShortDescription(service, locale = 'en') {
  return pickLocalizedText(
    locale,
    service?.shortDescriptionAr || service?.short_description_ar,
    service?.shortDescription || service?.short_description
  );
}

export function getServiceDescription(service, locale = 'en') {
  return pickLocalizedText(
    locale,
    service?.descriptionAr || service?.description_ar,
    service?.description
  );
}

export function getServiceGuestBlurb(service, locale = 'en') {
  return getServiceShortDescription(service, locale) || getServiceDescription(service, locale);
}
