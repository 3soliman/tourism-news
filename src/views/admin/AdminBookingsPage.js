'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchAdminProperties } from '../../api/propertiesApi';
import {
  fetchAdminBookings,
  fetchBookingById,
  confirmBooking,
  updateBookingStatus,
  deleteBooking,
  BOOKING_STATUS_OPTIONS,
  bookingStatusLabel,
  bookingStatusBadgeClass
} from '../../api/bookingsApi';
import { useTranslation } from '../../context/I18nContext';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import AdminIconButton from '../../components/admin/AdminIconButton';
import Icon from '../../components/icons/Icon';

const STATUS_FILTERS = ['all', ...BOOKING_STATUS_OPTIONS.map((s) => s.value)];

const AdminBookingsPage = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filterPropertyId, setFilterPropertyId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const statusLabel = useCallback(
    (status) => t(`bookingStatus.${status}`, bookingStatusLabel(status)),
    [t]
  );

  const loadProperties = useCallback(async () => {
    setProperties(await fetchAdminProperties());
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminBookings({
        propertyId: filterPropertyId || undefined,
        status: filterStatus === 'all' ? undefined : filterStatus
      });
      setBookings(list);
    } catch (err) {
      setError(err.message || t('pages.bookings.errorLoad', 'Failed to load bookings'));
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [filterPropertyId, filterStatus, t]);

  const load = useCallback(async () => {
    try {
      await loadProperties();
    } catch (err) {
      setError(err.message || t('pages.bookings.errorProperties', 'Failed to load properties'));
    }
    await loadBookings();
  }, [loadProperties, loadBookings, t]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const base = { all: bookings.length };
    BOOKING_STATUS_OPTIONS.forEach((s) => {
      base[s.value] = bookings.filter((b) => b.status === s.value).length;
    });
    return base;
  }, [bookings]);

  const propertyName = (id) =>
    properties.find((p) => p.id === String(id))?.name || (id ? `#${id}` : t('common.emDash', '—'));

  const handleStatusChange = async (booking, status) => {
    if (booking.status === status) return;
    setUpdatingId(booking.id);
    setActionError(null);
    try {
      if (status === 'confirmed') {
        await confirmBooking(booking.id);
      } else {
        await updateBookingStatus(booking.id, status);
      }
      await loadBookings();
      if (expandedId === booking.id) {
        setDetail(await fetchBookingById(booking.id));
      }
    } catch (err) {
      const fallback =
        status === 'confirmed'
          ? t('pages.bookings.errorConfirm', 'Could not confirm booking')
          : t('pages.bookings.errorStatus', 'Could not update status');
      setActionError(formatApiErrors(err.data) || err.message || fallback);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirm = (booking) => handleStatusChange(booking, 'confirmed');

  const handleCancel = async (booking) => {
    if (!window.confirm(
      t('pages.bookings.confirmCancel', 'Cancel booking #{{id}} for {{guest}}?', {
        id: booking.id,
        guest: booking.guestName
      })
    )) return;
    await handleStatusChange(booking, 'cancelled');
  };

  const handleDelete = async (booking) => {
    if (!window.confirm(
      t('pages.bookings.confirmDelete', 'Delete booking #{{id}}? This cannot be undone.', { id: booking.id })
    )) return;

    setDeletingId(booking.id);
    setActionError(null);
    try {
      await deleteBooking(booking.id);
      if (expandedId === booking.id) {
        setExpandedId(null);
        setDetail(null);
      }
      await loadBookings();
    } catch (err) {
      setActionError(formatApiErrors(err.data) || err.message || t('pages.bookings.errorDelete', 'Could not delete booking'));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleDetails = async (booking) => {
    if (expandedId === booking.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }

    setExpandedId(booking.id);
    setDetailLoading(true);
    setDetail(null);
    try {
      setDetail(await fetchBookingById(booking.id));
    } catch (err) {
      setActionError(formatApiErrors(err.data) || err.message || t('pages.bookings.errorDetails', 'Could not load booking details'));
      setExpandedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.bookings.title', 'Booking management')}</h2>
          <p>{t('pages.bookings.subtitle', 'View reservations, update status, and manage guest bookings from the API')}</p>
        </div>
        <AdminIconButton
          icon="refresh-cw"
          label={t('common.refresh', 'Refresh')}
          onClick={load}
          disabled={loading}
          loading={loading}
        />
      </div>

      {actionError && (
        <div className="admin-alert admin-alert-error">
          <pre>{actionError}</pre>
        </div>
      )}

      <section className="admin-panel-card admin-service-filter-bar admin-bookings-filter-panel">
        <div className="form-group">
          <label htmlFor="filter-booking-property">{t('pages.bookings.filterProperty', 'Filter by property')}</label>
          <select
            id="filter-booking-property"
            value={filterPropertyId}
            onChange={(e) => setFilterPropertyId(e.target.value)}
          >
            <option value="">{t('pages.bookings.allProperties', 'All properties')}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="admin-filters admin-filters--inline" role="group" aria-label={t('common.status', 'Status')}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={`admin-filter-btn ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'all' ? t('common.all', 'All') : statusLabel(s)} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
      </section>

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <ApiLoading message={t('pages.bookings.loading', 'Loading bookings…')} variant="table" />}

      {!loading && !error && bookings.length === 0 && (
        <div className="visual-empty-state">
          <div className="visual-empty-state-icon">
            <Icon name="calendar" size={24} />
          </div>
          <h3>{t('pages.bookings.emptyTitle', 'No bookings found')}</h3>
          <p>{t('pages.bookings.emptyDesc', 'Guest reservations will appear here once booking inquiries are received or filters are cleared.')}</p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {t('pages.bookings.count', '{{count}} bookings', { count: bookings.length })}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th>{t('pages.bookings.id', 'ID')}</th>
                  <th>{t('common.guest', 'Guest')}</th>
                  <th>{t('common.property', 'Property')}</th>
                  <th>{t('pages.bookings.roomType', 'Room type')}</th>
                  <th>{t('pages.bookings.checkIn', 'Check-in')}</th>
                  <th>{t('pages.bookings.checkOut', 'Check-out')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <React.Fragment key={b.id}>
                    <tr>
                      <td><code>#{b.id}</code></td>
                      <td>
                        <strong>{b.guestName}</strong>
                        <br />
                        <small>{b.guestEmail}</small>
                        {b.guestPhone && (
                          <>
                            <br />
                            <small>{b.guestPhone}</small>
                          </>
                        )}
                      </td>
                      <td>{b.propertyName || propertyName(b.hotelId)}</td>
                      <td>{b.roomTypeName || b.roomName || t('common.emDash', '—')}</td>
                      <td>{b.checkIn || t('common.emDash', '—')}</td>
                      <td>{b.checkOut || t('common.emDash', '—')}</td>
                      <td>
                        <span className={`badge ${bookingStatusBadgeClass(b.status)}`}>
                          {statusLabel(b.status)}
                        </span>
                      </td>
                      <td className="admin-actions-cell">
                        <div className="admin-icon-actions">
                          <AdminIconButton
                            icon={expandedId === b.id ? 'eye-off' : 'eye'}
                            label={expandedId === b.id
                              ? t('pages.bookings.hideDetails', 'Hide details')
                              : t('pages.bookings.viewDetails', 'View details')}
                            variant="primary"
                            onClick={() => toggleDetails(b)}
                            disabled={detailLoading && expandedId === b.id}
                            loading={detailLoading && expandedId === b.id}
                          />
                          {b.status === 'new' && (
                            <AdminIconButton
                              icon="check"
                              label={t('pages.bookings.confirmBooking', 'Confirm booking')}
                              onClick={() => handleConfirm(b)}
                              disabled={updatingId === b.id || deletingId === b.id}
                              loading={updatingId === b.id}
                            />
                          )}
                          {b.status !== 'cancelled' && (
                            <AdminIconButton
                              icon="x"
                              label={t('pages.bookings.cancelBooking', 'Cancel booking')}
                              variant="danger"
                              onClick={() => handleCancel(b)}
                              disabled={updatingId === b.id || deletingId === b.id}
                            />
                          )}
                          <select
                            className="admin-select-sm"
                            value={b.status}
                            onChange={(e) => handleStatusChange(b, e.target.value)}
                            disabled={updatingId === b.id || deletingId === b.id}
                            aria-label={t('pages.bookings.changeStatus', 'Change booking status')}
                          >
                            {BOOKING_STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{statusLabel(s.value)}</option>
                            ))}
                          </select>
                          <AdminIconButton
                            icon="trash-2"
                            label={t('pages.bookings.deleteBooking', 'Delete booking')}
                            variant="danger"
                            onClick={() => handleDelete(b)}
                            disabled={deletingId === b.id || updatingId === b.id}
                            loading={deletingId === b.id}
                          />
                        </div>
                      </td>
                    </tr>
                    {expandedId === b.id && (
                      <tr className="admin-booking-detail-row">
                        <td colSpan={10}>
                          {detailLoading && (
                            <ApiLoading message={t('pages.bookings.loadingDetails', 'Loading booking details...')} variant="form" />
                          )}
                          {!detailLoading && detail && (
                            <div className="admin-booking-detail">
                              <div className="admin-booking-detail-grid">
                                <div>
                                  <h4>{t('pages.bookings.stay', 'Stay')}</h4>
                                  <p><strong>{detail.propertyName}</strong></p>
                                  <p>{detail.roomTypeName}</p>
                                  <p>
                                    {detail.checkIn} → {detail.checkOut}{' '}
                                    ({t('pages.bookings.nights', '{{count}} nights', { count: detail.nights })})
                                  </p>
                                  <p>
                                    {t('pages.bookings.guestCounts', '{{adults}} adults, {{children}} children', {
                                      adults: detail.adults,
                                      children: detail.children
                                    })}
                                    {(detail.infants ?? 0) > 0 && `, ${t('pages.bookings.infants', '{{count}} infants', { count: detail.infants })}`}
                                  </p>
                                  {detail.extraBedNeeded && (
                                    <p>{t('pages.bookings.extraBed', 'Extra bed')}: {detail.extraBedCount}</p>
                                  )}
                                </div>
                                <div>
                                  <h4>{t('pages.bookings.contact', 'Contact')}</h4>
                                  <p>{detail.guestName}</p>
                                  <p>{detail.guestEmail}</p>
                                  <p>{detail.guestPhone || t('common.emDash', '—')}</p>
                                  <p className="admin-hint">
                                    {t('pages.bookings.created', 'Created')}: {detail.createdAt?.slice(0, 10) || t('common.emDash', '—')}
                                  </p>
                                </div>
                                <div>
                                  <h4>{t('pages.bookings.guests', 'Guests ({{count}})', { count: detail.guests?.length || 0 })}</h4>
                                  {(detail.guests || []).length === 0 ? (
                                    <p className="admin-hint">{t('pages.bookings.noGuests', 'No guest records')}</p>
                                  ) : (
                                    <ul className="admin-booking-guests-list">
                                      {detail.guests.map((g, i) => (
                                        <li key={g.id ?? i}>
                                          <strong>{g.full_name}</strong>
                                          <span>
                                            {g.guest_type}
                                            {g.is_primary ? ` · ${t('pages.bookings.primary', 'primary')}` : ''}
                                          </span>
                                          {g.email && <span>{g.email}</span>}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminBookingsPage;
