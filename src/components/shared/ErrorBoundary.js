'use client';

import React from 'react';
import Icon from '../icons/Icon';
import { useTranslation } from '../../context/I18nContext';

const ErrorFallback = ({ onReset }) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        background: 'var(--bg-page, #f0f9ff)',
        fontFamily: 'var(--font-ui, DM Sans, system-ui, sans-serif)'
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '460px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: '#fef2f2',
            color: '#dc2626',
            marginBottom: '24px'
          }}
        >
          <Icon name="hotel" size={32} />
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, Outfit, system-ui, sans-serif)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-heading, #1e293b)',
            margin: '0 0 8px'
          }}
        >
          {t('errors.somethingWrong')}
        </h2>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-secondary, #64748b)',
            lineHeight: 1.5,
            margin: '0 0 24px'
          }}
        >
          {t('errors.unexpected')}
        </p>
        <button
          onClick={onReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            border: 'none',
            borderRadius: 'var(--button-radius, 10px)',
            background: 'var(--primary, #0ea5e9)',
            color: 'var(--text-on-primary, #ffffff)',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Icon name="refresh-cw" size={16} />
          {t('common.tryAgain')}
        </button>
      </div>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
