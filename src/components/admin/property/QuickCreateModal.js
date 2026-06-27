import React, { useEffect } from 'react';
import Icon from '../../icons/Icon';

const QuickCreateModal = ({
  title,
  description,
  children,
  submitLabel = 'Create',
  submitting = false,
  error = null,
  onSubmit,
  onClose
}) => {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, submitting]);

  return (
    <div className="admin-modal-overlay quick-create-overlay" role="presentation" onClick={submitting ? undefined : onClose}>
      <div
        className="admin-modal quick-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-create-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-modal__head">
          <div>
            <h3 id="quick-create-title">{title}</h3>
            {description && <p className="admin-modal__subtitle">{description}</p>}
          </div>
          <button type="button" className="admin-modal__close" onClick={onClose} disabled={submitting} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </header>

        <form onSubmit={onSubmit} className="quick-create-form" noValidate>
          <fieldset disabled={submitting}>
            {error && (
              <div className="admin-alert admin-alert-error">
                <pre>{error}</pre>
              </div>
            )}
            {children}
            <div className="quick-create-modal__actions">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : submitLabel}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

export default QuickCreateModal;
