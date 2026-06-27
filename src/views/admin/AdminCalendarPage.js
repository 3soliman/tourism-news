'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import { fetchAdminProperties } from '../../api/propertiesApi';
import {
  fetchBookingsCalendar,
  bookingCoversDay,
  bookingOverlapsRange,
  calendarStatusClass,
  bookingStatusLabel,
  bookingStatusBadgeClass
} from '../../api/bookingsApi';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import AdminIconButton from '../../components/admin/AdminIconButton';
import { useTranslation } from '../../context/I18nContext';

const DAY_COUNT = 14;

const STATUS_LEGEND = [
  { id: 'new', label: 'New', color: 'new' },
  { id: 'confirmed', label: 'Confirmed', color: 'confirmed' },
  { id: 'cancelled', label: 'Cancelled', color: 'cancelled' }
];

const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${month}-${day}`;
};

const formatDayHeader = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
};

const rowKey = (propertyId, roomTypeId) => `${propertyId}-${roomTypeId}`;

const AdminCalendarPage = () => {
  const { t } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const endDate = useMemo(() => addDays(startDate, DAY_COUNT - 1), [startDate]);

  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => addDays(startDate, i)),
    [startDate]
  );

  const loadProperties = useCallback(async () => {
    setProperties(await fetchAdminProperties());
  }, []);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchBookingsCalendar({
        propertyId: filterPropertyId || undefined,
        startDate,
        endDate
      });
      setBookings(list);
    } catch (err) {
      setError(err.message || t('pages.calendar.errorLoad', 'Failed to load booking calendar'));
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filterPropertyId, startDate, endDate]);

  const load = useCallback(async () => {
    try {
      await loadProperties();
    } catch (err) {
      setError(err.message || t('pages.calendar.errorProperties', 'Failed to load properties'));
    }
    await loadCalendar();
  }, [loadProperties, loadCalendar]);

  useEffect(() => {
    load();
  }, [load]);

  const calendarRows = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const key = rowKey(b.propertyId, b.roomTypeId);
      if (!map.has(key)) {
        map.set(key, {
          key,
          propertyId: b.propertyId,
          propertyName: b.propertyName,
          roomTypeId: b.roomTypeId,
          roomTypeName: b.roomTypeName
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const prop = a.propertyName.localeCompare(b.propertyName);
      if (prop !== 0) return prop;
      return a.roomTypeName.localeCompare(b.roomTypeName);
    });
  }, [bookings]);

  const getCellBookings = (row, day) =>
    bookings.filter(
      (b) =>
        rowKey(b.propertyId, b.roomTypeId) === row.key &&
        bookingCoversDay(b, day)
    );

  const visibleBookings = useMemo(
    () => bookings.filter((b) => bookingOverlapsRange(b, startDate, endDate)),
    [bookings, startDate, endDate]
  );

  const formatMoney = (value) =>
    value != null && value !== '' ? `$${value}` : '—';

  return (
    <div className="admin-page admin-calendar-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.calendar.title', 'Booking calendar')}</h2>
          <p>{t('pages.calendar.subtitle', 'Visual timeline of reservations by room type')}</p>
        </div>
        <AdminIconButton icon="refresh-cw" label={t('common.refresh', 'Refresh')} onClick={load} disabled={loading} loading={loading} />
      </div>

      <section className="admin-panel-card admin-service-filter-bar admin-calendar-filters">
        <div className="form-group">
          <label htmlFor="cal-property">Property</label>
          <select
            id="cal-property"
            value={filterPropertyId}
            onChange={(e) => setFilterPropertyId(e.target.value)}
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="cal-start">Start date</label>
          <input
            id="cal-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <p className="admin-hint admin-calendar-range-hint">
          Showing {DAY_COUNT} days · {startDate} → {endDate}
        </p>
      </section>

      <div className="admin-legend">
        {STATUS_LEGEND.map((s) => (
          <span key={s.id} className={`legend-item legend-${s.color}`}>{s.label}</span>
        ))}
      </div>

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <ApiLoading message={t('pages.calendar.loading', 'Loading calendar...')} variant="table" />}

      {!loading && !error && calendarRows.length === 0 && (
        <div className="admin-panel-card admin-empty-state">
          <h3>No calendar data</h3>
          <p>No bookings in this date range. Try another start date or create a guest booking first.</p>
          <Link to="/admin/bookings" className="admin-btn admin-btn-primary">View bookings</Link>
        </div>
      )}

      {!loading && !error && calendarRows.length > 0 && (
        <>
          <div className="admin-calendar-wrap">
            <table className="admin-calendar-table">
              <thead>
                <tr>
                  <th className="cal-room-col">Room type</th>
                  {days.map((d) => (
                    <th key={d} className="cal-day-col">
                      {formatDayHeader(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarRows.map((row) => (
                  <tr key={row.key}>
                    <td className="cal-room-cell">
                      <strong>{row.roomTypeName}</strong>
                      <small>{row.propertyName}</small>
                    </td>
                    {days.map((day) => {
                      const cellBookings = getCellBookings(row, day);
                      const primary = cellBookings[0];
                      const cellClass = primary
                        ? calendarStatusClass(primary.status)
                        : 'cal-available';

                      return (
                        <td
                          key={day}
                          className={`cal-cell cal-cell-booking ${cellClass}`}
                          title={
                            cellBookings.length
                              ? cellBookings.map((b) => `${b.customerName} (${bookingStatusLabel(b.status)})`).join('\n')
                              : `${row.roomTypeName} — available`
                          }
                          onClick={() => primary && setSelectedBooking(primary)}
                        >
                          {primary && (
                            <span className="cal-cell-label">
                              {primary.customerName.split(' ')[0]}
                              {cellBookings.length > 1 && ` +${cellBookings.length - 1}`}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="admin-panel-card admin-calendar-list">
            <h3>Bookings in range ({visibleBookings.length})</h3>
            <div className="admin-hotels-table-wrap">
              <table className="admin-table admin-table-wide">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Property</th>
                    <th>Room</th>
                    <th>Stay</th>
                    <th>Guests</th>
                    <th>Est. total</th>
                    <th>Units left</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.map((b) => (
                    <tr
                      key={b.id}
                      className={selectedBooking?.id === b.id ? 'admin-calendar-row-selected' : ''}
                      onClick={() => setSelectedBooking(b)}
                    >
                      <td>
                        <strong>{b.customerName}</strong>
                        <br />
                        <small>{b.email}</small>
                      </td>
                      <td>{b.propertyName}</td>
                      <td>{b.roomTypeName}</td>
                      <td>{b.checkIn} → {b.checkOut} ({b.nights}n)</td>
                      <td>{b.adults}A / {b.children}C{(b.infants ?? 0) > 0 && ` / ${b.infants}I`}</td>
                      <td>{formatMoney(b.estimatedTotal)}</td>
                      <td>{b.availableUnitsAfterBooking || '—'}</td>
                      <td>
                        <span className={`badge ${bookingStatusBadgeClass(b.status)}`}>
                          {bookingStatusLabel(b.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedBooking && (
            <section className="admin-panel-card admin-calendar-detail">
              <div className="admin-panel-head">
                <h3>Booking #{selectedBooking.id}</h3>
                <AdminIconButton icon="x" label="Close details" onClick={() => setSelectedBooking(null)} />
              </div>
              <div className="admin-booking-detail-grid">
                <div>
                  <h4>Guest</h4>
                  <p><strong>{selectedBooking.customerName}</strong></p>
                  <p>{selectedBooking.email}</p>
                  <p>{selectedBooking.phone || '—'}</p>
                </div>
                <div>
                  <h4>Stay</h4>
                  <p>{selectedBooking.propertyName}</p>
                  <p>{selectedBooking.roomTypeName}</p>
                  <p>{selectedBooking.checkIn} → {selectedBooking.checkOut} ({selectedBooking.nights} nights)</p>
                  <p>
                    {selectedBooking.adults} adults, {selectedBooking.children} children
                    {(selectedBooking.infants ?? 0) > 0 && `, ${selectedBooking.infants} infants`}
                  </p>
                  {selectedBooking.extraBedNeeded && (
                    <p>Extra beds: {selectedBooking.extraBedCount}</p>
                  )}
                </div>
                <div>
                  <h4>Availability & pricing</h4>
                  <p>Estimated total: {formatMoney(selectedBooking.estimatedTotal)}</p>
                  <p>Units after booking: {selectedBooking.availableUnitsAfterBooking || '—'}</p>
                  <p>
                    Status:{' '}
                    <span className={`badge ${bookingStatusBadgeClass(selectedBooking.status)}`}>
                      {bookingStatusLabel(selectedBooking.status)}
                    </span>
                  </p>
                </div>
              </div>
              {(selectedBooking.guests || []).length > 0 && (
                <div className="admin-calendar-guests-block">
                  <h4>Guest list</h4>
                  <ul className="admin-booking-guests-list">
                    {selectedBooking.guests.map((g, i) => (
                      <li key={g.id ?? i}>
                        <strong>{g.full_name}</strong>
                        <span>{g.guest_type}{g.is_primary ? ' · primary' : ''}</span>
                        {g.email && <span>{g.email}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link to="/admin/bookings" className="admin-btn admin-btn-secondary admin-calendar-manage-link">
                Manage in bookings list
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default AdminCalendarPage;
