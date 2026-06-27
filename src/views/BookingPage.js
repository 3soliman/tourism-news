'use client';

import React from 'react';
import BookingContainer from '../components/booking/BookingContainer';

const BookingPage = ({ user, onBack }) => {
  return (
    <div className="booking-page">
      <BookingContainer user={user} onBack={onBack} />
    </div>
  );
};

export default BookingPage;