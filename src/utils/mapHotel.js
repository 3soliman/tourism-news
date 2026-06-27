import { API_BASE_URL } from '../config/api';
import { getAmenityDisplayName } from './amenityDisplay';

/** Backend origin for /media paths (when API is same-origin /api) */
export function getBackendOrigin() {
  const stripped = String(API_BASE_URL || '').replace(/\/api\/?$/, '');
  if (stripped && /^https?:\/\//i.test(stripped)) {
    return stripped.replace(/\/$/, '');
  }
  const proxy =
    process.env.NEXT_PUBLIC_API_PROXY_TARGET || process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (proxy) return String(proxy).replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'http://localhost:8000';
}

/** Turn relative media paths into same-origin URLs (stable across SSR and client). */
export function resolveMediaUrl(url) {
  if (!url) return '';
  const raw =
    typeof url === 'string' ? url : url?.url || url?.href || url?.path || '';
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const { pathname } = new URL(trimmed);
      if (pathname.startsWith('/media/')) return pathname;
    } catch {
      /* keep absolute external URLs as-is */
    }
    return trimmed;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Maps API hotel object → shape used by UI components
 */
export function mapApiHotel(api) {
  const stars = Number(api.stars) || 3;
  const totalReviews = api.total_reviews ?? api.review_count ?? api.reviewCount ?? 0;
  const images = extractImages(api);
  const { keys: amenities, tags: amenityTags, items: amenityItems } = mergeAmenities(api);
  const coverImage = images[0] || resolveMediaUrl(api.cover_image_url || api.main_image || api.image || '');

  return {
    id: String(api.id),
    slug: api.slug || '',
    seoKeywords: (api.seo_keywords || api.seoKeywords || '').trim(),
    subdomain: api.subdomain || '',
    name: api.name || 'Hotel',
    nameAr: (api.name_ar || api.nameAr || '').trim(),
    propertyType: api.property_type || 'hotel',
    city: api.city || '',
    country: api.country || '',
    address: api.address || '',
    phone: api.phone || '',
    email: api.email || '',
    website: api.website || '',
    stars,
    averageRating:
      api.average_rating != null
        ? Number(api.average_rating)
        : api.rating != null
          ? Number(api.rating)
          : null,
    rating:
      api.average_rating != null
        ? Number(api.average_rating)
        : api.rating != null
          ? Number(api.rating)
          : totalReviews > 0
            ? stars >= 4
              ? 4.5
              : 4.0
            : null,
    reviewCount: totalReviews,
    priceFrom: api.price_from ?? api.min_price ?? api.priceFrom ?? null,
    popularity: (api.stars || 3) * 20,
    type: inferHotelType(api, stars),
    breakfast: api.breakfast || 'continental',
    image: coverImage,
    images: images.length ? images : coverImage ? [coverImage] : [],
    amenities,
    amenityTags,
    amenityItems,
    description: api.description || '',
    descriptionAr: (api.description_ar || api.descriptionAr || '').trim(),
    shortDescription: api.short_description || '',
    shortDescriptionAr: (api.short_description_ar || api.shortDescriptionAr || '').trim(),
    metaTitle: (api.meta_title || api.metaTitle || '').trim(),
    metaTitleAr: (api.meta_title_ar || api.metaTitleAr || '').trim(),
    metaDescription: (api.meta_description || api.metaDescription || '').trim(),
    metaDescriptionAr: (api.meta_description_ar || api.metaDescriptionAr || '').trim(),
    policy: mapPolicy(api.policy),
    rooms: Array.isArray(api.rooms) ? api.rooms.map(mapApiRoom) : [],
    reviews: Array.isArray(api.reviews) ? api.reviews : [],
    isActive: api.is_active !== false,
    publishingStatus: api.publishing_status || 'draft',
    imageAlt: api.image_alt_text || '',
    imageCaption: api.image_caption || '',
    latitude: api.latitude != null && api.latitude !== '' ? String(api.latitude) : '',
    longitude: api.longitude != null && api.longitude !== '' ? String(api.longitude) : '',
    socialMedia: api.social_media || null,
    contacts: api.contacts || null,
    channelManager: api.channel_manager_connection || null,
    videoUrl: api.video_url || '',
    createdAt: api.created_at,
    updatedAt: api.updated_at
  };
}

function isCoverFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function extractImages(api) {
  const ordered = [];
  let coverFromFlag = null;
 
  if (Array.isArray(api.images)) {
    const active = [...api.images].filter((img) => img.is_active !== false);
    active.sort((a, b) => {
      const aCover = isCoverFlag(a.is_cover) || isCoverFlag(a.isCover);
      const bCover = isCoverFlag(b.is_cover) || isCoverFlag(b.isCover);
      if (aCover && !bCover) return -1;
      if (!aCover && bCover) return 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
    active.forEach((img) => {
      const url = resolveMediaUrl(img.image_url || img.image);
      if (!url || ordered.includes(url)) return;
      if (isCoverFlag(img.is_cover) || isCoverFlag(img.isCover)) {
        coverFromFlag = url;
      }
      ordered.push(url);
    });
  }

  // Prefer is_cover on gallery items — backend cover_image_url may not match.
  const coverUrl = coverFromFlag || resolveMediaUrl(api.cover_image_url || api.main_image);
  if (coverUrl) {
    return [coverUrl, ...ordered.filter((url) => url !== coverUrl)];
  }

  return ordered;
}

function mergeAmenities(api) {
  const keys = new Set();
  const tags = [];
  const items = [];

  const add = (key, label, item = null) => {
    if (!key || keys.has(key)) return;
    keys.add(key);
    tags.push(label || key);
    if (item) items.push(item);
  };

  if (Array.isArray(api.amenities)) {
    api.amenities
      .filter((a) => a.is_active !== false)
      .forEach((a) => {
        const name = (a.name || '').trim();
        if (!name) return;
        add(normalizeAmenityKey(name), name, {
          id: String(a.id),
          name,
          nameAr: (a.name_ar || a.nameAr || '').trim(),
          icon: a.icon || a.icon_url || '',
          iconUrl: resolveAmenityIconUrl(a.icon || a.icon_url || '')
        });
      });
  }

  return {
    keys: [...keys],
    tags,
    items
  };
}

function resolveAmenityIconUrl(raw) {
  if (!raw) return '';
  if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) return raw;
  return resolveMediaUrl(raw);
}

function mapApiRoom(room) {
  return {
    id: String(room.id),
    name: room.name,
    nameAr: (room.name_ar || room.nameAr || '').trim(),
    description: room.description || '',
    descriptionAr: (room.description_ar || room.descriptionAr || '').trim(),
    capacity: room.capacity ?? 2,
    price: Number(room.price) || 0,
    size: room.size || '—',
    bed: room.bed || '—',
    breakfast: room.breakfast || 'continental',
    refundable: room.refundable !== false,
    images: (room.images || (room.image ? [room.image] : [])).map(resolveMediaUrl).filter(Boolean)
  };
}

function normalizeAmenityKey(label) {
  const lower = label.toLowerCase();
  if (lower.includes('wifi') || lower.includes('wi-fi')) return 'wifi';
  if (lower.includes('pool')) return 'pool';
  if (lower.includes('spa')) return 'spa';
  if (lower.includes('parking')) return 'parking';
  if (lower.includes('gym') || lower.includes('fitness')) return 'gym';
  if (lower.includes('restaurant')) return 'restaurant';
  if (lower.includes('air') || lower.includes('ac')) return 'ac';
  if (lower.includes('pet')) return 'pet';
  return lower.replace(/\s+/g, '_');
}

function inferHotelType(api, stars) {
  if (api.type) return api.type;

  const propertyType = (api.property_type || '').toLowerCase();
  if (propertyType === 'resort' || propertyType === 'villa') return 'luxury';
  if (propertyType === 'hostel' || propertyType === 'apartment') return 'budget';
  if (stars >= 5) return 'luxury';
  if (stars <= 2) return 'budget';
  return 'city';
}

function mapPolicy(policy) {
  if (!policy || typeof policy !== 'object') return null;

  const hasContent = [
    policy.check_in_time,
    policy.check_out_time,
    policy.cancellation_policy,
    policy.children_policy,
    policy.pet_policy,
    policy.smoking_policy,
    policy.extra_bed_policy,
    policy.important_notes,
    policy.cancellation_policy_ar,
    policy.children_policy_ar,
    policy.pet_policy_ar,
    policy.smoking_policy_ar,
    policy.extra_bed_policy_ar,
    policy.important_notes_ar
  ].some(Boolean);

  if (!hasContent) return null;

  return {
    checkInTime: policy.check_in_time || '',
    checkOutTime: policy.check_out_time || '',
    cancellationPolicy: policy.cancellation_policy || '',
    cancellationPolicyAr: policy.cancellation_policy_ar || '',
    childrenPolicy: policy.children_policy || '',
    childrenPolicyAr: policy.children_policy_ar || '',
    petPolicy: policy.pet_policy || '',
    petPolicyAr: policy.pet_policy_ar || '',
    smokingPolicy: policy.smoking_policy || '',
    smokingPolicyAr: policy.smoking_policy_ar || '',
    extraBedPolicy: policy.extra_bed_policy || '',
    extraBedPolicyAr: policy.extra_bed_policy_ar || '',
    importantNotes: policy.important_notes || '',
    importantNotesAr: policy.important_notes_ar || ''
  };
}

function formatPolicyTime(value) {
  if (!value) return '';
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  return value;
}

export function formatHotelPolicy(policy) {
  if (!policy) return [];
  const rows = [];

  if (policy.checkInTime) rows.push({ label: 'Check-in', value: formatPolicyTime(policy.checkInTime) });
  if (policy.checkOutTime) rows.push({ label: 'Check-out', value: formatPolicyTime(policy.checkOutTime) });
  if (policy.cancellationPolicy) rows.push({ label: 'Cancellation', value: policy.cancellationPolicy });
  if (policy.childrenPolicy) rows.push({ label: 'Children', value: policy.childrenPolicy });
  if (policy.petPolicy) rows.push({ label: 'Pets', value: policy.petPolicy });
  if (policy.smokingPolicy) rows.push({ label: 'Smoking', value: policy.smokingPolicy });
  if (policy.extraBedPolicy) rows.push({ label: 'Extra beds', value: policy.extraBedPolicy });
  if (policy.importantNotes) rows.push({ label: 'Important notes', value: policy.importantNotes });

  return rows;
}

export function getDestinationsFromHotels(hotels) {
  const cities = [...new Set(hotels.map((h) => h.city).filter(Boolean))];
  return cities.sort((a, b) => a.localeCompare(b));
}

export function getAmenityDisplayList(hotel, locale = 'en') {
  return getHotelAmenities(hotel).map((a) => getAmenityDisplayName(a, locale));
}

const AMENITY_LABEL_BY_KEY = {
  wifi: 'Free WiFi',
  pool: 'Swimming Pool',
  spa: 'Spa',
  parking: 'Free Parking',
  gym: 'Fitness Center',
  restaurant: 'Restaurant',
  ac: 'Air Conditioning',
  pet: 'Pet Friendly'
};

/** Normalized amenity rows for guest UI (icons when available from API). */
export function getHotelAmenities(hotel) {
  if (hotel.amenityItems?.length) {
    return hotel.amenityItems.map((item) => ({
      id: String(item.id ?? item.name),
      name: item.name,
      nameAr: item.nameAr || item.name_ar || '',
      iconUrl: item.iconUrl || resolveAmenityIconUrl(item.icon)
    }));
  }

  const keys = hotel.amenityTags?.length ? hotel.amenityTags : hotel.amenities || [];
  return keys.map((key) => {
    const id = String(key);
    const name = AMENITY_LABEL_BY_KEY[id] || id.replace(/_/g, ' ');
    return { id, name, iconUrl: '' };
  });
}
