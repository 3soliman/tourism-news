export const PRICING_TYPES = [
  { value: 'free', label: 'Free' },
  { value: 'fixed', label: 'Fixed price' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'per_person', label: 'Per person' }
];

export const CURRENCY_OPTIONS = ['USD'];

export const EMPTY_SERVICE_FORM = {
  property: '',
  category_id: '',
  name: '',
  name_ar: '',
  short_description: '',
  short_description_ar: '',
  description: '',
  description_ar: '',
  price: '',
  currency: 'USD',
  pricing_type: 'free',
  duration_minutes: '',
  available_from: '',
  available_until: '',
  advance_booking_required: false,
  is_featured: false,
  is_active: true
};

export const EMPTY_CATEGORY_FORM = {
  name: '',
  description: '',
  is_active: true
};
