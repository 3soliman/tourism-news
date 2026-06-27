import React from 'react';
import Icon from '../icons/Icon';

const BookingStatus = ({ booking, onNewBooking }) => {
  // Calculate number of nights
  const calculateNights = () => {
    if (booking.checkIn && booking.checkOut) {
      const checkInDate = new Date(booking.checkIn);
      const checkOutDate = new Date(booking.checkOut);
      const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    return 0;
  };

  const nights = calculateNights();
  const totalPrice = nights * booking.room.price;

  return (
    <div className="booking-status-container">
      <div className="confirmation-header">
        <div className="check-icon"><Icon name="check" size={36} /></div>
        <h2>Booking Confirmed!</h2>
        <p>Your reservation has been successfully processed</p>
      </div>
      
      <div className="booking-details-card">
        <h3>Booking Details</h3>
        <div className="detail-item">
          <span>Booking ID:</span>
          <strong>#{booking.id}</strong>
        </div>
        <div className="detail-item">
          <span>Guest:</span>
          <strong>{booking.user?.name || 'Guest'}</strong>
        </div>
        <div className="detail-item">
          <span>Room:</span>
          <strong>{booking.room.name}</strong>
        </div>
        <div className="detail-item">
          <span>Check-in:</span>
          <strong>{booking.checkIn}</strong>
        </div>
        <div className="detail-item">
          <span>Check-out:</span>
          <strong>{booking.checkOut}</strong>
        </div>
        <div className="detail-item">
          <span>Guests:</span>
          <strong>{booking.guests}</strong>
        </div>
        <div className="detail-item">
          <span>Status:</span>
          <strong className="status-confirmed">Confirmed</strong>
        </div>
      </div>
      
      <div className="pricing-summary">
        <h3>Payment Summary</h3>
        <div className="summary-item">
          <span>Room Charges:</span>
          <span>${booking.room.price} × {nights} night{nights > 1 ? 's' : ''}</span>
        </div>
        <div className="summary-item">
          <span>Taxes & Fees:</span>
          <span>${(totalPrice * 0.12).toFixed(2)}</span>
        </div>
        <div className="summary-total">
          <strong>Total Paid:</strong>
          <strong>${(totalPrice * 1.12).toFixed(2)}</strong>
        </div>
      </div>
      
      <div className="confirmation-actions">
        <button className="book-button" onClick={onNewBooking}>
          Book Another Stay
        </button>
        <button className="link-button">
          View Booking Details
        </button>
      </div>
    </div>
  );
};

export default BookingStatus;