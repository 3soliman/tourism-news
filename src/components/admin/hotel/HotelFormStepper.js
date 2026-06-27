import React from 'react';
import { HOTEL_FORM_STEPS } from '../../../constants/hotelFormSteps';
import Icon from '../../icons/Icon';

const HotelFormStepper = ({ currentStep }) => (
  <nav className="hotel-stepper" aria-label="Add property steps">
    <ol className="hotel-stepper-list">
      {HOTEL_FORM_STEPS.map((step) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <li
            key={step.id}
            className={`hotel-stepper-item ${active ? 'active' : ''} ${done ? 'done' : ''}`}
          >
            <span className="hotel-stepper-num">
              {done ? <Icon name="check" size={14} /> : step.id}
            </span>
            <div className="hotel-stepper-text">
              <strong>{step.title}</strong>
              <span>{step.subtitle}</span>
            </div>
          </li>
        );
      })}
    </ol>
  </nav>
);

export default HotelFormStepper;
