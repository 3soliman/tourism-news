import { validatePropertyImages } from './propertyImages';
import { getVideoEmbed } from './videoEmbed';
import { optionalLocalizedApiValue } from './localeContent';

/** Optional YouTube/Vimeo link — empty or invalid values are omitted from API payload */
export function resolveOptionalVideoUrl(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';
  return getVideoEmbed(trimmed) ? trimmed : '';
}

export function buildPropertyCreatePayload(form) {
  const base = {
    name: form.name.trim(),
    property_type: form.property_type || 'hotel',
    country: form.country.trim(),
    city: form.city.trim(),
    address: form.address.trim(),
    stars: Number(form.stars) || 5,
    description: form.description.trim(),
    is_active: Boolean(form.is_active),
    amenity_ids: (form.amenity_ids || []).map(Number).filter((id) => Number.isFinite(id)),
    policy: {
      check_in_time: form.check_in_time || null,
      check_out_time: form.check_out_time || null,
      cancellation_policy: (form.cancellation_policy || '').trim(),
      children_policy: (form.children_policy || '').trim(),
      pet_policy: (form.pet_policy || '').trim(),
      smoking_policy: (form.smoking_policy || '').trim(),
      extra_bed_policy: (form.extra_bed_policy || '').trim()
    }
  };

  const optionalTextFields = [
    ['subdomain', form.subdomain?.trim().toLowerCase()],
    ['phone', form.phone?.trim()],
    ['email', form.email?.trim()],
    ['website', form.website?.trim()]
  ];
  optionalTextFields.forEach(([field, value]) => {
    if (value) base[field] = value;
  });

  const videoUrl = resolveOptionalVideoUrl(form.video_url);
  if (videoUrl) {
    base.video_url = videoUrl;
  }

  const latitude = String(form.latitude ?? '').trim();
  const longitude = String(form.longitude ?? '').trim();
  if (latitude) base.latitude = latitude;
  if (longitude) base.longitude = longitude;

  base.social_media = {
    facebook_url: form.facebook_url?.trim() || '',
    instagram_url: form.instagram_url?.trim() || '',
    tiktok_url: form.tiktok_url?.trim() || '',
    twitter_url: form.twitter_url?.trim() || '',
    youtube_url: form.youtube_url?.trim() || '',
    linkedin_url: form.linkedin_url?.trim() || '',
    booking_com_url: form.booking_com_url?.trim() || '',
    agoda_url: form.agoda_url?.trim() || '',
    airbnb_url: form.airbnb_url?.trim() || '',
    expedia_url: form.expedia_url?.trim() || ''
  };

  base.contacts = {
    primary_contact_person: form.primary_contact_person?.trim() || '',
    contact_position: form.contact_position?.trim() || '',
    emergency_contact_number: form.emergency_contact_number?.trim() || ''
  };

  const slug = form.slug?.trim().toLowerCase();
  if (slug) base.slug = slug;

  base.name_ar = optionalLocalizedApiValue(form.name_ar);
  base.description_ar = optionalLocalizedApiValue(form.description_ar);
  base.short_description_ar = optionalLocalizedApiValue(form.short_description_ar);

  const shortDescription = form.short_description?.trim();
  if (shortDescription) base.short_description = shortDescription;

  if (form.seo_keywords?.trim()) base.seo_keywords = form.seo_keywords.trim();

  const policyArFields = [
    'cancellation_policy_ar',
    'children_policy_ar',
    'pet_policy_ar',
    'smoking_policy_ar',
    'extra_bed_policy_ar'
  ];
  policyArFields.forEach((key) => {
    base.policy[key] = optionalLocalizedApiValue(form[key]);
  });

  return base;
}

export function mapHotelToForm(hotel) {
  if (!hotel) return null;
  return {
    name: hotel.name || '',
    subdomain: hotel.subdomain || '',
    slug: hotel.slug || '',
    seo_keywords: hotel.seoKeywords || hotel.seo_keywords || '',
    property_type: hotel.propertyType || 'hotel',
    country: hotel.country || '',
    city: hotel.city || '',
    address: hotel.address || '',
    phone: hotel.phone || '',
    email: hotel.email || '',
    website: hotel.website || '',
    stars: hotel.stars || 5,
    description: hotel.description || '',
    short_description: hotel.shortDescription || hotel.short_description || '',
    name_ar: hotel.nameAr || hotel.name_ar || '',
    description_ar: hotel.descriptionAr || hotel.description_ar || '',
    short_description_ar: hotel.shortDescriptionAr || hotel.short_description_ar || '',
    is_active: hotel.isActive !== false,
    latitude: hotel.latitude || '',
    longitude: hotel.longitude || '',
    check_in_time: hotel.policy?.checkInTime || '',
    check_out_time: hotel.policy?.checkOutTime || '',
    cancellation_policy: hotel.policy?.cancellationPolicy || '',
    children_policy: hotel.policy?.childrenPolicy || '',
    pet_policy: hotel.policy?.petPolicy || '',
    smoking_policy: hotel.policy?.smokingPolicy || '',
    extra_bed_policy: hotel.policy?.extraBedPolicy || '',
    cancellation_policy_ar: hotel.policy?.cancellationPolicyAr || hotel.policy?.cancellation_policy_ar || '',
    children_policy_ar: hotel.policy?.childrenPolicyAr || hotel.policy?.children_policy_ar || '',
    pet_policy_ar: hotel.policy?.petPolicyAr || hotel.policy?.pet_policy_ar || '',
    smoking_policy_ar: hotel.policy?.smokingPolicyAr || hotel.policy?.smoking_policy_ar || '',
    extra_bed_policy_ar: hotel.policy?.extraBedPolicyAr || hotel.policy?.extra_bed_policy_ar || '',
    amenity_ids: (hotel.amenityItems || [])
      .map((a) => Number(a.id))
      .filter((id) => Number.isFinite(id)),
    facebook_url: hotel.socialMedia?.facebook_url || '',
    instagram_url: hotel.socialMedia?.instagram_url || '',
    tiktok_url: hotel.socialMedia?.tiktok_url || '',
    twitter_url: hotel.socialMedia?.twitter_url || '',
    youtube_url: hotel.socialMedia?.youtube_url || '',
    linkedin_url: hotel.socialMedia?.linkedin_url || '',
    video_url: hotel.videoUrl || hotel.video_url || '',
    booking_com_url: hotel.socialMedia?.booking_com_url || '',
    agoda_url: hotel.socialMedia?.agoda_url || '',
    airbnb_url: hotel.socialMedia?.airbnb_url || '',
    expedia_url: hotel.socialMedia?.expedia_url || '',
    primary_contact_person: hotel.contacts?.primary_contact_person || '',
    contact_position: hotel.contacts?.contact_position || '',
    emergency_contact_number: hotel.contacts?.emergency_contact_number || '',
    cm_provider_name: hotel.channelManager?.provider_name || '',
    cm_external_property_id: hotel.channelManager?.external_property_id || '',
    publishing_status: hotel.publishingStatus || 'draft'
  };
}

/** @deprecated */
export const buildHotelCreatePayload = buildPropertyCreatePayload;

export const HOTEL_WIZARD_TOTAL_STEPS = 7;

/** Map saved setup step from legacy wizards to current 7-step flow */
/** Map saved setup step from legacy 5-step wizard to current 7-step flow */
export function normalizeWizardResumeStep(savedStep, totalSteps = HOTEL_WIZARD_TOTAL_STEPS) {
  const step = Number(savedStep) || 1;
  if (totalSteps <= 5) {
    return Math.max(1, Math.min(step, totalSteps));
  }
  const legacyMap = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 7, 6: 7 };
  if (legacyMap[step]) return legacyMap[step];
  return Math.max(1, Math.min(step, totalSteps));
}
function resolveStepValidationOptions(fourthArg) {
  if (typeof fourthArg === 'boolean') {
    return { isOnboarding: fourthArg, wizardState: {}, requireAmenities: false };
  }
  return {
    isOnboarding: fourthArg?.isOnboarding ?? false,
    wizardState: fourthArg?.wizardState ?? {},
    requireAmenities: fourthArg?.requireAmenities ?? false
  };
}

/** Validate a single wizard step (1-based) */
export function validateHotelStep(step, form, imageState = null, fourthArg = {}) {
  const errors = {};

  if (step === 1) {
    if (!form.name?.trim()) errors.name = 'Property name is required';
    const subdomain = form.subdomain?.trim().toLowerCase();
    if (subdomain && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) errors.subdomain = 'Use letters, numbers, and hyphens only';
    if (subdomain && ['admin', 'api', 'www', 'mail', 'media', 'static', 'support'].includes(subdomain)) {
      errors.subdomain = 'This subdomain is reserved';
    }
    const slug = form.slug?.trim().toLowerCase();
    if (slug && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      errors.slug = 'Use lowercase letters, numbers, and hyphens only';
    }
    if (slug && ['admin', 'api', 'www', 'blog', 'search', 'login', 'signup'].includes(slug)) {
      errors.slug = 'This slug is reserved';
    }
    if (!form.property_type) errors.property_type = 'Property type is required';
    const stars = Number(form.stars);
    if (!stars || stars < 1 || stars > 5) errors.stars = 'Stars must be between 1 and 5';
  }

  if (step === 2) {
    if (!form.country?.trim()) errors.country = 'Country is required';
    if (!form.city?.trim()) errors.city = 'City is required';
    if (!form.address?.trim()) errors.address = 'Address is required';
  }

  if (step === 3 && imageState) {
    const imageValidation = validatePropertyImages(
      imageState.existingImages || [],
      imageState.pendingImages || [],
      imageState.deletedImageIds || []
    );
    Object.assign(errors, imageValidation.errors);
  }

  if (step === 4) {
    const { requireAmenities } = resolveStepValidationOptions(fourthArg);
    if (requireAmenities && !(form.amenity_ids || []).length) {
      errors.amenities = 'Select at least one amenity';
    }
  }

  if (step === 5) {
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (form.website?.trim() && !/^https?:\/\/.+\..+/i.test(form.website.trim())) {
      errors.website = 'Website must start with http:// or https://';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export const validatePropertyStep = validateHotelStep;

/** Full validation before submit */
export function validateHotelForm(form, imageState, isOnboarding = false, options = {}) {
  const {
    requirePhotos = false,
    requireAmenities = false,
    throughStep = null,
    wizardState = {}
  } = options;
  const stepOpts = { isOnboarding, wizardState, requireAmenities };

  let validationSteps;
  if (throughStep != null) {
    validationSteps = Array.from({ length: Math.max(0, throughStep) }, (_, i) => i + 1);
  } else if (isOnboarding) {
    validationSteps = requirePhotos ? [1, 2, 3, 4] : [1, 2];
  } else {
    validationSteps = requirePhotos ? [1, 2, 3, 4] : [1, 2];
  }

  const steps = validationSteps.map((s) => validateHotelStep(s, form, imageState, stepOpts));
  const errors = steps.reduce((acc, r) => ({ ...acc, ...r.errors }), {});

  return {
    valid: steps.every((s) => s.valid),
    errors
  };
}

export const HOTEL_FIELD_LABELS = {
  name: 'Property name',
  property_type: 'Property type',
  stars: 'Star rating',
  subdomain: 'Public subdomain',
  slug: 'URL slug',
  seo_keywords: 'Keywords',
  email: 'Email',
  website: 'Website',
  country: 'Country',
  city: 'City',
  address: 'Street address',
  main_image: 'Property photo',
  amenities: 'Amenities',
  check_in_time: 'Check-in time',
  check_out_time: 'Check-out time',
  cancellation_policy: 'Cancellation policy'
};

/** Minimum fields required to save a property draft (steps 1–2) */
export const HOTEL_REQUIRED_FIELDS_CREATE = [
  'name',
  'property_type',
  'stars',
  'country',
  'city',
  'address'
];

export const HOTEL_VALIDATION_MESSAGE_KEYS = {
  name: 'pages.addHotel.validation.nameRequired',
  property_type: 'pages.addHotel.validation.propertyTypeRequired',
  stars: 'pages.addHotel.validation.starsRequired',
  country: 'pages.addHotel.validation.countryRequired',
  city: 'pages.addHotel.validation.cityRequired',
  address: 'pages.addHotel.validation.addressRequired',
  subdomain: 'pages.addHotel.validation.subdomainInvalid',
  slug: 'pages.addHotel.validation.slugInvalid',
  email: 'pages.addHotel.validation.emailInvalid',
  website: 'pages.addHotel.validation.websiteInvalid',
  main_image: 'pages.addHotel.validation.mainImageRequired',
  cover_image: 'pages.addHotel.validation.coverImageRequired',
  amenities: 'pages.addHotel.validation.amenitiesRequired'
};

export const HOTEL_STEP_LABELS = {
  1: 'Basic identity',
  2: 'Location',
  3: 'Photos & video',
  4: 'Amenities',
  5: 'Contact',
  6: 'Policies',
  7: 'Review'
};

export function getStepErrorSummary(errors, isOnboarding = false) {
  const step = getStepForErrors(errors, isOnboarding);
  const fieldIds = Object.keys(errors);
  const fields = fieldIds.map((field) => HOTEL_FIELD_LABELS[field] || field);
  return {
    step,
    stepLabel: HOTEL_STEP_LABELS[step] || `Step ${step}`,
    fieldIds,
    fields
  };
}

export function validatePropertyForm(form, imageState, isOnboarding = false, options = {}) {
  return validateHotelForm(form, imageState, isOnboarding, options);
}

/** Map validation errors to the first wizard step that should open */
export function getStepForErrors(errors, isOnboarding = false) {
  if (errors.name || errors.property_type || errors.stars || errors.subdomain || errors.slug) return 1;
  if (errors.country || errors.city || errors.address) return 2;
  if (errors.main_image || errors.cover_image || errors.video_url) return 3;
  if (errors.amenities) return 4;
  if (errors.email || errors.website) return 5;
  if (errors.check_in_time || errors.check_out_time || errors.cancellation_policy) return 6;
  return isOnboarding ? 1 : 1;
}

/** Localize validation messages and build a user-facing error presentation */
export function presentHotelSaveErrors(rawErrors, {
  t = (key, fallback) => fallback,
  fieldLabelKeys = {},
  stepLabelKeys = {},
  isOnboarding = false,
  fallbackMessage = ''
} = {}) {
  const fieldErrors = localizeHotelFieldErrors(rawErrors, t);
  const fieldIds = Object.keys(fieldErrors);

  if (!fieldIds.length) {
    return {
      titleKey: 'pages.addHotel.saveErrorTitle',
      titleDefault: 'Could not save property',
      intro: fallbackMessage,
      lines: fallbackMessage ? [fallbackMessage] : [],
      fieldErrors: {},
      step: null,
      stepLabel: ''
    };
  }

  const summary = getStepErrorSummary(fieldErrors, isOnboarding);
  const lines = fieldIds.map((field) => {
    const labelKey = fieldLabelKeys[field];
    const label = labelKey
      ? t(labelKey, HOTEL_FIELD_LABELS[field] || field)
      : (HOTEL_FIELD_LABELS[field] || field);
    return `${label}: ${fieldErrors[field]}`;
  });

  return {
    titleKey: 'pages.addHotel.validationErrorTitle',
    titleDefault: 'Required fields are missing',
    intro: t(
      'pages.addHotel.validationErrorIntro',
      'Complete the following required fields, then try again:'
    ),
    lines,
    fieldErrors,
    step: summary.step,
    stepLabel: t(stepLabelKeys[summary.step] || '', summary.stepLabel)
  };
}

export function localizeHotelFieldErrors(rawErrors, t) {
  const localized = {};
  Object.entries(rawErrors || {}).forEach(([field, message]) => {
    const msgKey = HOTEL_VALIDATION_MESSAGE_KEYS[field];
    const text = String(message || '');
    localized[field] = msgKey ? t(msgKey, text) : text;
  });
  return localized;
}

export function isTechnicalErrorMessage(value) {
  return /SQLSTATE|Integrity constraint|NOT NULL constraint|PHP Request Startup|File upload error|<br\s*\/?>|<b>|<\/b>|Illuminate\\|App\\|vendor\\|Stack trace|\.php|Connection:|Database:|select |update |insert |delete |InvalidCastException|undefined cast/i.test(String(value));
}

const API_FIELD_ALIASES = {
  property_type: 'property_type',
  'policy.check_in_time': 'check_in_time',
  'policy.check_out_time': 'check_out_time',
  'policy.cancellation_policy': 'cancellation_policy',
};

const TECHNICAL_FIELD_HINTS = [
  { pattern: /hotels\.name|NOT NULL constraint failed: hotels\.name/i, field: 'name', message: 'Property name is required' },
  { pattern: /hotels\.country|NOT NULL constraint failed: hotels\.country/i, field: 'country', message: 'Country is required' },
  { pattern: /hotels\.city|NOT NULL constraint failed: hotels\.city/i, field: 'city', message: 'City is required' },
  { pattern: /hotels\.address|NOT NULL constraint failed: hotels\.address/i, field: 'address', message: 'Address is required' },
  { pattern: /hotels\.subdomain.*unique|UNIQUE constraint failed: hotels\.subdomain/i, field: 'subdomain', message: 'This subdomain is already taken' },
  { pattern: /hotels\.video_url|NOT NULL constraint failed: hotels\.video_url/i, field: 'video_url', message: 'Video link could not be saved. Leave it empty or use a valid YouTube/Vimeo link.' },
];

function normalizeApiFieldName(field) {
  return API_FIELD_ALIASES[field] || field.split('.').pop();
}

/** Parse Laravel-style validation errors into { field: message } */
export function parseApiFieldErrors(data) {
  if (!data || typeof data !== 'object') return {};

  const source = data.errors && typeof data.errors === 'object' ? data.errors : null;
  if (!source) return {};

  const errors = {};
  Object.entries(source).forEach(([field, messages]) => {
    const list = Array.isArray(messages) ? messages : [messages];
    const visible = list.map(String).find((message) => message && !isTechnicalErrorMessage(message));
    if (visible) {
      errors[normalizeApiFieldName(field)] = visible;
    }
  });
  return errors;
}

function inferFieldErrorsFromTechnicalMessage(message) {
  if (!message || !isTechnicalErrorMessage(message)) return {};
  const errors = {};
  TECHNICAL_FIELD_HINTS.forEach(({ pattern, field, message: text }) => {
    if (pattern.test(String(message))) errors[field] = text;
  });
  return errors;
}

/** Build a user-facing save error with optional field-level details */
export function resolveSaveError(err, fallback, options = {}) {
  const apiFieldErrors = parseApiFieldErrors(err?.data);
  const inferredFieldErrors = inferFieldErrorsFromTechnicalMessage(err?.data?.message || err?.message);
  const fieldErrors = { ...inferredFieldErrors, ...apiFieldErrors };

  const formatted = formatApiErrors(err?.data);
  const plainMessage =
    formatted ||
    (err?.message && !isTechnicalErrorMessage(err.message) ? err.message : null);

  if (Object.keys(fieldErrors).length) {
    const presentation = presentHotelSaveErrors(fieldErrors, {
      ...options,
      fallbackMessage: plainMessage || fallback
    });
    return {
      fieldErrors: presentation.fieldErrors,
      message: [presentation.intro, ...presentation.lines].filter(Boolean).join('\n'),
      presentation
    };
  }

  return {
    fieldErrors: {},
    message: plainMessage || fallback,
    presentation: presentHotelSaveErrors({}, { fallbackMessage: plainMessage || fallback })
  };
}

export function formatApiErrors(data, prefix = '') {
  if (!data) return null;
  if (typeof data === 'string') return isTechnicalErrorMessage(data) ? null : data;
  if (typeof data !== 'object') return null;
  const lines = [];
  const hiddenKeys = new Set(['exception', 'file', 'line', 'trace']);

  if (data.errors && typeof data.errors === 'object') {
    const nested = formatApiErrors(data.errors);
    if (nested) lines.push(nested);
  }

  Object.entries(data).forEach(([field, messages]) => {
    if (hiddenKeys.has(field) || field === 'errors') return;
    const key = prefix ? `${prefix}.${field}` : field;
    if (Array.isArray(messages)) {
      const visible = messages.filter((message) => !isTechnicalErrorMessage(message));
      if (visible.length) lines.push(`${key}: ${visible.join(' ')}`);
    } else if (typeof messages === 'object' && messages !== null) {
      const nested = formatApiErrors(messages, key);
      if (nested) lines.push(nested);
    } else {
      if (isTechnicalErrorMessage(messages)) return;
      lines.push(`${key}: ${String(messages)}`);
    }
  });
  return lines.length ? lines.join('\n') : null;
}
