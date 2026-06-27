/** Guest/admin label — prefer Arabic when locale is ar and name_ar exists */
import { pickLocalizedText } from './localeContent';

export function getAmenityDisplayName(amenity, locale = 'en') {
  return pickLocalizedText(
    locale,
    amenity?.nameAr || amenity?.name_ar,
    amenity?.name
  );
}
