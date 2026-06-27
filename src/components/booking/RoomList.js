'use client';

import React, { useState, useEffect } from 'react';
import { CardSkeleton } from '../shared/LoadingSkeletons';
import { useTranslation } from '../../context/I18nContext';
import { getAvailableRooms, initializeSampleData } from '../../services/firebaseService';
import Icon from '../icons/Icon';

const RoomList = ({ onRoomSelect }) => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        // Initialize sample data if needed
        await initializeSampleData();
        
        const result = await getAvailableRooms();
        if (result.success) {
          // Add image URLs to rooms
          const roomsWithImages = result.rooms.map(room => ({
            ...room,
            imageUrl: getRoomImageUrl(room.name)
          }));
          setRooms(roomsWithImages);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(t('errors.failedLoadProperties'));
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Function to get room image based on room name
  const getRoomImageUrl = (roomName) => {
    const roomImages = {
      'Deluxe View Suite': 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      'Executive Business Room': 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      'Family Paradise Suite': 'https://images.unsplash.com/photo-1592229505726-ca121762d5a1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      'Garden View Standard Room': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      'Luxury Presidential Suite': 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      'Cozy Studio Apartment': 'https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80',
      'Swimming Pool Suite': 'https://images.unsplash.com/photo-1544531523-4f04f097a362?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80'
    };
    
    return roomImages[roomName] || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80';
  };

  if (loading) {
    return <CardSkeleton count={3} variant="room" message={t('booking.loadingRooms')} />;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div>
      <div className="section-header">
        <h3>Browse Our Rooms</h3>
        <p>Select the perfect accommodation for your stay</p>
      </div>
      
      <div className="room-list">
        {rooms.map(room => (
          <div key={room.id} className="room-card">
            <div 
              className="room-image-placeholder"
              style={{ 
                backgroundImage: `url(${room.imageUrl})`
              }}
            ></div>
            <div className="room-content">
              <h3>{room.name}</h3>
              <p className="room-description">{room.description}</p>
              
              <div className="room-details">
                <div className="room-features">
                  {room.features && room.features.map((feature, index) => (
                    <span key={index} className="feature-tag link-with-icon">
                      <Icon name="check" size={14} />
                      <span>{feature}</span>
                    </span>
                  ))}
                </div>
                
                <div className="availability-status">
                  <span className={`status ${room.availability === 'Available' ? 'available' : 'limited'}`}>
                    {room.availability}
                  </span>
                </div>
              </div>
              
              <div className="room-price">${room.price}<span>/night</span></div>
              
              <button 
                className="book-button" 
                onClick={() => onRoomSelect(room)}
              >
                Select Room
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomList;
