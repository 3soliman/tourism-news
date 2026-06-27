import React from 'react';
import Icon from '../icons/Icon';

const RoomSummary = ({ onViewChange }) => {
  const roomTypes = [
    { id: 1, name: 'Deluxe Suite', count: 12, icon: 'bed-double' },
    { id: 2, name: 'Executive Room', count: 8, icon: 'building-2' },
    { id: 3, name: 'Family Suite', count: 5, icon: 'users' },
    { id: 4, name: 'Standard Room', count: 20, icon: 'bed-double' }
  ];

  return (
    <div className="card">
      <h3 className="panel-title-with-icon">
        <Icon name="bed-double" size={22} />
        <span>Available Rooms</span>
      </h3>
      <div className="room-summary">
        {roomTypes.map((room) => (
          <div key={room.id} className="room-type">
            <div className="room-icon">
              <Icon name={room.icon} size={22} />
            </div>
            <div className="room-info">
              <h4>{room.name}</h4>
              <p>{room.count} rooms available</p>
            </div>
          </div>
        ))}
      </div>
      <button
        className="link-button"
        onClick={() => onViewChange('booking')}
        style={{ marginTop: '20px' }}
      >
        View All Rooms
      </button>
    </div>
  );
};

export default RoomSummary;
