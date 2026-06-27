import React, { useState } from 'react';
import RoomList from './RoomList';
import BookingForm from './BookingForm';
import BookingStatus from './BookingStatus';
import Icon from '../icons/Icon';

const BookingContainer = ({ user, onBack }) => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
  };

  const handleBookingSubmit = (bookingData) => {
    // Simulate booking submission
    setBookingStatus({
      id: Math.floor(Math.random() * 10000),
      room: selectedRoom,
      ...bookingData,
      status: 'confirmed'
    });
  };

  const handleNewBooking = () => {
    setSelectedRoom(null);
    setBookingStatus(null);
  };

  return (
    <div className="booking-container">
      <div className="booking-header">
        <h2 className="panel-title-with-icon">
          <Icon name="building-2" size={24} />
          <span>Book Your Stay</span>
        </h2>
        <button type="button" className="link-button link-with-icon" onClick={onBack}>
          <Icon name="arrow-left" size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {bookingStatus ? (
        <BookingStatus booking={bookingStatus} onNewBooking={handleNewBooking} />
      ) : selectedRoom ? (
        <BookingForm 
          room={selectedRoom} 
          user={user} 
          onSubmit={handleBookingSubmit} 
          onBack={() => setSelectedRoom(null)} 
        />
      ) : (
        <RoomList onRoomSelect={handleRoomSelect} />
      )}
    </div>
  );
};

export default BookingContainer;