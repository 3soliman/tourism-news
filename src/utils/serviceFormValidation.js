import { EMPTY_SERVICE_FORM } from '../constants/serviceForm';

export function validatePropertyServiceForm(form, { requireProperty = false } = {}) {
  const errors = {};
  if (requireProperty && !form.property) errors.property = 'Property is required';
  if (!form.category_id) errors.category_id = 'Category is required';
  if (!form.name?.trim()) errors.name = 'Name is required';
  if (form.pricing_type !== 'free' && !String(form.price ?? '').trim()) {
    errors.price = 'Price is required for paid services';
  }
  return errors;
}

export function isPropertyServiceFormValid(form, options) {
  return Object.keys(validatePropertyServiceForm(form, options)).length === 0;
}

export function createEmptyWizardServiceForm(overrides = {}) {
  return {
    ...EMPTY_SERVICE_FORM,
    property: '',
    ...overrides
  };
}

export function stripPropertyFromServiceForm(form) {
  const { property, ...rest } = form;
  return rest;
}
