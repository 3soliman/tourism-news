import React from 'react';
import { useTranslation } from '../../context/I18nContext';

const BADGE_KEYS = {
  'sold-out': 'hotel.soldOut',
  'last-one': 'hotel.lastOneRoom',
  'few-left': 'hotel.fewRoomsLeft',
  available: 'hotel.available'
};

const RoomAvailabilityBadge = ({ badge }) => {
  const { t } = useTranslation();
  if (!badge) return null;
  const label = t(BADGE_KEYS[badge.key], badge.label);
  return <span className={badge.className}>{label}</span>;
};

export default RoomAvailabilityBadge;
