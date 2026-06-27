import React from 'react';
import Icon from '../icons/Icon';

const BookingSummary = ({ onViewChange }) => {
  // Sample booking data
  const bookingStats = {
    total: 24,
    confirmed: 18,
    pending: 4,
    cancelled: 2
  };

  return (
    <div className="card">
      <h3 className="panel-title-with-icon">
        <Icon name="layout-dashboard" size={22} />
        <span>Booking Summary</span>
      </h3>
      <div className="booking-stats">
        <div className="stat-item">
          <h4>{bookingStats.total}</h4>
          <p>Total Bookings</p>
        </div>
        <div className="stat-item">
          <h4 style={{ color: '#4CAF50' }}>{bookingStats.confirmed}</h4>
          <p>Confirmed</p>
        </div>
        <div className="stat-item">
          <h4 style={{ color: '#FF9800' }}>{bookingStats.pending}</h4>
          <p>Pending</p>
        </div>
        <div className="stat-item">
          <h4 style={{ color: '#F44336' }}>{bookingStats.cancelled}</h4>
          <p>Cancelled</p>
        </div>
      </div>
      <button 
        className="link-button" 
        onClick={() => onViewChange('booking')}
        style={{ marginTop: '20px' }}
      >
        View Booking Details
      </button>
    </div>
  );
};

export default BookingSummary;