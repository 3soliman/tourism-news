'use client';

import React, { useEffect } from 'react';
import { useTranslation } from '../../context/I18nContext';
import Icon from '../icons/Icon';

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
  tone = 'danger',
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation();
  const resolvedConfirm = confirmLabel || t('common.delete');
  const resolvedCancel = cancelLabel || t('common.cancel');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div className="confirm-dialog-overlay" role="presentation" onClick={loading ? undefined : onCancel}>
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`confirm-dialog__icon confirm-dialog__icon--${tone}`} aria-hidden="true">
          <Icon name={tone === 'danger' ? 'trash-2' : 'circle-help'} size={20} />
        </div>
        <div className="confirm-dialog__body">
          <h3 id="confirm-dialog-title">{title}</h3>
          {message ? <p>{message}</p> : null}
        </div>
        <div className="confirm-dialog__actions">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onCancel} disabled={loading}>
            {resolvedCancel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'admin-btn admin-btn-danger' : 'admin-btn admin-btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t('common.working') : resolvedConfirm}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConfirmDialog;
