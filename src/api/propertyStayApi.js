import { apiGet } from './client';
import { fetchPropertyAvailability } from './propertiesApi';
import { nightsBetween } from '../utils/searchUtils';

function eachNightDates(checkIn, checkOut) {
  if (!checkIn || !checkOut) return [];
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return [];

  const nights = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return nights;
}

function priceForNight(date, basePrice, seasonalPrices = []) {
  const match = seasonalPrices.find((season) => {
    const start = season.start_date || season.startDate;
    const end = season.end_date || season.endDate;
    return start && end && date >= start && date <= end;
  });
  if (match) {
    const seasonal = Number(match.price_per_night ?? match.pricePerNight);
    if (Number.isFinite(seasonal) && seasonal > 0) return seasonal;
  }
  return Number(basePrice) || 0;
}

function sumNightlyPrices(nightlyPrices) {
  return nightlyPrices.reduce((total, night) => total + (Number(night.price) || 0), 0);
}

export function resolveStayPriceTotal(rate, { roomPrice = 0, nights = 1, pricePerNight = null } = {}) {
  if (rate?.baseTotal > 0) return rate.baseTotal;
  if (rate?.nightlyPrices?.length) {
    const nightlyTotal = sumNightlyPrices(rate.nightlyPrices);
    if (nightlyTotal > 0) return nightlyTotal;
  }
  const unitNight = Number(pricePerNight);
  if (Number.isFinite(unitNight) && unitNight > 0 && nights > 0) return unitNight * nights;
  const fallbackNight = Number(roomPrice) || 0;
  return fallbackNight * (nights > 0 ? nights : 1);
}

export function resolveStayPricePerNight(rate, { roomPrice = 0, nights = 1, pricePerNight = null } = {}) {
  const total = resolveStayPriceTotal(rate, { roomPrice, nights, pricePerNight });
  if (rate?.nightlyPrices?.length === 1) {
    return Number(rate.nightlyPrices[0].price) || total / nights;
  }
  if (nights > 0 && total > 0) return total / nights;
  return Number(roomPrice) || Number(pricePerNight) || 0;
}

function mapAvailabilityUnit(unit) {
  const roomTypeId = String(unit.id ?? unit.room_type_id ?? '');
  return {
    roomTypeId,
    name: unit.name || '',
    totalUnits: Number(unit.total_units ?? 0),
    bookedUnits: unit.booked_units ?? 0,
    blockedUnits: unit.blocked_units ?? 0,
    availableUnits: Number(unit.available_units ?? 0),
    isAvailable: unit.is_available !== false,
    maxAdults: unit.max_adults ?? null,
    maxChildren: unit.max_children ?? 0,
    pricePerNight: Number(unit.price_per_night ?? unit.base_price) || null,
    currency: unit.currency || ''
  };
}

/** Map GET /api/properties/:id/availability/ */
export function mapPropertyAvailabilityResponse(api) {
  const units = (api?.units || []).map(mapAvailabilityUnit);
  const byRoomId = Object.fromEntries(units.map((unit) => [unit.roomTypeId, unit]));

  return {
    propertyId: String(api?.property_id ?? api?.property ?? ''),
    propertyName: api?.property_name || '',
    checkIn: api?.check_in || '',
    checkOut: api?.check_out || '',
    isAvailable: api?.is_available !== false,
    units,
    byRoomId,
    availableRooms: (api?.available_rooms || []).map((room) => ({
      roomTypeId: String(room.room_type_id),
      name: room.name || '',
      availableUnits: room.available_units ?? 0,
      maxAdults: room.max_adults ?? null,
      maxChildren: room.max_children ?? 0,
      pricePerNight: Number(room.price_per_night ?? room.base_price) || null,
      currency: room.currency || ''
    }))
  };
}

function mapRateEntry(entry, checkIn, checkOut) {
  const roomTypeId = String(entry.room_type_id ?? entry.id ?? '');
  const currency = entry.currency || 'USD';
  const basePrice = Number(entry.base_price ?? entry.basePrice) || 0;
  const extraBedPricePerNight =
    Number(entry.extra_bed_price_per_night ?? entry.extra_bed_price ?? entry.extraBedPrice) || 0;
  const nights = nightsBetween(checkIn, checkOut);

  let nightlyPrices = (entry.nightly_prices || []).map((night) => ({
    date: night.date,
    price: Number(night.price) || 0
  }));

  if (!nightlyPrices.length && checkIn && checkOut) {
    nightlyPrices = eachNightDates(checkIn, checkOut).map((date) => ({
      date,
      price: priceForNight(date, basePrice, entry.seasonal_prices || [])
    }));
  }

  const nightlyTotal = sumNightlyPrices(nightlyPrices);
  const explicitTotal = Number(entry.base_total);
  const baseTotal =
    Number.isFinite(explicitTotal) && explicitTotal > 0
      ? explicitTotal
      : nightlyTotal > 0
        ? nightlyTotal
        : basePrice > 0 && nights > 0
          ? basePrice * nights
          : 0;

  return {
    roomTypeId,
    nightlyPrices,
    extraBedPricePerNight,
    currency,
    baseTotal,
    basePricePerNight: basePrice
  };
}

/** Map GET /api/properties/:id/rates/ */
export function mapPropertyRatesResponse(api) {
  const checkIn = api?.check_in || api?.checkIn || '';
  const checkOut = api?.check_out || api?.checkOut || '';
  const rates = (api?.rates || []).map((entry) => mapRateEntry(entry, checkIn, checkOut));
  return {
    propertyId: String(api?.property_id ?? ''),
    checkIn: api?.check_in || '',
    checkOut: api?.check_out || '',
    rates,
    byRoomId: Object.fromEntries(rates.map((rate) => [rate.roomTypeId, rate]))
  };
}

/** GET /api/properties/:id/availability/ */
export async function fetchMappedPropertyAvailability(params) {
  const data = await fetchPropertyAvailability(params);
  return mapPropertyAvailabilityResponse(data);
}

/** GET /api/properties/:id/rates/ */
export async function fetchPropertyRates(propertyId, checkIn, checkOut, { force = false } = {}) {
  const query = new URLSearchParams({
    check_in: checkIn,
    check_out: checkOut
  });
  const data = await apiGet(`/properties/${propertyId}/rates/?${query}`, { force });
  return mapPropertyRatesResponse({
    ...data,
    check_in: data?.check_in || checkIn,
    check_out: data?.check_out || checkOut
  });
}
