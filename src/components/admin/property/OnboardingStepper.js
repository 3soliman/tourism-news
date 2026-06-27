import React from 'react';
import Icon from '../../icons/Icon';

const OnboardingStepper = ({ steps, currentStep, onStepClick, compact = false, stepErrors = {} }) => {
  const total = steps.length;
  const progressPct = Math.round(((currentStep - 1) / (total - 1)) * 100);

  return (
    <nav className={`onboarding-stepper${compact ? ' onboarding-stepper--compact' : ''}`} aria-label="Onboarding progress">
      {/* Progress header */}
      <div className="onboarding-stepper__header">
        <span className="onboarding-stepper__header-title">Setup progress</span>
        <span className="onboarding-stepper__header-pct">{progressPct}%</span>
      </div>
      <div className="onboarding-stepper__progress-bar">
        <div className="onboarding-stepper__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Track */}
      <div className="onboarding-stepper__track" aria-hidden="true">
        <div
          className="onboarding-stepper__fill"
          style={{ height: `${((currentStep - 1) / (total - 1)) * 100}%` }}
        />
      </div>

      {/* Steps */}
      {steps.map((step) => {
        const isActive = currentStep === step.id;
        const isCompleted = step.id < currentStep;
        const isDisabled = step.id > currentStep;
        const hasError = Boolean(stepErrors[step.id]);

        return (
          <button
            key={step.id}
            type="button"
            className={`onboarding-stepper__item${isActive ? ' is-active' : ''}${isCompleted ? ' is-completed' : ''}${isDisabled ? ' is-disabled' : ''}${hasError ? ' has-error' : ''}`}
            onClick={() => !isDisabled && onStepClick(step.id)}
            disabled={isDisabled}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`${isCompleted ? 'Completed: ' : ''}${hasError ? 'Has errors: ' : ''}${step.title} — ${step.subtitle}`}
          >
            <div className="onboarding-stepper__circle">
              {hasError ? (
                <Icon name="circle-help" size={14} className="onboarding-stepper__error" />
              ) : isCompleted ? (
                <Icon name="check" size={14} className="onboarding-stepper__check" />
              ) : (
                <span>{step.id}</span>
              )}
            </div>
            <div className="onboarding-stepper__content">
              <span className="onboarding-stepper__title">{step.title}</span>
              {!compact && <span className="onboarding-stepper__subtitle">{step.subtitle}</span>}
            </div>
          </button>
        );
      })}
    </nav>
  );
};

export default OnboardingStepper;
