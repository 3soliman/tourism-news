import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { resolveNextApiPath } from './pagination';

function parseListPage(data) {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return {
    count: data.count ?? (data.results || []).length,
    next: data.next || null,
    previous: data.previous || null,
    results: data.results || data.data || []
  };
}

export function formatReviewApiError(err) {
  if (!err) return 'Could not submit review';
  const data = err.data;
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail;
    const parts = [];
    Object.values(data).forEach((val) => {
      if (Array.isArray(val)) parts.push(...val.map(String));
      else if (typeof val === 'string') parts.push(val);
    });
    if (parts.length > 0) return parts.join(' ');
  }
  return err.message || 'Could not submit review';
}

export function mapReviewSummary(api) {
  const breakdown = api?.rating_breakdown || {};
  const categories = api?.category_averages || {};

  return {
    averageRating: api?.average_rating != null ? Number(api.average_rating) : null,
    totalReviews: Number(api?.total_reviews) || 0,
    ratingBreakdown: {
      5: Number(breakdown['5']) || 0,
      4: Number(breakdown['4']) || 0,
      3: Number(breakdown['3']) || 0,
      2: Number(breakdown['2']) || 0,
      1: Number(breakdown['1']) || 0
    },
    categoryAverages: {
      cleanliness: toCategoryScore(categories.cleanliness),
      location: toCategoryScore(categories.location),
      staff: toCategoryScore(categories.staff),
      comfort: toCategoryScore(categories.comfort),
      valueForMoney: toCategoryScore(categories.value_for_money)
    }
  };
}

function toCategoryScore(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function mapReview(api) {
  return {
    id: String(api.id),
    apiId: api.id,
    guestName: api.guest_name || 'Guest',
    guestEmail: api.guest_email || api.email || '',
    rating: Number(api.rating) || 0,
    title: api.title || '',
    comment: api.comment || '',
    cleanliness: api.cleanliness != null ? Number(api.cleanliness) : null,
    location: api.location != null ? Number(api.location) : null,
    staff: api.staff != null ? Number(api.staff) : null,
    comfort: api.comfort != null ? Number(api.comfort) : null,
    valueForMoney: api.value_for_money != null ? Number(api.value_for_money) : null,
    isActive: api.is_active !== false,
    isPublished: api.is_active !== false,
    createdAt: api.created_at || '',
    updatedAt: api.updated_at || ''
  };
}

export function mapAdminReview(api, { propertyId, propertyName } = {}) {
  const resolvedPropertyId = propertyId ?? api.property ?? api.hotel_id;
  return {
    ...mapReview(api),
    propertyId: resolvedPropertyId != null && resolvedPropertyId !== '' ? String(resolvedPropertyId) : '',
    propertyName: propertyName || api.property_name || ''
  };
}

/** Aggregate review counts and averages per property id */
export function buildPropertyReviewStats(reviews) {
  const stats = new Map();

  (reviews || []).forEach((review) => {
    if (!review?.propertyId || review.isActive === false) return;
    const entry = stats.get(review.propertyId) || { count: 0, ratingSum: 0 };
    entry.count += 1;
    entry.ratingSum += Number(review.rating) || 0;
    stats.set(review.propertyId, entry);
  });

  const byPropertyId = {};
  stats.forEach((entry, propertyId) => {
    byPropertyId[propertyId] = {
      reviewCount: entry.count,
      averageRating: entry.count ? entry.ratingSum / entry.count : null
    };
  });

  return byPropertyId;
}

async function fetchAllReviewPages(initialPath, { force = false } = {}) {
  let path = initialPath;
  const all = [];

  while (path) {
    const data = await apiGet(path, { force });
    const page = parseListPage(data);
    all.push(...page.results);
    path = resolveNextApiPath(page.next);
    force = false;
    if (all.length > 5000) break;
  }

  return all;
}

/** GET /api/reviews/ — admin list (all properties, paginated) */
export async function fetchAllAdminReviews({ propertyId, force = false } = {}) {
  const initialPath = propertyId ? `/reviews/?property=${propertyId}` : '/reviews/';
  const rows = await fetchAllReviewPages(initialPath, { force });
  return rows.map((api) => mapAdminReview(api));
}

/** GET /api/properties/:id/reviews/summary/ */
export async function fetchPropertyReviewSummary(propertyId, { force = false } = {}) {
  const data = await apiGet(`/properties/${propertyId}/reviews/summary/`, { force });
  return mapReviewSummary(data);
}

/** GET /api/properties/:id/reviews/ — paginated */
export async function fetchPropertyReviews(propertyId, { page = 1 } = {}) {
  let path = `/properties/${propertyId}/reviews/`;
  if (page > 1) path += `?page=${page}`;
  const data = await apiGet(path);
  const pageData = parseListPage(data);
  return {
    ...pageData,
    results: pageData.results.map(mapReview)
  };
}

export function buildReviewPayload(form) {
  const payload = {
    guest_name: form.guestName.trim(),
    guest_email: form.guestEmail.trim(),
    comment: form.comment.trim(),
    rating: Number(form.rating)
  };

  if (form.title?.trim()) payload.title = form.title.trim();

  const optionalScores = {
    cleanliness: form.cleanliness,
    location: form.location,
    staff: form.staff,
    comfort: form.comfort,
    value_for_money: form.valueForMoney
  };

  Object.entries(optionalScores).forEach(([key, value]) => {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 1 && n <= 5) payload[key] = n;
  });

  return payload;
}

/** POST /api/properties/:id/reviews/ */
export async function submitPropertyReview(propertyId, form) {
  const data = await apiPost(`/properties/${propertyId}/reviews/`, buildReviewPayload(form));
  return mapReview(data);
}

function attachReviewProperty(review, propertyId, propertyName) {
  return {
    ...review,
    propertyId: String(propertyId),
    propertyName: propertyName || ''
  };
}

/** Fetch every page of GET /api/properties/:id/reviews/ */
export async function fetchAllPropertyReviews(propertyId, { propertyName } = {}) {
  const all = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const data = await fetchPropertyReviews(propertyId, { page });
    all.push(
      ...data.results.map((review) => attachReviewProperty(review, propertyId, propertyName))
    );
    hasNext = Boolean(data.next);
    page += 1;
    if (page > 100) break;
  }

  return all;
}

/** Admin list — all reviews for one property */
export async function fetchAdminPropertyReviews(propertyId, { propertyName, page, force = false } = {}) {
  if (page != null) {
    const data = await fetchPropertyReviews(propertyId, { page });
    return {
      ...data,
      results: data.results.map((review) =>
        attachReviewProperty(review, propertyId, propertyName)
      )
    };
  }
  const list = await fetchAllAdminReviews({ propertyId, force });
  if (!propertyName) return list;
  return list.map((review) => ({ ...review, propertyName }));
}

export function filterAdminReviews(reviews, { rating, query } = {}) {
  let list = Array.isArray(reviews) ? [...reviews] : [];

  if (rating && rating !== 'all') {
    const target = Number(rating);
    list = list.filter((r) => Math.round(r.rating) === target);
  }

  const q = (query || '').trim().toLowerCase();
  if (q) {
    list = list.filter((r) => {
      const haystack = [r.guestName, r.guestEmail, r.title, r.comment, r.propertyName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** PATCH review moderation via /api/reviews/:id/ */
export async function updatePropertyReview(propertyId, reviewId, patch) {
  const data = await apiPatch(`/reviews/${reviewId}/`, patch);
  return mapReview(data);
}

/** DELETE review via /api/reviews/:id/ */
export async function deletePropertyReview(propertyId, reviewId) {
  return apiDelete(`/reviews/${reviewId}/`);
}

function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Aggregate recent published guest reviews across properties for the homepage.
 * Walks hotels (by review count) until `limit` comments are collected.
 */
export async function fetchFeaturedGuestReviews(hotels, { limit = 5 } = {}) {
  if (!Array.isArray(hotels) || hotels.length === 0) return [];

  const targets = [...hotels].sort(
    (a, b) =>
      (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0) ||
      (Number(b.rating) || b.stars || 0) - (Number(a.rating) || a.stars || 0)
  );

  const collected = [];

  for (const hotel of targets) {
    if (collected.length >= limit) break;

    try {
      const data = await fetchPropertyReviews(hotel.id, { page: 1 });
      const reviews = data.results
        .filter((review) => review.isPublished !== false && String(review.comment || '').trim())
        .map((review) => ({
          ...review,
          propertyId: String(hotel.id),
          propertyName: hotel.name || '',
          propertyNameAr: hotel.nameAr || hotel.name_ar || '',
          propertyCity: hotel.city || '',
          initials: initialsFromName(review.guestName)
        }));

      for (const review of reviews) {
        if (collected.length >= limit) break;
        collected.push(review);
      }
    } catch {
      // try next property
    }
  }

  return collected
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}
