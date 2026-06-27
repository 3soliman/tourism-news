const STATUS_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled'
};

const STATUS_COLORS = {
  new: '#f59e0b',
  contacted: '#0ea5e9',
  confirmed: '#22c55e',
  cancelled: '#ef4444'
};

export function bookingAmount(booking) {
  const value = booking?.total ?? booking?.estimatedTotal ?? booking?.estimated_total;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function buildDashboardStats({ bookings = [], properties = [], roomTypes = [] } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const activeProperties = properties.filter((p) => p.isActive !== false);
  const activeRoomTypes = roomTypes.filter((r) => r.isActive !== false);
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const upcoming = activeBookings.filter((b) => !b.checkOut || b.checkOut >= today);

  const monthRevenue = confirmed
    .filter((b) => {
      const d = new Date(b.checkIn);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, b) => sum + bookingAmount(b), 0);

  const todayRevenue = confirmed
    .filter((b) => b.checkIn <= today && b.checkOut >= today)
    .reduce((sum, b) => sum + Math.round(bookingAmount(b) / Math.max(b.nights || 1, 1)), 0);

  const statusCounts = bookings.reduce((acc, booking) => {
    const key = booking.status || 'new';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Calculate trend metrics
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevYear = prevMonthDate.getFullYear();

  const bookingsThisMonth = bookings.filter((b) => {
    const source = b.createdAt || b.checkIn;
    if (!source) return false;
    const d = new Date(source);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  const bookingsLastMonth = bookings.filter((b) => {
    const source = b.createdAt || b.checkIn;
    if (!source) return false;
    const d = new Date(source);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  }).length;

  const revenueThisMonth = confirmed
    .filter((b) => {
      const d = new Date(b.checkIn);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, b) => sum + bookingAmount(b), 0);

  const revenueLastMonth = confirmed
    .filter((b) => {
      const d = new Date(b.checkIn);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    })
    .reduce((sum, b) => sum + bookingAmount(b), 0);

  let bookingTrendVal = 0;
  if (bookingsLastMonth > 0) {
    bookingTrendVal = Math.round(((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100);
  } else if (bookingsThisMonth > 0) {
    bookingTrendVal = 100;
  }

  let revenueTrendVal = 0;
  if (revenueLastMonth > 0) {
    revenueTrendVal = Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100);
  } else if (revenueThisMonth > 0) {
    revenueTrendVal = 100;
  }

  const bookingTrend = {
    value: bookingTrendVal >= 0 ? `+${bookingTrendVal}%` : `${bookingTrendVal}%`,
    up: bookingTrendVal >= 0
  };

  const revenueTrend = {
    value: revenueTrendVal >= 0 ? `+${revenueTrendVal}%` : `${revenueTrendVal}%`,
    up: revenueTrendVal >= 0
  };

  return {
    propertyCount: properties.length,
    activePropertyCount: activeProperties.length,
    roomTypeCount: roomTypes.length,
    activeRoomTypeCount: activeRoomTypes.length,
    totalBookings: bookings.length,
    activeBookings: activeBookings.length,
    confirmedCount: confirmed.length,
    newCount: statusCounts.new || 0,
    contactedCount: statusCounts.contacted || 0,
    cancelledCount: statusCounts.cancelled || 0,
    upcomingCount: upcoming.length,
    monthRevenue,
    todayRevenue,
    bookingTrend,
    revenueTrend,
    statusCounts
  };
}

export function buildMonthlyBookingSeries(bookings, monthCount = 6) {
  const now = new Date();
  const series = [];

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const yearValue = date.getFullYear();
    const monthValue = date.getMonth();
    const label = date.toLocaleDateString(undefined, { month: 'short' });
    const count = bookings.filter((booking) => {
      const source = booking.createdAt || booking.checkIn;
      if (!source) return false;
      const created = new Date(source);
      return created.getFullYear() === yearValue && created.getMonth() === monthValue;
    }).length;

    series.push({
      key: `${yearValue}-${monthValue}`,
      label,
      count
    });
  }

  return series;
}

export function buildMonthlyRevenueSeries(bookings, monthCount = 6) {
  const now = new Date();
  const series = [];

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const yearValue = date.getFullYear();
    const monthValue = date.getMonth();
    const label = date.toLocaleDateString(undefined, { month: 'short' });
    const revenue = bookings
      .filter((booking) => booking.status === 'confirmed')
      .filter((booking) => {
        const checkIn = new Date(booking.checkIn);
        return checkIn.getFullYear() === yearValue && checkIn.getMonth() === monthValue;
      })
      .reduce((sum, booking) => sum + bookingAmount(booking), 0);

    series.push({
      key: `${yearValue}-${monthValue}`,
      label,
      revenue
    });
  }

  return series;
}

export function buildStatusBreakdown(statusCounts = {}) {
  return Object.entries(statusCounts)
    .map(([status, count]) => ({
      status,
      label: STATUS_LABELS[status] || status,
      count,
      color: STATUS_COLORS[status] || '#94a3b8'
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function buildPropertyBookingSeries(bookings, properties, limit = 5) {
  const counts = bookings.reduce((acc, booking) => {
    const key = booking.hotelId || booking.propertyId || booking.propertyName || 'unknown';
    const label = booking.propertyName || booking.hotelName || 'Unknown property';
    if (!acc[key]) acc[key] = { id: key, label, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});

  const propertyNames = properties.reduce((acc, property) => {
    acc[property.id] = property.name;
    return acc;
  }, {});

  return Object.values(counts)
    .map((item) => ({
      ...item,
      label: propertyNames[item.id] || item.label
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildDonutGradient(items) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (!total) return '#e2e8f0';

  let cursor = 0;
  const segments = items.map((item) => {
    const start = (cursor / total) * 100;
    cursor += item.count;
    const end = (cursor / total) * 100;
    return `${item.color} ${start}% ${end}%`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

export function formatCurrency(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString()}`;
}
