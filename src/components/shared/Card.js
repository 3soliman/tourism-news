import React from 'react';

const Card = ({ title, children, className = '', icon }) => {
  return (
    <div className={`card ${className}`}>
      {title && (
        <h3>
          {icon && <span className="feature-icon">{icon}</span>}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Card;