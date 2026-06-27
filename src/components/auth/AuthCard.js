import React from 'react';
import BrandLogo from '../shared/BrandLogo';

const AuthCard = ({ title, subtitle, children, footer, brandAction = null }) => (
  <article className="auth-card" aria-labelledby="auth-card-title">
    <div className="auth-card__brand">
      <BrandLogo variant="full" size="sm" />
      {brandAction ? <div className="auth-card__brand-action">{brandAction}</div> : null}
    </div>

    <header className="auth-card__header">
      <h2 id="auth-card-title">{title}</h2>
      <p>{subtitle}</p>
    </header>

    {children}

    {footer ? <div className="auth-card__footer">{footer}</div> : null}
  </article>
);

export default AuthCard;
