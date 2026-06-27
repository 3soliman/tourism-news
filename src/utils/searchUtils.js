import { clampGuestField } from './guestLimits';

export const defaultSearch = {
  destination: '',
  checkIn: '',
  checkOut: '',
  adults: 2,
  children: 0,
  infants: 0,
  rooms: 1
};

export const parseSearchFromParams = (params) => ({
  destination: params.get('destination') || '',
  checkIn: params.get('checkIn') || '',
  checkOut: params.get('checkOut') || '',
  adults: clampGuestField('adults', Number(params.get('adults')) || 2),
  children: clampGuestField('children', Number(params.get('children')) || 0),
  infants: clampGuestField('infants', Number(params.get('infants')) || 0),
  rooms: clampGuestField('rooms', Number(params.get('rooms')) || 1)
});

export const searchToQueryString = (search) => {
  const p = new URLSearchParams();
  if (search.destination) p.set('destination', search.destination);
  if (search.checkIn) p.set('checkIn', search.checkIn);
  if (search.checkOut) p.set('checkOut', search.checkOut);
  p.set('adults', String(search.adults));
  p.set('children', String(search.children));
  p.set('infants', String(search.infants ?? 0));
  p.set('rooms', String(search.rooms));
  return p.toString();
};

export const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

export const filterHotels = (hotels, search, filters) => {
  let result = [...hotels];

  if (search.destination) {
    const q = search.destination.toLowerCase();
    result = result.filter(
      (h) =>
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q) ||
        String(h.nameAr || h.name_ar || '').toLowerCase().includes(q)
    );
  }

  if (filters.stars.length) {
    result = result.filter((h) => filters.stars.includes(h.stars));
  }

  if (filters.minPrice != null) {
    result = result.filter((h) => h.priceFrom != null && h.priceFrom >= filters.minPrice);
  }
  if (filters.maxPrice != null) {
    result = result.filter((h) => h.priceFrom != null && h.priceFrom <= filters.maxPrice);
  }

  if (filters.amenities.length) {
    result = result.filter((h) => filters.amenities.every((a) => h.amenities.includes(a)));
  }

  if (filters.breakfast.length) {
    result = result.filter((h) => filters.breakfast.includes(h.breakfast));
  }

  if (filters.types.length) {
    result = result.filter((h) => filters.types.includes(h.type));
  }

  return result;
};

export const sortHotels = (hotels, sortBy) => {
  const list = [...hotels];
  switch (sortBy) {
    case 'price-asc':
      return list.sort((a, b) => (a.priceFrom ?? 999999) - (b.priceFrom ?? 999999));
    case 'price-desc':
      return list.sort((a, b) => (b.priceFrom ?? 0) - (a.priceFrom ?? 0));
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating);
    case 'stars':
      return list.sort((a, b) => b.stars - a.stars);
    case 'popularity':
    default:
      return list.sort((a, b) => b.popularity - a.popularity);
  }
};

export const calcBookingTotal = (roomPrice, nights, taxRate = 0, stayTotal = null) => {
  const subtotal =
    stayTotal != null && Number.isFinite(Number(stayTotal))
      ? Number(stayTotal)
      : roomPrice * nights;
  const tax = taxRate > 0 ? Math.round(subtotal * taxRate) : 0;
  return { subtotal, tax, total: subtotal + tax, nights };
};

/** Client-side filter for guest room list (name, description, capacity, etc.) */
export function filterGuestRooms(rooms, query, { minGuests = 0, breakfastOnly = false } = {}) {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];

  const q = String(query || '').trim().toLowerCase();
  const minCap = Number(minGuests) || 0;

  return rooms.filter((room) => {
    if (breakfastOnly && !String(room.breakfast || '').toLowerCase().includes('included')) {
      return false;
    }

    const capacity = Number(room.capacity) || Number(room.maxAdults) || 0;
    if (minCap > 0 && capacity < minCap) return false;

    if (!q) return true;

    const haystack = [
      room.name,
      room.nameAr,
      room.name_ar,
      room.description,
      room.descriptionAr,
      room.description_ar,
      room.breakfast,
      room.size,
      room.bed,
      room.currency,
      room.price != null ? String(room.price) : '',
      room.capacity != null ? String(room.capacity) : '',
      room.maxAdults != null ? String(room.maxAdults) : '',
      room.maxChildren != null ? String(room.maxChildren) : ''
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}
