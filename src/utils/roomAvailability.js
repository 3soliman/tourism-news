/**
 * Badge for room availability on guest hotel detail.
 *
 * Urgency labels ("Only 1 room left") are shown only when remaining units for the
 * stay are below total inventory (API sent booked/blocked counts, or available < total).
 * The backend often returns available_units === total_units (static inventory), which
 * must not be shown as scarcity — e.g. a room type with 1 physical unit is not "1 left".
 */
export function getAvailabilityBadge(availableUnits, isAvailable = true, { totalUnits } = {}) {
  if (isAvailable === false) {
    return {
      key: 'sold-out',
      label: 'Sold out',
      className: 'room-badge room-badge--sold-out',
      bookable: false
    };
  }

  const count = Number(availableUnits);
  if (!Number.isFinite(count) || count <= 0) {
    return {
      key: 'sold-out',
      label: 'Sold out',
      className: 'room-badge room-badge--sold-out',
      bookable: false
    };
  }

  const total = Number(totalUnits);
  const hasInventoryContext = Number.isFinite(total) && total > 0;
  const remainingForStay = hasInventoryContext ? count < total : false;

  if (!remainingForStay) {
    return null;
  }

  if (count === 1) {
    return {
      key: 'last-one',
      label: 'Only 1 room left',
      className: 'room-badge room-badge--urgent',
      bookable: true
    };
  }

  if (count === 2 || count === 3) {
    return {
      key: 'few-left',
      label: 'Few rooms left',
      className: 'room-badge room-badge--few',
      bookable: true
    };
  }

  return {
    key: 'available',
    label: 'Available',
    className: 'room-badge room-badge--available',
    bookable: true
  };
}

export function formatMoney(amount, currency = '') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatStayDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
