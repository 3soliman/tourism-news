export const GUEST_LIMITS = {
  adults: { min: 1, max: 30 },
  children: { min: 0, max: 20 },
  infants: { min: 0, max: 10 },
  rooms: { min: 1, max: 15 }
};

export const clampGuestField = (field, value) => {
  const { min, max } = GUEST_LIMITS[field];
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
};
