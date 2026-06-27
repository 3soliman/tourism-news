import React from 'react';
import { formatMoney, formatStayDate } from '../../utils/roomAvailability';

const RoomRateBreakdown = ({ rate, nights }) => {
  if (!rate?.nightlyPrices?.length) return null;

  return (
    <details className="room-rate-breakdown">
      <summary>Price breakdown ({nights} night{nights !== 1 ? 's' : ''})</summary>
      <ul className="room-rate-breakdown__list">
        {rate.nightlyPrices.map((night) => (
          <li key={night.date}>
            <span>{formatStayDate(night.date)}</span>
            <span>{formatMoney(night.price, rate.currency)}</span>
          </li>
        ))}
        <li className="room-rate-breakdown__total">
          <span>Total</span>
          <strong>{formatMoney(rate.baseTotal, rate.currency)}</strong>
        </li>
      </ul>
    </details>
  );
};

export default RoomRateBreakdown;
