import React from 'react';

/**
 * Grouped block inside the add/edit property wizard.
 */
const HotelFormFieldGroup = ({ title, hint, children, className = '' }) => (
  <section className={`hotel-form-field-group ${className}`.trim()}>
    {title && <h4 className="hotel-form-field-group-title">{title}</h4>}
    {hint && <p className="hotel-form-field-group-hint">{hint}</p>}
    {children}
  </section>
);

export default HotelFormFieldGroup;
