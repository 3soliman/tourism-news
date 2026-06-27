import React from 'react';
import Icon from '../icons/Icon';

const UpcomingStays = () => {
  // Sample upcoming stays data
  const upcomingStays = [
    { id: 1, guest: 'John Doe', room: 'Deluxe Suite', checkIn: '2025-10-15', checkOut: '2025-10-20' },
    { id: 2, guest: 'Jane Smith', room: 'Executive Room', checkIn: '2025-10-18', checkOut: '2025-10-22' },
    { id: 3, guest: 'Robert Johnson', room: 'Family Suite', checkIn: '2025-10-25', checkOut: '2025-10-30' }
  ];

  return (
    <div className="card">
      <h3 className="panel-title-with-icon">
        <Icon name="calendar" size={22} />
        <span>Upcoming Stays</span>
      </h3>
      <div className="upcoming-stays">
        {upcomingStays.map(stay => (
          <div key={stay.id} className="stay-item">
            <div className="stay-details">
              <h4>{stay.guest}</h4>
              <p>{stay.room}</p>
            </div>
            <div className="stay-dates">
              <p>{stay.checkIn} to {stay.checkOut}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingStays;