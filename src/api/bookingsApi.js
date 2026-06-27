import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { nightsBetween } from '../utils/searchUtils';
import { fetchRoomTypeById, getRoomTypeDisplayImage } from './roomTypesApi';

export const BOOKING_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' }
];

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

function resolveRelationId(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    const id = value.id ?? value.pk;
    return id != null ? String(id) : '';
  }
  return String(value);
}

function resolveRelationName(value) {
  if (value == null || typeof value !== 'object') return '';
  return value.name || value.title || '';
}

/** YYYY-MM-DD from API date or datetime string */
function normalizeDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

/** Validate guests[] length and primary guest for inquiry/create payloads */
export function validateBookingGuestList(guests, { adults = 0, children = 0, infants = 0 } = {}) {
  const expected =
    (Number(adults) || 0) + (Number(children) || 0) + (Number(infants) || 0);

  if (!Array.isArray(guests) || guests.length !== expected) {
    return `Guest list must include ${expected} entries (adults + children + infants).`;
  }

  const primaryCount = guests.filter((g) => g.is_primary === true).length;
  if (primaryCount !== 1) {
    return 'Exactly one guest must be marked as primary (is_primary: true).';
  }

  return null;
}

/** Build guests[] for POST /api/bookings/inquiry/ */
export function buildBookingGuests({ guest, cart }) {
  const guests = [];
  const primaryName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest';

  guests.push({
    full_name: primaryName,
    guest_type: 'adult',
    phone: guest.phone || '',
    email: (guest.email || '').trim(),
    is_primary: true
  });

  for (let i = 2; i <= (Number(cart.adults) || 1); i += 1) {
    guests.push({
      full_name: `Guest ${i}`,
      guest_type: 'adult',
      is_primary: false
    });
  }

  for (let i = 1; i <= (Number(cart.children) || 0); i += 1) {
    guests.push({
      full_name: `Child ${i}`,
      guest_type: 'child',
      is_primary: false
    });
  }

  for (let i = 1; i <= (Number(cart.infants) || 0); i += 1) {
    guests.push({
      full_name: `Infant ${i}`,
      guest_type: 'infant',
      is_primary: false
    });
  }

  return guests;
}

/** Build booking body from checkout data */
export function buildBookingPayload({ cart, guest, extraBedNeeded = false, extraBedCount = 0 }) {
  const customerName = `${guest.firstName || ''} ${guest.lastName || ''}`.trim();
  const adults = Number(cart.adults) || 1;
  const children = Number(cart.children) || 0;
  const infants = Number(cart.infants) || 0;

  return {
    customer_name: customerName,
    phone: (guest.phone || '').trim(),
    email: (guest.email || '').trim(),
    property: Number(cart.hotelId),
    room_type: Number(cart.roomId),
    check_in: cart.checkIn,
    check_out: cart.checkOut,
    adults,
    children,
    infants,
    extra_bed_needed: Boolean(extraBedNeeded),
    extra_bed_count: extraBedNeeded ? Math.max(1, Number(extraBedCount) || 1) : 0,
    guests: buildBookingGuests({ guest, cart })
  };
}

/** POST /api/bookings/inquiry/ body (no status field) */
export function buildBookingInquiryPayload(bookingData) {
  const cart = bookingData.cart || bookingData;
  return buildBookingPayload({
    cart,
    guest: bookingData.guest,
    extraBedNeeded: bookingData.extraBedNeeded,
    extraBedCount: bookingData.extraBedCount
  });
}

/** Normalize inquiry vs standard booking API shapes */
function normalizeBookingApi(api) {
  if (!api || typeof api !== 'object') return {};
  return {
    ...api,
    id: api.id ?? api.booking_id,
    property: api.property ?? api.property_id,
    room_type: api.room_type ?? api.room_type_id
  };
}

export function mapBooking(api) {
  const normalized = normalizeBookingApi(api);
  const propertyRaw = normalized.property;
  const roomTypeRaw = normalized.room_type;
  const guestName = normalized.customer_name || '';
  const nameParts = guestName.trim().split(/\s+/);
  const checkIn = normalized.check_in || '';
  const checkOut = normalized.check_out || '';
  const nights = nightsBetween(checkIn, checkOut);
  const bookingId = normalized.id;

  return {
    id: bookingId != null && bookingId !== '' ? String(bookingId) : '',
    apiId: bookingId,
    status: normalized.status || 'new',
    hotelId: resolveRelationId(propertyRaw),
    hotelName: normalized.property_name || resolveRelationName(propertyRaw) || '',
    hotelImage: normalized.property_image || normalized.cover_image_url || '',
    city: normalized.property_city || normalized.city || '',
    roomId: resolveRelationId(roomTypeRaw),
    roomName: normalized.room_type_name || resolveRelationName(roomTypeRaw) || '',
    roomImage: normalized.room_type_image || normalized.room_image || '',
    checkIn,
    checkOut,
    adults: normalized.adults ?? 0,
    children: normalized.children ?? 0,
    infants: normalized.infants ?? 0,
    extraBedNeeded: normalized.extra_bed_needed === true,
    extraBedCount: normalized.extra_bed_count ?? 0,
    guest: {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: normalized.email || '',
      phone: normalized.phone || '',
      specialRequests: ''
    },
    guests: normalized.guests || [],
    nights,
    subtotal: normalized.subtotal ?? null,
    tax: normalized.tax ?? null,
    total: normalized.total_price ?? normalized.total ?? normalized.estimated_total ?? null,
    estimatedTotal: normalized.estimated_total ?? null,
    payment: normalized.payment_method || '',
    breakfast: normalized.breakfast || '',
    refundable: normalized.refundable !== false,
    createdAt: normalized.created_at || new Date().toISOString()
  };
}

/** Keep checkout cart display fields when API returns a minimal inquiry payload */
export function mergeBookingWithCheckoutData(checkoutData, apiBooking) {
  const cart = checkoutData.cart || checkoutData;
  return {
    ...apiBooking,
    ...checkoutData,
    id: apiBooking.id || checkoutData.id,
    status: apiBooking.status || checkoutData.status || 'new',
    hotelId: apiBooking.hotelId || checkoutData.hotelId || cart.hotelId || '',
    hotelName: apiBooking.hotelName || checkoutData.hotelName || cart.hotelName || '',
    hotelImage: checkoutData.hotelImage || cart.hotelImage || apiBooking.hotelImage || '',
    city: checkoutData.city || cart.city || apiBooking.city || '',
    roomId: apiBooking.roomId || checkoutData.roomId || cart.roomId || '',
    roomName: apiBooking.roomName || checkoutData.roomName || cart.roomName || '',
    roomImage: checkoutData.roomImage || cart.roomImage || apiBooking.roomImage || '',
    checkIn: apiBooking.checkIn || checkoutData.checkIn || cart.checkIn || '',
    checkOut: apiBooking.checkOut || checkoutData.checkOut || cart.checkOut || '',
    adults: apiBooking.adults ?? checkoutData.adults ?? cart.adults ?? 0,
    children: apiBooking.children ?? checkoutData.children ?? cart.children ?? 0,
    infants: apiBooking.infants ?? checkoutData.infants ?? cart.infants ?? 0,
    nights: apiBooking.nights ?? checkoutData.nights ?? cart.nights ?? 0,
    total: apiBooking.total ?? checkoutData.total ?? cart.stayTotal ?? null,
    estimatedTotal: apiBooking.estimatedTotal ?? checkoutData.estimatedTotal ?? cart.stayTotal ?? null,
    guest: {
      ...apiBooking.guest,
      ...(checkoutData.guest || {}),
      firstName: checkoutData.guest?.firstName || apiBooking.guest?.firstName || '',
      lastName: checkoutData.guest?.lastName || apiBooking.guest?.lastName || '',
      email: checkoutData.guest?.email || apiBooking.guest?.email || '',
      phone: checkoutData.guest?.phone || apiBooking.guest?.phone || ''
    },
    createdAt: apiBooking.createdAt || checkoutData.createdAt || new Date().toISOString()
  };
}

/** Admin table / dashboard mapping */
export function mapAdminBooking(api) {
  const base = mapBooking(api);
  const guestName =
    api.customer_name ||
    `${base.guest.firstName} ${base.guest.lastName}`.trim() ||
    'Guest';

  return {
    ...base,
    guestName,
    guestEmail: api.email || base.guest.email || '',
    guestPhone: api.phone || base.guest.phone || '',
    propertyName: base.hotelName,
    roomTypeName: base.roomName,
    source: api.source || 'platform'
  };
}

export function bookingStatusLabel(status) {
  return BOOKING_STATUS_OPTIONS.find((s) => s.value === status)?.label || status || '—';
}

export function bookingStatusBadgeClass(status) {
  switch (status) {
    case 'confirmed':
      return 'badge-confirmed';
    case 'cancelled':
      return 'badge-cancelled';
    case 'new':
      return 'badge-pending';
    default:
      return 'badge-type';
  }
}

export function calendarStatusClass(status) {
  switch (status) {
    case 'confirmed':
      return 'cal-confirmed';
    case 'new':
      return 'cal-new';
    case 'cancelled':
      return 'cal-cancelled';
    default:
      return 'cal-new';
  }
}

function adminBookingToCalendarApi(admin) {
  return {
    id: admin.apiId ?? admin.id,
    customer_name: admin.guestName,
    phone: admin.guestPhone,
    email: admin.guestEmail,
    property: admin.hotelId,
    property_name: admin.propertyName,
    room_type: admin.roomId,
    room_type_name: admin.roomTypeName,
    check_in: admin.checkIn,
    check_out: admin.checkOut,
    adults: admin.adults,
    children: admin.children,
    infants: admin.infants,
    extra_bed_needed: admin.extraBedNeeded,
    extra_bed_count: admin.extraBedCount,
    guests: admin.guests,
    estimated_total: admin.total,
    available_units_after_booking: admin.availableUnitsAfterBooking,
    status: admin.status,
    created_at: admin.createdAt,
    updated_at: admin.updatedAt
  };
}

/** Map GET /api/bookings/calendar/ item */
export function mapCalendarBooking(api) {
  const checkIn = normalizeDate(api.check_in || api.start_date || '');
  const checkOut = normalizeDate(api.check_out || api.end_date || '');

  return {
    id: String(api.id),
    customerName: api.customer_name || '',
    phone: api.phone || '',
    email: api.email || '',
    customerId: api.customer != null ? String(api.customer) : '',
    propertyId: resolveRelationId(api.property),
    propertyName: api.property_name || resolveRelationName(api.property) || '',
    roomTypeId: resolveRelationId(api.room_type),
    roomTypeName: api.room_type_name || resolveRelationName(api.room_type) || '',
    checkIn,
    checkOut,
    nights: api.nights ?? nightsBetween(checkIn, checkOut),
    adults: api.adults ?? 0,
    children: api.children ?? 0,
    infants: api.infants ?? 0,
    extraBedNeeded: api.extra_bed_needed === true,
    extraBedCount: api.extra_bed_count ?? 0,
    guests: api.guests || [],
    estimatedTotal: api.estimated_total ?? null,
    availableUnitsAfterBooking: api.available_units_after_booking ?? '',
    status: api.status || 'new',
    createdAt: api.created_at || '',
    updatedAt: api.updated_at || ''
  };
}

export function bookingCoversDay(booking, day) {
  if (!booking?.checkIn || !booking?.checkOut || booking.status === 'cancelled') return false;

  const checkIn = normalizeDate(booking.checkIn);
  const checkOut = normalizeDate(booking.checkOut);
  const d = normalizeDate(day);

  // Same-day stay (check_in === check_out): show that day as occupied
  if (checkIn === checkOut) return d === checkIn;

  // Standard hotel nights: inclusive check-in, exclusive check-out
  return d >= checkIn && d < checkOut;
}

/** Whether a booking overlaps the visible calendar range */
export function bookingOverlapsRange(booking, rangeStart, rangeEnd) {
  if (!booking?.checkIn || !booking?.checkOut || booking.status === 'cancelled') return false;

  const checkIn = normalizeDate(booking.checkIn);
  const checkOut = normalizeDate(booking.checkOut);
  const start = normalizeDate(rangeStart);
  const end = normalizeDate(rangeEnd);

  if (checkIn === checkOut) return checkIn >= start && checkIn <= end;

  return checkIn <= end && checkOut > start;
}

/** POST /api/bookings/ */
export async function createBooking(payload) {
  const data = await apiPost('/bookings/', { ...payload, status: payload.status || 'new' });
  return mapBooking(data);
}

/** POST /api/bookings/inquiry/ — guest booking inquiry */
export async function submitBookingInquiry(bookingData) {
  const payload = buildBookingInquiryPayload(bookingData);
  const guestError = validateBookingGuestList(payload.guests, payload);
  if (guestError) {
    const err = new Error(guestError);
    err.data = { guests: [guestError] };
    throw err;
  }

  const data = await apiPost('/bookings/inquiry/', payload);
  return mapBooking(data);
}

/** POST /api/bookings/confirm/ — staff confirms a booking */
export async function confirmBooking(bookingId) {
  const data = await apiPost('/bookings/confirm/', { booking_id: Number(bookingId) });
  return mapAdminBooking(data);
}

/** GET /api/bookings/ */
export async function fetchBookings() {
  const data = await apiGet('/bookings/');
  return parseList(data).map(mapBooking);
}

/** GET /api/bookings/ — admin list with optional filters */
export async function fetchAdminBookings({ propertyId, status } = {}) {
  const params = new URLSearchParams();
  if (propertyId) params.set('property', String(propertyId));
  if (status) params.set('status', status);
  const qs = params.toString();
  const path = qs ? `/bookings/?${qs}` : '/bookings/';
  const data = await apiGet(path);
  return parseList(data).map(mapAdminBooking);
}

/** GET /api/bookings/:id/ */
export async function fetchBookingById(id) {
  const data = await apiGet(`/bookings/${id}/`);
  return mapAdminBooking(data);
}

/** PATCH /api/bookings/:id/ */
export async function updateBooking(id, patch) {
  const data = await apiPatch(`/bookings/${id}/`, patch);
  return mapAdminBooking(data);
}

/** PATCH status only */
export async function updateBookingStatus(id, status) {
  return updateBooking(id, { status });
}

/** POST /api/bookings/{id}/cancel/ */
export async function cancelBookingById(id) {
  const data = await apiPost(`/bookings/${id}/cancel/`, {});
  return mapBooking(data);
}

/** DELETE /api/bookings/:id/ */
export async function deleteBooking(id) {
  return apiDelete(`/bookings/${id}/`);
}

function mergeCalendarBookings(primary, secondary) {
  const byId = new Map(primary.map((b) => [b.id, b]));

  secondary.forEach((b) => {
    const existing = byId.get(b.id);
    if (!existing || (!existing.checkIn && b.checkIn)) {
      byId.set(b.id, b);
    }
  });

  return Array.from(byId.values());
}

/** GET /api/bookings/calendar/ — merges /bookings/ as fallback for missing dates */
export async function fetchBookingsCalendar({
  propertyId,
  roomTypeId,
  startDate,
  endDate,
  dateFrom,
  dateTo
} = {}) {
  const from = dateFrom || startDate;
  const to = dateTo || endDate;
  const params = new URLSearchParams();
  if (propertyId) params.set('property', String(propertyId));
  if (roomTypeId) params.set('room_type', String(roomTypeId));
  if (from) params.set('date_from', from);
  if (to) params.set('date_to', to);
  const qs = params.toString();
  const path = qs ? `/bookings/calendar/?${qs}` : '/bookings/calendar/';
  const data = await apiGet(path);
  let list = parseList(data).map(mapCalendarBooking);

  const needsFallback =
    list.length === 0 ||
    list.some((b) => !b.checkIn || !b.checkOut);

  if (needsFallback && from && to) {
    try {
      const adminBookings = await fetchAdminBookings({ propertyId });
      const fallback = adminBookings
        .map(adminBookingToCalendarApi)
        .map(mapCalendarBooking)
        .filter((b) => bookingOverlapsRange(b, from, to));
      list = mergeCalendarBookings(list, fallback);
    } catch {
      /* keep calendar-only results */
    }
  }

  return list;
}

/** Load room cover images for bookings that don't have one yet. */
export async function enrichBookingsWithRoomImages(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) return [];

  const imageCache = new Map();

  return Promise.all(
    bookings.map(async (booking) => {
      if (booking.roomImage) return booking;

      const roomId = booking.roomId;
      if (!roomId) {
        return booking.hotelImage ? { ...booking, roomImage: booking.hotelImage } : booking;
      }

      if (!imageCache.has(roomId)) {
        try {
          const roomType = await fetchRoomTypeById(roomId);
          imageCache.set(roomId, getRoomTypeDisplayImage(roomType));
        } catch {
          imageCache.set(roomId, '');
        }
      }

      const roomImage = imageCache.get(roomId) || booking.hotelImage || '';
      return roomImage ? { ...booking, roomImage } : booking;
    })
  );
}
