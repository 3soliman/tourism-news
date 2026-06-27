import React from 'react';
import Icon from '../../icons/Icon';

const PropertyWorkspaceNav = ({ sections, activeSection, onSectionChange, sectionStatus = {} }) => (
  <nav className="property-workspace-nav" aria-label="Property setup sections">
    {sections.map((section) => {
      const active = activeSection === section.id;
      const complete = sectionStatus[section.id] === 'complete';
      return (
        <button
          key={section.id}
          type="button"
          className={`property-workspace-nav__item${active ? ' is-active' : ''}`}
          onClick={() => onSectionChange(section.id)}
          aria-current={active ? 'step' : undefined}
        >
          <Icon name={section.icon} size={17} />
          <span>{section.label}</span>
          {complete && <Icon name="check" size={14} className="property-workspace-nav__check" />}
        </button>
      );
    })}
  </nav>
);

export default PropertyWorkspaceNav;
