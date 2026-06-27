export const UNIT_TYPE_OPTIONS = [
  { value: 'room', label: 'Room' },
  { value: 'suite', label: 'Suite' },
  { value: 'chalet', label: 'Chalet' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'other', label: 'Other' }
];

export const ROOM_CURRENCY_OPTIONS = ['USD'];

export const BED_TYPE_OPTIONS = [
  { value: '1_king', label: '1 King Bed' },
  { value: '1_queen', label: '1 Queen Bed' },
  { value: '2_double', label: '2 Double Beds' },
  { value: '1_double', label: '1 Double Bed' },
  { value: '2_twin', label: '2 Twin Beds' },
  { value: '1_twin', label: '1 Twin Bed' },
  { value: '1_king_1_sofa', label: '1 King + Sofa Bed' },
  { value: '1_queen_1_sofa', label: '1 Queen + Sofa Bed' },
  { value: 'bunk_beds', label: 'Bunk Beds' },
  { value: 'other', label: 'Other' }
];

export const ROOM_TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard Room',
    description: 'Compact and comfortable, ideal for solo travelers or couples.',
    defaults: {
      name: 'Standard Room',
      description: 'Comfortable room with essential amenities for a pleasant stay.',
      maxAdults: 2,
      maxChildren: 1,
      totalUnits: 10,
      basePrice: '',
      bedType: '1_queen',
      roomSize: '',
      smokingAllowed: false,
      extraBedAllowed: true,
      extraBedPrice: '',
      breakfastIncluded: false,
    },
  },
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    description: 'Larger room with upgraded furnishings and premium amenities.',
    defaults: {
      name: 'Deluxe Room',
      description: 'Spacious room with premium furnishings and upgraded amenities for a superior stay.',
      maxAdults: 2,
      maxChildren: 2,
      totalUnits: 5,
      basePrice: '',
      bedType: '1_king',
      roomSize: '',
      smokingAllowed: false,
      extraBedAllowed: true,
      extraBedPrice: '',
      breakfastIncluded: true,
    },
  },
  {
    id: 'suite',
    name: 'Suite',
    description: 'Separate living and sleeping areas for the ultimate experience.',
    defaults: {
      name: 'Suite',
      description: 'Luxurious suite with a separate living area, premium amenities, and exceptional comfort.',
      maxAdults: 3,
      maxChildren: 2,
      totalUnits: 3,
      basePrice: '',
      bedType: '1_king_1_sofa',
      roomSize: '',
      smokingAllowed: false,
      extraBedAllowed: true,
      extraBedPrice: '',
      breakfastIncluded: true,
    },
  },
  {
    id: 'family',
    name: 'Family Room',
    description: 'Spacious accommodation designed for families with children.',
    defaults: {
      name: 'Family Room',
      description: 'Generously sized room perfect for families, with space for everyone to relax.',
      maxAdults: 4,
      maxChildren: 3,
      totalUnits: 4,
      basePrice: '',
      bedType: '2_double',
      roomSize: '',
      smokingAllowed: false,
      extraBedAllowed: true,
      extraBedPrice: '',
      breakfastIncluded: false,
    },
  },
  {
    id: 'executive',
    name: 'Executive Room',
    description: 'Premium room with exclusive access and business amenities.',
    defaults: {
      name: 'Executive Room',
      description: 'Premium accommodation with exclusive lounge access and business amenities.',
      maxAdults: 2,
      maxChildren: 1,
      totalUnits: 3,
      basePrice: '',
      bedType: '1_king',
      roomSize: '',
      smokingAllowed: false,
      extraBedAllowed: false,
      extraBedPrice: 0,
      breakfastIncluded: true,
    },
  },
];

export const EMPTY_SEASON_PRICE = {
  id: null,
  season_name: '',
  start_date: '',
  end_date: '',
  price_per_night: ''
};

export const EMPTY_ROOM_TYPE_FORM = {
  property: '',
  name: '',
  name_ar: '',
  unit_type: 'room',
  description: '',
  description_ar: '',
  max_adults: '2',
  max_children: '0',
  total_units: '1',
  base_price: '',
  weekend_price: '',
  pricing_mode: 'per_night',
  currency: 'USD',
  bed_type: '1_king',
  room_size: '',
  smoking_allowed: false,
  extra_bed_allowed: false,
  extra_bed_price: '',
  breakfast_included: false,
  amenity_ids: [],
  is_active: true,
  prices: []
};

export const DEFAULT_BED_TYPE = '1_king';

export function normalizeBedType(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return DEFAULT_BED_TYPE;
  return BED_TYPE_OPTIONS.some((option) => option.value === trimmed) ? trimmed : DEFAULT_BED_TYPE;
}

export function unitTypeLabel(value) {
  return UNIT_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || 'Room';
}

export function bedTypeLabel(value) {
  return BED_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || '';
}
