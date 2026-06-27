import { pickLocalizedText } from './localeContent';

/** Guest/admin label — prefer Arabic when locale is ar and Arabic fields exist */
export function getRoomDisplayName(room, locale = 'en') {
  return pickLocalizedText(
    locale,
    room?.nameAr || room?.name_ar,
    room?.name
  );
}

export function getRoomDescription(room, locale = 'en') {
  return pickLocalizedText(
    locale,
    room?.descriptionAr || room?.description_ar,
    room?.description
  );
}
