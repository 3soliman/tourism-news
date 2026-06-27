'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../icons/Icon';
import { useTranslation } from '../../context/I18nContext';
import { nightsBetween } from '../../utils/searchUtils';
import {
  addMonths,
  buildMonthGrid,
  compareISO,
  formatSearchDate,
  getWeekdayLabels,
  isBetweenISO,
  monthLabel,
  parseISODate,
  todayISO
} from '../../utils/dateRange';

function MonthPanel({ year, month, locale, minDate, checkIn, checkOut, hoverDate, onDayClick, onDayHover }) {
  const weekdays = useMemo(() => getWeekdayLabels(locale), [locale]);
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  return (
    <div className="date-range-month">
      <p className="date-range-month__title">{monthLabel(year, month, locale)}</p>
      <div className="date-range-weekdays" aria-hidden="true">
        {weekdays.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
          <div
            className="date-range-days"
            role="grid"
            onMouseLeave={() => onDayHover('')}
          >
        {cells.map((iso, index) => {
          if (!iso) {
            return <span key={`empty-${year}-${month}-${index}`} className="date-range-day is-empty" aria-hidden="true" />;
          }

          const disabled = compareISO(iso, minDate) < 0;
          const isStart = iso === checkIn;
          const isEnd = iso === checkOut;
          const inRange = isBetweenISO(iso, checkIn, checkOut) || isBetweenISO(iso, checkIn, hoverDate);
          const isHoverEnd = hoverDate && iso === hoverDate && checkIn && !checkOut;

          const className = [
            'date-range-day',
            disabled ? 'is-disabled' : '',
            isStart ? 'is-start' : '',
            isEnd || isHoverEnd ? 'is-end' : '',
            inRange ? 'is-in-range' : '',
            isStart && (checkOut || hoverDate) ? 'has-range' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={iso}
              type="button"
              className={className}
              disabled={disabled}
              onClick={() => onDayClick(iso)}
              onMouseEnter={() => onDayHover(iso)}
              onFocus={() => onDayHover(iso)}
              aria-label={formatSearchDate(iso, locale)}
              aria-pressed={isStart || isEnd}
            >
              <span>{parseISODate(iso)?.getDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PANEL_WIDTH = 680;
const PANEL_EST_HEIGHT = 420;

function getPanelPosition(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  const width = Math.min(PANEL_WIDTH, window.innerWidth - 32);
  let left = rect.left;
  if (left + width > window.innerWidth - 16) {
    left = window.innerWidth - width - 16;
  }
  left = Math.max(16, left);

  let top = rect.bottom + 8;
  if (top + PANEL_EST_HEIGHT > window.innerHeight - 16) {
    top = Math.max(16, rect.top - PANEL_EST_HEIGHT - 8);
  }

  return { top, left, width };
}

export default function DateRangePicker({ checkIn, checkOut, onChange, minDate = todayISO() }) {
  const { t, locale, isRTL } = useTranslation();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState('');
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: PANEL_WIDTH });
  const [viewDate, setViewDate] = useState(() => parseISODate(checkIn) || new Date());

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  useEffect(() => {
    if (checkIn) {
      const parsed = parseISODate(checkIn);
      if (parsed) setViewDate(parsed);
    }
  }, [checkIn]);

  const updatePanelPosition = useCallback(() => {
    if (!triggerRef.current) return;
    setPanelPos(getPanelPosition(triggerRef.current));
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updatePanelPosition();

    const onReposition = () => updatePanelPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setHoverDate('');
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setHoverDate('');
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleDayClick = useCallback(
    (iso) => {
      if (compareISO(iso, minDate) < 0) return;

      if (!checkIn || (checkIn && checkOut)) {
        onChange({ checkIn: iso, checkOut: '' });
        setHoverDate('');
        return;
      }

      if (compareISO(iso, checkIn) <= 0) {
        onChange({ checkIn: iso, checkOut: '' });
        setHoverDate('');
        return;
      }

      onChange({ checkIn, checkOut: iso });
      setHoverDate('');
      setOpen(false);
    },
    [checkIn, checkOut, minDate, onChange]
  );

  const clearDates = () => {
    onChange({ checkIn: '', checkOut: '' });
    setHoverDate('');
  };

  const months = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const second = addMonths(first, 1);
    return [
      { year: first.getFullYear(), month: first.getMonth() },
      { year: second.getFullYear(), month: second.getMonth() }
    ];
  }, [viewDate]);

  const shiftMonths = (delta) => {
    setViewDate((prev) => addMonths(prev, delta));
  };

  const checkInLabel = checkIn
    ? formatSearchDate(checkIn, locale)
    : t('search.checkIn', 'Check-in');
  const checkOutLabel = checkOut
    ? formatSearchDate(checkOut, locale)
    : t('search.checkOut', 'Check-out');

  return (
    <div className={`date-range-picker${open ? ' is-open' : ''}`} ref={rootRef}>
      <label className="date-range-picker__label" id={`${panelId}-label`}>
        {t('search.datesLabel', 'Dates')}
      </label>
      <button
        ref={triggerRef}
        type="button"
        className="date-range-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-labelledby={`${panelId}-label`}
      >
        <Icon name="calendar" className="date-range-trigger__icon" size={16} />
        <span className="date-range-trigger__segment">
          <small>{t('search.checkIn', 'Check-in')}</small>
          <strong className={checkIn ? '' : 'is-placeholder'}>{checkInLabel}</strong>
        </span>
        <span className="date-range-trigger__divider" aria-hidden="true" />
        <span className="date-range-trigger__segment">
          <small>{t('search.checkOut', 'Check-out')}</small>
          <strong className={checkOut ? '' : 'is-placeholder'}>{checkOutLabel}</strong>
        </span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            className={`date-range-panel is-portal${isRTL ? ' is-rtl' : ''}`}
            role="dialog"
            aria-label={t('search.selectDates', 'Select check-in and check-out dates')}
            style={{
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width
            }}
          >
            <div className="date-range-panel__nav">
              <button
                type="button"
                className="date-range-nav-btn"
                onClick={() => shiftMonths(-1)}
                aria-label={t('search.prevMonth', 'Previous month')}
              >
                <Icon name={isRTL ? 'chevron-right' : 'chevron-left'} size={18} />
              </button>
              <button
                type="button"
                className="date-range-nav-btn"
                onClick={() => shiftMonths(1)}
                aria-label={t('search.nextMonth', 'Next month')}
              >
                <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} />
              </button>
            </div>

            <div className="date-range-months">
              {months.map(({ year, month }) => (
                <MonthPanel
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  locale={locale}
                  minDate={minDate}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  hoverDate={hoverDate}
                  onDayClick={handleDayClick}
                  onDayHover={setHoverDate}
                />
              ))}
            </div>

            <div className="date-range-panel__footer">
              <span className="date-range-summary">
                {checkIn && checkOut
                  ? t('search.nightsSelected', '{{count}} nights', { count: nights })
                  : checkIn
                    ? t('search.selectCheckout', 'Select check-out date')
                    : t('search.selectCheckin', 'Select check-in date')}
              </span>
              {(checkIn || checkOut) && (
                <button type="button" className="date-range-clear" onClick={clearDates}>
                  {t('search.clearDates', 'Clear dates')}
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
