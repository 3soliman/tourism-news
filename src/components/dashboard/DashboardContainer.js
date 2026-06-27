import React from 'react';
import RoomSummary from './RoomSummary';
import BookingSummary from './BookingSummary';
import UpcomingStays from './UpcomingStays';

const DashboardContainer = ({ user, onLogout, onViewChange }) => {
  return (
    <div className="dashboard-container">
      <div className="welcome-section">
        <h2>Good morning, {user.name}! 👋</h2>
        <p>Ready to plan your next stay with us?</p>
      </div>
      
      <div className="dashboard">
        <RoomSummary onViewChange={onViewChange} />
        <BookingSummary onViewChange={onViewChange} />
        <UpcomingStays />
      </div>
      
      <div className="action-section">
        <button 
          className="book-button"
          onClick={() => onViewChange('booking')}
        >
          Book a New Stay
        </button>
      </div>
    </div>
  );
};

export default DashboardContainer;