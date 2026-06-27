/** Workspace sections for add/edit property form */
export const HOTEL_FORM_STEPS = [
  {
    id: 1,
    key: 'basic',
    title: 'General',
    subtitle: 'Property name, type, contact details, and description',
    icon: 'building-2'
  },
  {
    id: 2,
    key: 'location',
    title: 'Location',
    subtitle: 'Pick a spot on the map — address fills in automatically',
    icon: 'map-pin'
  },
  {
    id: 3,
    key: 'online_presence',
    title: 'Online Presence',
    subtitle: 'Social media links and property contacts',
    icon: 'share-2'
  },
  {
    id: 4,
    key: 'images',
    title: 'Photos',
    subtitle: 'Upload gallery photos and choose a cover image',
    icon: 'upload'
  },
  {
    id: 5,
    key: 'services',
    title: 'Amenities',
    subtitle: 'Select amenities guests can filter and compare',
    icon: 'check'
  },
  {
    id: 6,
    key: 'property_services',
    title: 'Services',
    subtitle: 'Assign guest services offered by this property',
    icon: 'wallet'
  },
  {
    id: 7,
    key: 'rooms',
    title: 'Rooms',
    subtitle: 'Review room setup required before publishing',
    icon: 'bed-double'
  },
  {
    id: 8,
    key: 'policies',
    title: 'Policies',
    subtitle: 'Set guest rules shown before booking',
    icon: 'clipboard-list'
  },
  {
    id: 9,
    key: 'channel_manager',
    title: 'Channel Manager',
    subtitle: 'Connect an OTA channel manager to sync rates and availability',
    icon: 'radio'
  },
  {
    id: 10,
    key: 'publishing',
    title: 'Publishing',
    subtitle: 'Check readiness and preview the guest listing',
    icon: 'eye'
  }
];

export const TOTAL_STEPS = HOTEL_FORM_STEPS.length;
