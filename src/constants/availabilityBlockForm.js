export const BLOCK_REASON_OPTIONS = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'owner_use', label: 'Owner use' },
  { value: 'other', label: 'Other' }
];

export const EMPTY_AVAILABILITY_BLOCK_FORM = {
  room_type: '',
  start_date: '',
  end_date: '',
  blocked_units: '1',
  reason: 'maintenance',
  notes: '',
  is_active: true
};

export function blockReasonLabel(value) {
  return BLOCK_REASON_OPTIONS.find((o) => o.value === value)?.label || value || '—';
}
