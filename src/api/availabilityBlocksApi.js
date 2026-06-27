import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import { resolveNextApiPath } from './pagination';
import { hasStoredAuth } from './authApi';
import { fetchPropertyAvailability } from './propertiesApi';
import { fetchBookingsCalendar, mapBooking } from './bookingsApi';
import {
  getAvailabilityBlockConflict,
  formatAvailabilityBlockMessage,
  getBookingConflictForStay,
  formatBookingConflictMessage
} from '../utils/availabilityUtils';

const BOOKINGS_STORAGE_KEY = 'almohit_bookings';

function parseList(data) {
  return Array.isArray(data) ? data : data.results || data.data || [];
}

async function fetchAllAvailabilityBlocks({ roomTypeId, force = false } = {}) {
  let path = roomTypeId
    ? `/availability-blocks/?room_type=${roomTypeId}`
    : '/availability-blocks/';
  const all = [];

  while (path) {
    const data = await apiGet(path, { force });
    all.push(...parseList(data).map(mapAvailabilityBlock));
    path = resolveNextApiPath(data.next);
    force = false;
  }

  return all;
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

export function mapAvailabilityBlock(api) {
  const roomTypeRaw = api.room_type ?? api.room_type_id;

  return {
    id: String(api.id),
    roomTypeId: resolveRelationId(roomTypeRaw),
    roomTypeName: api.room_type_name || resolveRelationName(roomTypeRaw) || '',
    startDate: (api.start_date || '').slice(0, 10),
    endDate: (api.end_date || '').slice(0, 10),
    blockedUnits: api.blocked_units ?? 1,
    reason: api.reason || '',
    notes: api.notes || '',
    isActive: api.is_active !== false,
    createdAt: api.created_at || '',
    updatedAt: api.updated_at || ''
  };
}

export function buildAvailabilityBlockPayload(form) {
  const roomTypeId = Number(form.room_type);

  return {
    room_type: roomTypeId,
    room_type_id: roomTypeId,
    start_date: form.start_date,
    end_date: form.end_date,
    blocked_units: Number(form.blocked_units) || 1,
    reason: form.reason || 'maintenance',
    notes: (form.notes || '').trim(),
    is_active: form.is_active !== false
  };
}

export function mapAvailabilityBlockToForm(item) {
  return {
    room_type: item.roomTypeId || '',
    start_date: item.startDate || '',
    end_date: item.endDate || '',
    blocked_units: String(item.blockedUnits ?? 1),
    reason: item.reason || 'maintenance',
    notes: item.notes || '',
    is_active: item.isActive
  };
}

/** GET /api/availability-blocks/ */
export async function fetchAvailabilityBlocks({ roomTypeId, force = false } = {}) {
  return fetchAllAvailabilityBlocks({ roomTypeId, force });
}

function readStoredBookings() {
  try {
    const saved = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeBookingsById(...lists) {
  const byId = new Map();
  lists.flat().forEach((booking) => {
    if (booking?.id != null) byId.set(String(booking.id), booking);
  });
  return Array.from(byId.values());
}

function calendarBookingToAvailabilityEntry(booking) {
  return {
    id: booking.id,
    roomId: booking.roomTypeId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status
  };
}

async function loadBookingsForAvailability({
  propertyId,
  roomTypeId,
  checkIn,
  checkOut,
  knownBookings = [],
  isStaff = false
}) {
  let remoteBookings = [];

  if (hasStoredAuth()) {
    try {
      const params = new URLSearchParams();
      if (propertyId) params.set('property', String(propertyId));
      if (roomTypeId) params.set('room_type', String(roomTypeId));
      params.set('date_from', checkIn);
      params.set('date_to', checkOut);
      const data = await apiGet(`/bookings/?${params}`);
      remoteBookings = parseList(data).map(mapBooking);
    } catch {
      // Guest users cannot list bookings from the API.
    }

    if (isStaff) {
      try {
        const calendarBookings = await fetchBookingsCalendar({
          propertyId,
          roomTypeId,
          startDate: checkIn,
          endDate: checkOut
        });
        remoteBookings = mergeBookingsById(
          remoteBookings,
          calendarBookings.map(calendarBookingToAvailabilityEntry)
        );
      } catch {
        // Keep API bookings when calendar access fails.
      }
    }
  }

  return mergeBookingsById(knownBookings, readStoredBookings(), remoteBookings);
}

/** Validate a guest stay against bookings, blocks, and property availability. */
export async function checkRoomAvailabilityForStay({
  propertyId,
  roomTypeId,
  checkIn,
  checkOut,
  totalUnits = 1,
  adults,
  children,
  knownBookings = [],
  isStaff = false,
  excludeBookingId
}) {
  if (!roomTypeId || !checkIn || !checkOut) {
    return { available: true };
  }

  const bookings = await loadBookingsForAvailability({
    propertyId,
    roomTypeId,
    checkIn,
    checkOut,
    knownBookings,
    isStaff
  });

  const bookingConflict = getBookingConflictForStay({
    bookings,
    roomTypeId,
    checkIn,
    checkOut,
    totalUnits,
    excludeBookingId
  });

  if (bookingConflict) {
    return {
      available: false,
      message: formatBookingConflictMessage(bookingConflict),
      conflict: bookingConflict
    };
  }

  let blocks = [];
  if (isStaff) {
    try {
      blocks = await fetchAvailabilityBlocks({ roomTypeId });
    } catch {
      // Staff block lookup failed — continue with booking/availability checks.
    }
  }

  const blockConflict = getAvailabilityBlockConflict(blocks, checkIn, checkOut, totalUnits);

  if (blockConflict) {
    return {
      available: false,
      message: formatAvailabilityBlockMessage(blockConflict),
      conflict: blockConflict
    };
  }

  if (propertyId) {
    try {
      const data = await fetchPropertyAvailability({
        propertyId,
        checkIn,
        checkOut,
        adults,
        children,
        force: true
      });
      const unit = (data.units || []).find((entry) => String(entry.id) === String(roomTypeId));
      const availableUnits = unit?.available_units ?? 0;

      if (unit && (unit.is_available === false || availableUnits <= 0)) {
        return {
          available: false,
          availableUnits,
          message: 'This room is sold out for the selected dates.'
        };
      }

      if (unit) {
        return { available: true, availableUnits };
      }

      return {
        available: false,
        availableUnits: 0,
        message: 'This room is not available for the selected dates or guest count.'
      };
    } catch {
      // Fall back to blocks-only validation when the property API is unavailable.
    }
  }

  return { available: true };
}

/** GET /api/availability-blocks/:id/ */
export async function fetchAvailabilityBlockById(id, { force = false } = {}) {
  const data = await apiGet(`/availability-blocks/${id}/`, { force });
  return mapAvailabilityBlock(data);
}

/** POST /api/availability-blocks/ */
export async function createAvailabilityBlock(form) {
  const data = await apiPost('/availability-blocks/', buildAvailabilityBlockPayload(form));
  return mapAvailabilityBlock(data);
}

/** PATCH /api/availability-blocks/:id/ */
export async function updateAvailabilityBlock(id, form) {
  const data = await apiPatch(`/availability-blocks/${id}/`, buildAvailabilityBlockPayload(form));
  return mapAvailabilityBlock(data);
}

/** DELETE /api/availability-blocks/:id/ */
export async function deleteAvailabilityBlock(id) {
  return apiDelete(`/availability-blocks/${id}/`);
}
