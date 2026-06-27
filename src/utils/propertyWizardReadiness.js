import { POLICY_FIELDS } from '../constants/propertyPolicyTemplates';

const CONTACT_FIELDS = ['phone', 'email', 'website', 'primary_contact_person', 'emergency_contact_number'];
const POLICY_EN_FIELDS = ['check_in_time', 'check_out_time', ...POLICY_FIELDS.map((f) => f.key)];

function countFilled(values, fields) {
  return fields.filter((f) => String(values[f] || '').trim()).length;
}

export function isIdentityStepComplete(values) {
  return Boolean(
    values.name?.trim()
    && values.property_type
    && Number(values.stars) >= 1
    && Number(values.stars) <= 5
  );
}

export function isLocationStepComplete(values) {
  return Boolean(values.country?.trim() && values.city?.trim() && values.address?.trim());
}

export function isPhotosStepComplete(photoCount) {
  return photoCount > 0;
}

export function isAmenitiesStepComplete(amenityCount) {
  return amenityCount > 0;
}

export function isContactStepComplete(values) {
  return countFilled(values, CONTACT_FIELDS) > 0;
}

export function isPoliciesStepComplete(values) {
  return countFilled(values, POLICY_EN_FIELDS) > 0;
}

/** Seven wizard steps — steps 5–6 are optional for publishing */
export function getWizardReadinessItems(values, photoCount = 0, amenityCount = 0) {
  return [
    {
      id: 1,
      labelKey: 'checkStepIdentity',
      labelDefault: 'Basic identity',
      required: true,
      done: isIdentityStepComplete(values),
    },
    {
      id: 2,
      labelKey: 'checkStepLocation',
      labelDefault: 'Location',
      required: true,
      done: isLocationStepComplete(values),
    },
    {
      id: 3,
      labelKey: 'checkStepPhotos',
      labelDefault: 'Photos & video',
      required: true,
      done: isPhotosStepComplete(photoCount),
    },
    {
      id: 4,
      labelKey: 'checkStepAmenities',
      labelDefault: 'Amenities',
      required: true,
      done: isAmenitiesStepComplete(amenityCount),
    },
    {
      id: 5,
      labelKey: 'checkStepContact',
      labelDefault: 'Contact',
      required: false,
      done: isContactStepComplete(values),
    },
    {
      id: 6,
      labelKey: 'checkStepPolicies',
      labelDefault: 'Policies',
      required: false,
      done: isPoliciesStepComplete(values),
    },
    {
      id: 7,
      labelKey: 'checkStepReview',
      labelDefault: 'Review & publish',
      required: false,
      done: true,
    },
  ];
}

export function computePublishReadiness(values, photoCount = 0, amenityCount = 0) {
  const items = getWizardReadinessItems(values, photoCount, amenityCount);
  const required = items.filter((item) => item.required);
  const done = required.filter((item) => item.done).length;
  const total = required.length;
  return {
    items,
    requiredDone: done,
    requiredTotal: total,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}
