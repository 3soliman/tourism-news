'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from '@/lib/router-compat';
import { useTranslation } from '../../context/I18nContext';
import { fetchAdminBookings, bookingStatusLabel, bookingStatusBadgeClass } from '../../api/bookingsApi';
import { fetchAdminProperties, fetchPropertySetupStatus } from '../../api/propertiesApi';
import { fetchRoomTypes } from '../../api/roomTypesApi';
import { buildDashboardStats, bookingAmount, formatCurrency } from '../../utils/dashboardStats';
import {
  DashboardKpiGrid,
  BookingsTrendChart,
  RevenueTrendChart,
  BookingStatusChart,
  TopPropertiesChart
} from '../../components/admin/DashboardCharts';
import { DashboardSkeleton } from '../../components/shared/LoadingSkeletons';
import AdminIconButton from '../../components/admin/AdminIconButton';
import Icon from '../../components/icons/Icon';
import PropertyReadinessWidget from '../../components/admin/property/PropertyReadinessWidget';

const SETUP_LABEL_KEYS = {
  hotel_information: 'pages.dashboard.setupHotelInfo',
  images: 'pages.dashboard.setupImages',
  rooms: 'pages.dashboard.setupRooms',
  channel_manager: 'pages.dashboard.setupChannel',
  rates: 'pages.dashboard.setupRates',
  availability: 'pages.dashboard.setupAvailability'
};

const SETUP_PREVIEW_LIMIT = 6;

function normalizeSetupChecklist(setup, property) {
  const rawChecklist = setup?.checklist && typeof setup.checklist === 'object' ? setup.checklist : null;
  if (rawChecklist) return rawChecklist;

  return {
    hotel_information: Boolean(property?.name && property?.propertyType),
    images: Boolean(property?.image || property?.coverImage || property?.coverImageUrl),
    rooms: false,
    rates: false,
    availability: false
  };
}

const AdminDashboardPage = () => {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [setupStatuses, setSetupStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const loadSetupStatuses = useCallback(async (propertyList) => {
    if (!propertyList.length) {
      setSetupStatuses({});
      setSetupLoading(false);
      return;
    }

    setSetupLoading(true);
    const entries = await Promise.all(
      propertyList.map(async (property) => {
        try {
          return [property.id, await fetchPropertySetupStatus(property.id)];
        } catch {
          return [property.id, null];
        }
      })
    );
    setSetupStatuses(Object.fromEntries(entries));
    setSetupLoading(false);
  }, []);

  const statusLabel = useCallback(
    (status) => t(`bookingStatus.${status}`, bookingStatusLabel(status)),
    [t]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingList, propertyList, roomTypeList] = await Promise.all([
        fetchAdminBookings(),
        fetchAdminProperties(),
        fetchRoomTypes()
      ]);
      setBookings(bookingList);
      setProperties(propertyList);
      setRoomTypes(roomTypeList);
      setKpiLoading(false);
      setChartsLoading(false);
      setBookingsLoading(false);
      setLoading(false);
      loadSetupStatuses(propertyList.slice(0, SETUP_PREVIEW_LIMIT));
    } catch (err) {
      setError(err.message || t('pages.dashboard.errorLoad', 'Could not load dashboard data'));
      setBookings([]);
      setProperties([]);
      setRoomTypes([]);
      setSetupStatuses({});
      setKpiLoading(false);
      setChartsLoading(false);
      setBookingsLoading(false);
      setSetupLoading(false);
    } finally {
      setLoading(false);
    }
  }, [loadSetupStatuses, t]);

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const stats = useMemo(
    () => buildDashboardStats({ bookings, properties, roomTypes }),
    [bookings, properties, roomTypes]
  );

  const recentBookings = bookings.slice(0, 6);
  const setupPreviewProperties = properties.slice(0, SETUP_PREVIEW_LIMIT);

  return (
    <div className="admin-page admin-dashboard-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.dashboard.title', 'Dashboard')}</h2>
          <p>{t('pages.dashboard.subtitle', 'Live overview of properties, bookings, revenue, and trends')}</p>
        </div>
        <AdminIconButton
          icon="refresh-cw"
          label={t('common.refresh', 'Refresh')}
          onClick={loadDashboard}
          disabled={loading}
          loading={loading}
        />
      </div>

      {error && (
        <div className="error-message auth-form-error admin-dashboard-error">
          <pre>{error}</pre>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {kpiLoading ? (
            <div className="dash-kpi-skeleton-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton skeleton-card" style={{height: 120}} />)}
            </div>
          ) : (
            <DashboardKpiGrid stats={stats} />
          )}

          {setupPreviewProperties.length > 0 && (
            <section className="admin-panel-card">
              <div className="admin-panel-head"><h3>{t('pages.dashboard.setupProgress', 'Hotel Setup Progress')}</h3></div>
              <div className="dash-charts-grid">
                {setupLoading
                  ? setupPreviewProperties.slice(0, 3).map((p) => (
                      <div key={p.id} className="skeleton skeleton-card" style={{height: 100}} />
                    ))
                  : setupPreviewProperties.map((property) => {
                  const setup = setupStatuses[property.id];
                  const checklist = normalizeSetupChecklist(setup, property);
                  const items = Object.entries(checklist).map(([id, complete]) => ({
                        id,
                        label: t(SETUP_LABEL_KEYS[id] || id, id),
                        complete
                      }));
                  return (
                    <Link key={property.id} to={`/admin/properties/${property.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <PropertyReadinessWidget items={items} title={property.name} percentage={setup?.completion_percentage} />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {chartsLoading ? (
            <>
              <div className="dash-charts-grid dash-charts-grid--wide">
                {[1,2].map(i => <div key={i} className="skeleton skeleton-card" style={{height: 280}} />)}
              </div>
              <div className="dash-charts-grid">
                {[1,2].map(i => <div key={i} className="skeleton skeleton-card" style={{height: 280}} />)}
              </div>
            </>
          ) : (
            <>
              <div className="dash-charts-grid dash-charts-grid--wide">
                <BookingsTrendChart bookings={bookings} />
                <BookingStatusChart statusCounts={stats.statusCounts} />
              </div>
              <div className="dash-charts-grid">
                <RevenueTrendChart bookings={bookings} />
                <TopPropertiesChart bookings={bookings} properties={properties} />
              </div>
            </>
          )}

          {bookingsLoading ? (
            <section className="admin-panel-card">
              <div className="admin-panel-head"><h3>{t('pages.dashboard.recentBookings', 'Recent bookings')}</h3></div>
              <div className="skeleton skeleton-table-row" style={{height: 200}} />
            </section>
          ) : (
          <section className="admin-panel-card">
            <div className="admin-panel-head">
              <h3>{t('pages.dashboard.recentBookings', 'Recent bookings')}</h3>
              <Link to="/admin/bookings">{t('pages.dashboard.viewAll', 'View all')}</Link>
            </div>
            {recentBookings.length === 0 ? (
              <p className="admin-empty">{t('pages.dashboard.noBookings', 'No bookings yet.')}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-table-wide">
                  <thead>
                    <tr>
                      <th>{t('pages.dashboard.guest', 'Guest')}</th>
                      <th>{t('pages.dashboard.property', 'Property')}</th>
                      <th>{t('pages.dashboard.room', 'Room')}</th>
                      <th>{t('pages.dashboard.dates', 'Dates')}</th>
                      <th>{t('pages.dashboard.total', 'Total')}</th>
                      <th>{t('pages.dashboard.status', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.guestName}</td>
                        <td>{booking.propertyName || t('common.emDash', '—')}</td>
                        <td>{booking.roomTypeName || booking.roomName}</td>
                        <td>{booking.checkIn} → {booking.checkOut}</td>
                        <td>{bookingAmount(booking) ? formatCurrency(bookingAmount(booking)) : t('common.emDash', '—')}</td>
                        <td>
                          <span className={`badge ${bookingStatusBadgeClass(booking.status)}`}>
                            {statusLabel(booking.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </section>)}
          <div className="admin-quick-actions">
            <Link to="/admin/hotels" className="admin-btn admin-btn-primary link-with-icon">
              <Icon name="building-2" size={16} />
              <span>{t('pages.dashboard.myProperties', 'My properties')}</span>
            </Link>
            <Link to="/admin/hotels/new" className="admin-btn admin-btn-secondary link-with-icon">
              <Icon name="plus" size={16} />
              <span>{t('pages.dashboard.addProperty', 'Add property')}</span>
            </Link>
            <Link to="/admin/rooms" className="admin-btn admin-btn-secondary link-with-icon">
              <Icon name="bed-double" size={16} />
              <span>{t('pages.dashboard.manageRooms', 'Manage rooms')}</span>
            </Link>
            <Link to="/admin/reviews" className="admin-btn admin-btn-secondary link-with-icon">
              <Icon name="star" size={16} />
              <span>{t('pages.dashboard.reviewsRatings', 'Reviews & ratings')}</span>
            </Link>
            <Link to="/admin/bookings" className="admin-btn admin-btn-primary link-with-icon">
              <Icon name="clipboard-list" size={16} />
              <span>{t('pages.dashboard.manageBookings', 'Manage bookings')}</span>
            </Link>
            <Link to="/admin/calendar" className="admin-btn admin-btn-secondary link-with-icon">
              <Icon name="calendar" size={16} />
              <span>{t('pages.dashboard.openCalendar', 'Open calendar')}</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
