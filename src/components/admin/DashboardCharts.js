'use client';

import React, { useMemo } from 'react';
import { useTranslation } from '../../context/I18nContext';
import {
  buildDonutGradient,
  buildMonthlyBookingSeries,
  buildMonthlyRevenueSeries,
  buildPropertyBookingSeries,
  buildStatusBreakdown,
  formatCurrency
} from '../../utils/dashboardStats';

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <section className={`admin-panel-card dash-chart-card ${className}`.trim()}>
      <div className="dash-chart-card__head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function DashboardKpiGrid({ stats }) {
  const { t } = useTranslation();

  const cards = [
    {
      label: t('charts.properties', 'Properties'),
      value: stats.activePropertyCount,
      hint: t('charts.propertiesTotal', '{{count}} total', { count: stats.propertyCount }),
      tone: 'primary'
    },
    {
      label: t('charts.roomTypes', 'Room types'),
      value: stats.activeRoomTypeCount,
      hint: t('charts.roomTypesTotal', '{{count}} total', { count: stats.roomTypeCount }),
      tone: 'neutral'
    },
    {
      label: t('charts.totalBookings', 'Total bookings'),
      value: stats.totalBookings,
      hint: t('charts.activeBookings', '{{count}} active', { count: stats.activeBookings }),
      tone: 'accent',
      trend: stats.bookingTrend
    },
    {
      label: t('charts.confirmed', 'Confirmed'),
      value: stats.confirmedCount,
      hint: t('charts.upcoming', '{{count}} upcoming', { count: stats.upcomingCount }),
      tone: 'success'
    },
    {
      label: t('charts.newInquiries', 'New inquiries'),
      value: stats.newCount,
      hint: t('charts.contacted', '{{count}} contacted', { count: stats.contactedCount }),
      tone: 'warning'
    },
    {
      label: t('charts.cancelled', 'Cancelled'),
      value: stats.cancelledCount,
      hint: t('charts.allTime', 'All time'),
      tone: 'danger'
    },
    {
      label: t('charts.revenueToday', 'Revenue today'),
      value: formatCurrency(stats.todayRevenue),
      hint: t('charts.confirmedStays', 'Confirmed stays'),
      tone: 'primary'
    },
    {
      label: t('charts.revenueMonth', 'Revenue this month'),
      value: formatCurrency(stats.monthRevenue),
      hint: t('charts.confirmedBookings', 'Confirmed bookings'),
      tone: 'success',
      trend: stats.revenueTrend
    }
  ];

  return (
    <div className="admin-kpi-grid dash-kpi-grid">
      {cards.map((card) => (
        <article key={card.label} className={`admin-kpi-card dash-kpi-card dash-kpi-card--${card.tone}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '4px' }}>
            <span className="kpi-label" style={{ margin: 0 }}>{card.label}</span>
            {card.trend && (
              <span className={`kpi-trend ${card.trend.up ? 'kpi-trend-up' : 'kpi-trend-neutral'}`} style={{ marginTop: 0 }}>
                {card.trend.value}
              </span>
            )}
          </div>
          <strong className="kpi-value">{card.value}</strong>
          <span className="kpi-hint">{card.hint}</span>
        </article>
      ))}
    </div>
  );
}

export function BookingsTrendChart({ bookings }) {
  const { t } = useTranslation();
  const series = useMemo(() => buildMonthlyBookingSeries(bookings), [bookings]);
  const max = Math.max(...series.map((item) => item.count), 1);

  return (
    <ChartCard
      title={t('charts.bookingsTrend', 'Bookings trend')}
      subtitle={t('charts.bookingsTrendSub', 'New bookings over the last 6 months')}
    >
      {series.every((item) => item.count === 0) ? (
        <p className="admin-empty">{t('charts.noBookingActivity', 'No booking activity yet.')}</p>
      ) : (
        <div className="dash-bar-chart" role="img" aria-label={t('charts.bookingsTrend', 'Bookings trend')}>
          {series.map((item) => (
            <div key={item.key} className="dash-bar-col">
              <div className="dash-bar-value">{item.count}</div>
              <div className="dash-bar-track">
                <div
                  className="dash-bar-fill dash-bar-fill--primary"
                  style={{ height: `${Math.max((item.count / max) * 100, item.count ? 8 : 0)}%` }}
                />
              </div>
              <span className="dash-bar-label">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}

export function RevenueTrendChart({ bookings }) {
  const { t } = useTranslation();
  const series = useMemo(() => buildMonthlyRevenueSeries(bookings), [bookings]);
  const max = Math.max(...series.map((item) => item.revenue), 1);
  const points = series
    .map((item, index) => {
      const x = series.length === 1 ? 50 : (index / (series.length - 1)) * 100;
      const y = 100 - (item.revenue / max) * 80 - 10;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <ChartCard
      title={t('charts.revenueTrend', 'Revenue trend')}
      subtitle={t('charts.revenueTrendSub', 'Confirmed booking revenue by check-in month')}
    >
      {series.every((item) => item.revenue === 0) ? (
        <p className="admin-empty">{t('charts.noRevenue', 'No confirmed revenue recorded yet.')}</p>
      ) : (
        <div className="dash-line-chart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="dash-line-chart__svg" aria-hidden="true">
            <polygon className="dash-line-chart__area" points={areaPoints} />
            <polyline className="dash-line-chart__line" points={points} />
          </svg>
          <div className="dash-line-chart__labels">
            {series.map((item) => (
              <span key={item.key}>{item.label}</span>
            ))}
          </div>
          <div className="dash-line-chart__legend">
            {series.map((item) => (
              <span key={item.key}>
                <strong>{item.label}</strong> {formatCurrency(item.revenue)}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function BookingStatusChart({ statusCounts }) {
  const { t } = useTranslation();
  const items = useMemo(() => {
    return buildStatusBreakdown(statusCounts).map((item) => ({
      ...item,
      label: t(`bookingStatus.${item.status}`, item.label)
    }));
  }, [statusCounts, t]);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const gradient = buildDonutGradient(items);

  return (
    <ChartCard
      title={t('charts.bookingStatus', 'Booking status')}
      subtitle={t('charts.bookingStatusSub', 'Distribution of all booking inquiries')}
    >
      {!total ? (
        <p className="admin-empty">{t('charts.noBookingsChart', 'No bookings to chart yet.')}</p>
      ) : (
        <div className="dash-donut-layout">
          <div className="dash-donut-wrap">
            <div className="dash-donut" style={{ background: gradient }}>
              <div className="dash-donut__hole">
                <strong>{total}</strong>
                <span>{t('common.total', 'Total')}</span>
              </div>
            </div>
          </div>
          <ul className="dash-legend">
            {items.map((item) => (
              <li key={item.status}>
                <span className="dash-legend__dot" style={{ background: item.color }} />
                <span className="dash-legend__label">{item.label}</span>
                <strong>{item.count}</strong>
                <em>{Math.round((item.count / total) * 100)}%</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

export function TopPropertiesChart({ bookings, properties }) {
  const { t } = useTranslation();
  const series = useMemo(
    () => buildPropertyBookingSeries(bookings, properties),
    [bookings, properties]
  );
  const max = Math.max(...series.map((item) => item.count), 1);

  return (
    <ChartCard
      title={t('charts.topProperties', 'Top properties')}
      subtitle={t('charts.topPropertiesSub', 'Most booked properties')}
    >
      {!series.length ? (
        <p className="admin-empty">{t('charts.noPropertyData', 'No property booking data yet.')}</p>
      ) : (
        <div className="dash-hbar-list">
          {series.map((item) => (
            <div key={item.id} className="dash-hbar-row">
              <span className="dash-hbar-label">{item.label}</span>
              <div className="dash-hbar-track">
                <div
                  className="dash-hbar-fill"
                  style={{ width: `${Math.max((item.count / max) * 100, item.count ? 6 : 0)}%` }}
                />
              </div>
              <strong className="dash-hbar-value">{item.count}</strong>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
