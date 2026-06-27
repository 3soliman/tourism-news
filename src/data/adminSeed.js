import { getHotelById } from './mockHotels';

const hotel = getHotelById('h1');

/** Demo property managed by the hotel owner */
export const OWNER_PROPERTY_ID = 'h1';
// export const OWNER_PROPERTY_NAME = hotel?.name || 'Grand Luxury Suites';

const buildUnits = (roomId, prefix, count, statuses) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${roomId}-u${i + 1}`,
    number: `${prefix}${101 + i}`,
    status: statuses[i] || 'available'
  }));

export const defaultAdminRooms = (hotel?.rooms || []).map((r, idx) => ({
  ...r,
  quantity: idx === 0 ? 3 : idx === 1 ? 2 : 1,
  units: buildUnits(
    r.id,
    idx === 0 ? 'D' : idx === 1 ? 'E' : 'P',
    idx === 0 ? 3 : idx === 1 ? 2 : 1,
    idx === 0 ? ['booked', 'available', 'maintenance'] : ['available', 'booked']
  ),
  active: true
}));

export const defaultPricingRules = [
  {
    id: 'pr1',
    type: 'season',
    label: 'Summer high season',
    adjustment: 1.25,
    dateFrom: '2025-06-01',
    dateTo: '2025-08-31',
    roomIds: []
  },
  {
    id: 'pr2',
    type: 'holiday',
    label: 'New Year',
    adjustment: 1.4,
    dateFrom: '2025-12-28',
    dateTo: '2026-01-02',
    roomIds: []
  },
  {
    id: 'pr3',
    type: 'weekday',
    label: 'Weekend premium',
    adjustment: 1.15,
    weekdays: [5, 6],
    roomIds: []
  },
  {
    id: 'pr4',
    type: 'corporate',
    label: 'Travel agency — Horizon Tours',
    adjustment: 0.85,
    partner: 'Horizon Tours',
    roomIds: []
  }
];

export const seedAdminBookings = [
  {
    id: 'adm-b1',
    guestName: 'John Smith',
    guestEmail: 'john@example.com',
    roomId: 'r1',
    roomName: 'Deluxe King Room',
    unitId: 'r1-u1',
    unitNumber: 'D101',
    checkIn: '2025-05-25',
    checkOut: '2025-05-28',
    total: 987,
    status: 'confirmed',
    source: 'platform'
  },
  {
    id: 'adm-b2',
    guestName: 'Maria Garcia',
    guestEmail: 'maria@example.com',
    roomId: 'r2',
    roomName: 'Executive Suite',
    unitId: 'r2-u2',
    unitNumber: 'E102',
    checkIn: '2025-05-22',
    checkOut: '2025-05-24',
    total: 918,
    status: 'pending',
    source: 'platform'
  },
  {
    id: 'adm-b3',
    guestName: 'Corporate — Horizon Tours',
    guestEmail: 'bookings@horizontours.com',
    roomId: 'r1',
    roomName: 'Deluxe King Room',
    unitId: 'r1-u2',
    unitNumber: 'D102',
    checkIn: '2025-06-10',
    checkOut: '2025-06-15',
    total: 1270,
    status: 'confirmed',
    source: 'corporate'
  }
];
