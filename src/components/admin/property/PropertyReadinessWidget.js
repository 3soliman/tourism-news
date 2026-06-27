import React from 'react';
import Icon from '../../icons/Icon';

const PropertyReadinessWidget = ({ items = [], title = 'Property readiness', percentage: suppliedPercentage }) => {
  const completed = items.filter((item) => item.complete).length;
  const percentage = suppliedPercentage ?? (items.length ? Math.round((completed / items.length) * 100) : 0);

  return (
    <aside className="property-readiness-widget" aria-label={title}>
      <div className="property-readiness-widget__head">
        <div>
          <span className="property-readiness-widget__label">{title}</span>
          <strong>{percentage}% complete</strong>
        </div>
        <div className="property-readiness-widget__meter" aria-hidden="true">
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>

      <ul className="property-readiness-list">
        {items.map((item) => (
          <li key={item.id} className={item.complete ? 'is-complete' : 'is-missing'}>
            <Icon name={item.complete ? 'check' : 'clock'} size={15} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default PropertyReadinessWidget;
