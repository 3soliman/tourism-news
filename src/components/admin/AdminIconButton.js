import React from 'react';
import { Link } from '@/lib/router-compat';
import Icon from '../icons/Icon';

/**
 * Compact icon-only admin action button (table rows, toolbars).
 * Always provide `label` for accessibility (title + aria-label).
 */
const AdminIconButton = ({
  icon,
  label,
  variant = 'default',
  loading = false,
  disabled,
  className = '',
  to,
  href,
  target,
  rel,
  onClick,
  type = 'button'
}) => {
  const iconName = loading ? 'loader' : icon;
  const classes = [
    'admin-icon-btn',
    variant !== 'default' && `admin-icon-btn--${variant}`,
    loading && 'admin-icon-btn--loading',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const content = <Icon name={iconName} size={16} />;

  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        title={label}
        aria-label={label}
        target={target}
        rel={rel}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        title={label}
        aria-label={label}
        target={target}
        rel={rel}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      title={label}
      aria-label={label}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {content}
    </button>
  );
};

export default AdminIconButton;
