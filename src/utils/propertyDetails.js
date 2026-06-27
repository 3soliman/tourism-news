import { getPropertyPolicyText } from './propertyDisplay';

const SOCIAL_FIELDS = [
  { key: 'facebook', field: 'facebook_url', labelKey: 'hotel.socialFacebook', defaultLabel: 'Facebook' },
  { key: 'instagram', field: 'instagram_url', labelKey: 'hotel.socialInstagram', defaultLabel: 'Instagram' },
  { key: 'tiktok', field: 'tiktok_url', labelKey: 'hotel.socialTiktok', defaultLabel: 'TikTok' },
  { key: 'twitter', field: 'twitter_url', labelKey: 'hotel.socialTwitter', defaultLabel: 'Twitter' },
  { key: 'youtube', field: 'youtube_url', labelKey: 'hotel.socialYoutube', defaultLabel: 'YouTube' },
  { key: 'linkedin', field: 'linkedin_url', labelKey: 'hotel.socialLinkedin', defaultLabel: 'LinkedIn' },
  { key: 'booking', field: 'booking_com_url', labelKey: 'hotel.socialBooking', defaultLabel: 'Booking.com' },
  { key: 'agoda', field: 'agoda_url', labelKey: 'hotel.socialAgoda', defaultLabel: 'Agoda' },
  { key: 'airbnb', field: 'airbnb_url', labelKey: 'hotel.socialAirbnb', defaultLabel: 'Airbnb' },
  { key: 'expedia', field: 'expedia_url', labelKey: 'hotel.socialExpedia', defaultLabel: 'Expedia' },
  { key: 'whatsapp', field: 'whatsapp_number', labelKey: 'hotel.socialWhatsapp', defaultLabel: 'WhatsApp' },
  { key: 'telegram', field: 'telegram_username', labelKey: 'hotel.socialTelegram', defaultLabel: 'Telegram' }
];

export function mapPropertyContacts(contacts) {
  if (!contacts || typeof contacts !== 'object') return null;

  const primaryContactPerson = (contacts.primary_contact_person || '').trim();
  const contactPosition = (contacts.contact_position || '').trim();
  const emergencyContactNumber = (contacts.emergency_contact_number || '').trim();

  if (!primaryContactPerson && !contactPosition && !emergencyContactNumber) return null;

  return { primaryContactPerson, contactPosition, emergencyContactNumber };
}

export function getPropertySocialLinks(socialMedia) {
  if (!socialMedia || typeof socialMedia !== 'object') return [];

  return SOCIAL_FIELDS.map(({ key, field, labelKey, defaultLabel }) => {
    const raw = (socialMedia[field] || '').trim();
    if (!raw) return null;
    let url = raw;
    if (key === 'whatsapp') {
      const digits = raw.replace(/\D/g, '');
      url = digits ? `https://wa.me/${digits}` : raw;
    } else if (key === 'telegram') {
      const handle = raw.replace(/^@/, '');
      url = handle ? `https://t.me/${handle}` : raw;
    }
    return { key, url, labelKey, defaultLabel };
  }).filter(Boolean);
}

export function formatGuestTime(value, locale) {
  if (!value) return '';
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return text;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return text;

  try {
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return new Intl.DateTimeFormat(locale || undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  } catch {
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
  }
}

export function getPropertyPolicyCards(policy, { locale, t } = {}) {
  if (!policy) return [];

  const rows = [
    {
      key: 'checkIn',
      icon: 'clock',
      labelKey: 'hotel.policyCheckIn',
      defaultLabel: 'Check-in time',
      value: formatGuestTime(policy.checkInTime, locale)
    },
    {
      key: 'checkOut',
      icon: 'clock',
      labelKey: 'hotel.policyCheckOut',
      defaultLabel: 'Check-out time',
      value: formatGuestTime(policy.checkOutTime, locale)
    },
    {
      key: 'cancellation',
      icon: 'clipboard-list',
      labelKey: 'hotel.policyCancellation',
      defaultLabel: 'Cancellation policy',
      value: getPropertyPolicyText(policy, 'cancellationPolicy', locale)
    },
    {
      key: 'children',
      icon: 'users',
      labelKey: 'hotel.policyChildren',
      defaultLabel: 'Children policy',
      value: getPropertyPolicyText(policy, 'childrenPolicy', locale)
    },
    {
      key: 'pets',
      icon: 'circle-help',
      labelKey: 'hotel.policyPets',
      defaultLabel: 'Pet policy',
      value: getPropertyPolicyText(policy, 'petPolicy', locale)
    },
    {
      key: 'smoking',
      icon: 'x',
      labelKey: 'hotel.policySmoking',
      defaultLabel: 'Smoking policy',
      value: getPropertyPolicyText(policy, 'smokingPolicy', locale)
    },
    {
      key: 'extraBed',
      icon: 'bed-double',
      labelKey: 'hotel.policyExtraBed',
      defaultLabel: 'Extra bed policy',
      value: getPropertyPolicyText(policy, 'extraBedPolicy', locale)
    },
    {
      key: 'notes',
      icon: 'circle-help',
      labelKey: 'hotel.policyNotes',
      defaultLabel: 'Important notes',
      value: getPropertyPolicyText(policy, 'importantNotes', locale)
    }
  ];

  return rows
    .filter((row) => Boolean(String(row.value || '').trim()))
    .map((row) => ({
      ...row,
      label: t ? t(row.labelKey, row.defaultLabel) : row.defaultLabel
    }));
}

export function hasPropertyContactInfo(hotel) {
  return Boolean(
    hotel?.phone?.trim()
    || hotel?.email?.trim()
    || hotel?.website?.trim()
    || mapPropertyContacts(hotel?.contacts)
    || getPropertySocialLinks(hotel?.socialMedia).length
    || getPropertyPolicyCards(hotel?.policy).length
  );
}
