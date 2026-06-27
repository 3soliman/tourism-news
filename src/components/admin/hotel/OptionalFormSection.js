'use client';

import React, { useState } from 'react';
import Icon from '../../icons/Icon';

export default function OptionalFormSection({
  title,
  subtitle,
  badge = 'Optional',
  fieldCount,
  isComplete = false,
  defaultOpen = false,
  children
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`hotel-optional-section${open ? ' is-open' : ''}${isComplete ? ' is-complete' : ''}`}>
      <button type="button" className="hotel-optional-section__toggle" onClick={() => setOpen(!open)}>
        <Icon name="chevron-right" size={16} className="hotel-optional-section__chevron" />
        <span className="hotel-optional-section__copy">
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        <span className="hotel-optional-section__meta">
          {fieldCount != null && <span className="hotel-optional-section__count">{fieldCount}</span>}
          <span className="hotel-optional-section__badge">{badge}</span>
          {isComplete && (
            <span className="hotel-optional-section__done" aria-label="Complete">
              <Icon name="check" size={14} />
            </span>
          )}
        </span>
      </button>
      {open && <div className="hotel-optional-section__body">{children}</div>}
    </div>
  );
}
