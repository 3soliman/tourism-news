import React, { useState } from 'react';
import Icon from '../icons/Icon';

const BookingForm = ({ room, user, onSubmit, onBack }) => {
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    specialRequests: ''
  });

  const handleChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(bookingData);
  };

  // Calculate number of nights
  const calculateNights = () => {
    if (bookingData.checkIn && bookingData.checkOut) {
      const checkInDate = new Date(bookingData.checkIn);
      const checkOutDate = new Date(bookingData.checkOut);
      const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    return 0;
  };

  const nights = calculateNights();
  const totalPrice = nights * room.price;

  return (
    <div className="booking-form-container">
      <div className="room-summary-card">
        <h3>{room.name}</h3>
        <p className="room-price">${room.price}<span>/night</span></p>
        <p>{room.description}</p>
      </div>

      <div className="form-container">
        <h2>Complete Your Booking</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="checkIn">Check-in Date</label>
              <input
                type="date"
                id="checkIn"
                name="checkIn"
                value={bookingData.checkIn}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="checkOut">Check-out Date</label>
              <input
                type="date"
                id="checkOut"
                name="checkOut"
                value={bookingData.checkOut}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="guests">Number of Guests</label>
            <select
              id="guests"
              name="guests"
              value={bookingData.guests}
              onChange={handleChange}
              required
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num} Guest{num > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="specialRequests">Special Requests (Optional)</label>
            <textarea
              id="specialRequests"
              name="specialRequests"
              value={bookingData.specialRequests}
              onChange={handleChange}
              rows="3"
              placeholder="Any special requirements or preferences?"
            />
          </div>
          
          {nights > 0 && (
            <div className="booking-summary">
              <h4>Booking Summary</h4>
              <div className="summary-item">
                <span>{room.name}</span>
                <span>${room.price} × {nights} night{nights > 1 ? 's' : ''}</span>
              </div>
              <div className="summary-total">
                <strong>Total: ${totalPrice}</strong>
              </div>
            </div>
          )}
          
          <div className="form-actions">
            <button type="button" className="link-button link-with-icon" onClick={onBack}>
              <Icon name="arrow-left" size={16} />
              <span>Back to Rooms</span>
            </button>
            <button type="submit" className="book-button">
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;