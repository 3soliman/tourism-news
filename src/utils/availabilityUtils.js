/** YYYY-MM-DD from API date or datetime string */
export function normalizeDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${month}-${day}`;
}

/** Occupied nights for a stay (check-out day excluded). */
export function eachStayNight(checkIn, checkOut) {
  const start = normalizeDate(checkIn);
  const end = normalizeDate(checkOut);
  if (!start || !end) return [];
  if (start === end) return [start];

  const nights = [];
  let day = start;
  while (day < end) {
    nights.push(day);
    day = addDaysStr(day, 1);
  }
  return nights;
}

/** Whether a calendar day falls inside an inclusive block range. */
export function dayInInclusiveRange(day, rangeStart, rangeEnd) {
  const d = normalizeDate(day);
  const start = normalizeDate(rangeStart);
  const end = normalizeDate(rangeEnd);
  if (!d || !start || !end) return false;
  return d >= start && d <= end;
}

/**
 * Whether a stay overlaps an availability block.
 * Stay uses hotel semantics: check-in inclusive, check-out exclusive.
 */
export function stayOverlapsBlock(checkIn, checkOut, blockStart, blockEnd) {
  const nights = eachStayNight(checkIn, checkOut);
  return nights.some((night) => dayInInclusiveRange(night, blockStart, blockEnd));
}

/**
 * Returns conflict info when active blocks leave no units available.
 * blocked_units >= total_units on any stay night => unavailable.
 */
export function getAvailabilityBlockConflict(blocks, checkIn, checkOut, totalUnits = 1) {
  const activeBlocks = (blocks || []).filter((b) => b.isActive !== false);
  if (!activeBlocks.length) return null;

  const nights = eachStayNight(checkIn, checkOut);
  if (!nights.length) return null;

  const units = Math.max(1, Number(totalUnits) || 1);

  for (const night of nights) {
    const covering = activeBlocks.filter((b) =>
      dayInInclusiveRange(night, b.startDate, b.endDate)
    );
    if (!covering.length) continue;

    const blockedUnits = Math.max(...covering.map((b) => Number(b.blockedUnits) || 0));
    if (blockedUnits >= units) {
      return {
        night,
        blockedUnits,
        totalUnits: units,
        blocks: covering
      };
    }
  }

  return null;
}

export function formatAvailabilityBlockMessage(conflict, { locale = 'en' } = {}) {
  if (!conflict) return '';

  const reasonLabels = {
    maintenance: locale === 'ar' ? 'صيانة' : 'maintenance',
    renovation: locale === 'ar' ? 'تجديد' : 'renovation',
    owner_use: locale === 'ar' ? 'استخدام المالك' : 'owner use',
    other: locale === 'ar' ? 'سبب آخر' : 'other'
  };

  const primary = conflict.blocks[0];
  const reason = reasonLabels[primary?.reason] || primary?.reason || (locale === 'ar' ? 'غير متاح' : 'unavailable');
  const range =
    primary?.startDate === primary?.endDate
      ? primary?.startDate
      : `${primary?.startDate} → ${primary?.endDate}`;

  if (locale === 'ar') {
    return `هذا النوع من الغرف غير متاح في ${conflict.night} بسبب ${reason} (${range}).`;
  }

  return `This room type is unavailable on ${conflict.night} due to ${reason} (${range}).`;
}

export const BLOCKING_BOOKING_STATUSES = new Set(['new', 'contacted', 'confirmed']);

/** Hotel stay overlap: check-in inclusive, check-out exclusive. */
export function staysOverlap(checkInA, checkOutA, checkInB, checkOutB) {
  const aIn = normalizeDate(checkInA);
  const aOut = normalizeDate(checkOutA);
  const bIn = normalizeDate(checkInB);
  const bOut = normalizeDate(checkOutB);
  if (!aIn || !aOut || !bIn || !bOut) return false;
  return aIn < bOut && aOut > bIn;
}

function resolveBookingRoomTypeId(booking) {
  return booking?.roomId || booking?.roomTypeId || '';
}

export function countOverlappingBookings({
  bookings,
  roomTypeId,
  checkIn,
  checkOut,
  excludeBookingId
}) {
  return (bookings || []).filter((booking) => {
    if (excludeBookingId && String(booking.id) === String(excludeBookingId)) return false;
    if (booking.status === 'cancelled') return false;
    if (!BLOCKING_BOOKING_STATUSES.has(booking.status || 'new')) return false;
    if (String(resolveBookingRoomTypeId(booking)) !== String(roomTypeId)) return false;
    return staysOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut);
  }).length;
}

export function getBookingConflictForStay({
  bookings,
  roomTypeId,
  checkIn,
  checkOut,
  totalUnits = 1,
  excludeBookingId
}) {
  const overlappingCount = countOverlappingBookings({
    bookings,
    roomTypeId,
    checkIn,
    checkOut,
    excludeBookingId
  });
  const units = Math.max(1, Number(totalUnits) || 1);

  if (overlappingCount >= units) {
    return {
      overlappingCount,
      totalUnits: units,
      checkIn: normalizeDate(checkIn),
      checkOut: normalizeDate(checkOut)
    };
  }

  return null;
}

export function formatBookingConflictMessage(conflict, { locale = 'en' } = {}) {
  if (!conflict) return '';

  if (locale === 'ar') {
    return `هذه الغرفة محجوزة بالفعل للتواريخ ${conflict.checkIn} → ${conflict.checkOut}.`;
  }

  return `This room is already booked for ${conflict.checkIn} → ${conflict.checkOut}.`;
}
