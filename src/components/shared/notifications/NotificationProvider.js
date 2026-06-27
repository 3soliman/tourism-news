'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '../../icons/Icon';
import { useTranslation } from '../../../context/I18nContext';

const NotificationContext = createContext(null);
const DEFAULT_DURATION = 3800;

function createId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const TOAST_META = {
  success: { icon: 'check', label: 'Success' },
  error: { icon: 'x', label: 'Error' },
  warning: { icon: 'circle-help', label: 'Warning' },
  info: { icon: 'bell', label: 'Info' }
};

export const Toast = ({ toast, onClose, t }) => {
  const meta = TOAST_META[toast.type] || TOAST_META.info;
  const isAssertive = toast.type === 'error' || toast.type === 'warning';
  const typeLabel = t(`common.${toast.type}`, meta.label);

  return (
    <article
      className={`app-toast app-toast--${toast.type}`}
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
    >
      <span className="app-toast__icon" aria-hidden="true">
        <Icon name={meta.icon} size={18} />
      </span>
      <div className="app-toast__body">
        <span className="app-toast__eyebrow">{typeLabel}</span>
        <strong>{toast.title}</strong>
        {toast.message ? <p>{toast.message}</p> : null}
        {toast.action ? (
          <button type="button" className="app-toast__action" onClick={toast.action.onClick}>
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="app-toast__close"
        onClick={() => onClose(toast.id)}
        aria-label={`Dismiss ${toast.title}`}
      >
        <Icon name="x" size={15} />
      </button>
    </article>
  );
};

export const SuccessToast = (props) => <Toast {...props} toast={{ ...props.toast, type: 'success' }} />;
export const ErrorToast = (props) => <Toast {...props} toast={{ ...props.toast, type: 'error' }} />;
export const WarningToast = (props) => <Toast {...props} toast={{ ...props.toast, type: 'warning' }} />;
export const InfoToast = (props) => <Toast {...props} toast={{ ...props.toast, type: 'info' }} />;

const ToastViewport = ({ toasts, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="app-toast-viewport" aria-label={t('common.notifications')}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} t={t} />
      ))}
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    ({ type = 'info', title, message = '', action = null, duration = DEFAULT_DURATION }) => {
      const id = createId();
      const toast = { id, type, title, message, action };
      setToasts((prev) => [toast, ...prev].slice(0, 5));
      if (duration !== false) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      notify,
      dismiss,
      success: (title, options = {}) => notify({ ...options, title, type: 'success' }),
      error: (title, options = {}) => notify({ ...options, title, type: 'error', duration: options.duration ?? 4800 }),
      warning: (title, options = {}) => notify({ ...options, title, type: 'warning' }),
      info: (title, options = {}) => notify({ ...options, title, type: 'info' })
    }),
    [dismiss, notify]
  );

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={dismiss} />
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export default NotificationProvider;
