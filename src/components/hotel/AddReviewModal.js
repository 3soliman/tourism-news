import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import InteractiveStarRating from './InteractiveStarRating';
import { formatReviewApiError, submitPropertyReview } from '../../api/reviewsApi';
import { useTranslation } from '../../context/I18nContext';

const EMPTY_FORM = {
  guestName: '',
  guestEmail: '',
  title: '',
  comment: '',
  rating: 0,
  cleanliness: 0,
  location: 0,
  staff: 0,
  comfort: 0,
  valueForMoney: 0
};

const OPTIONAL_CATEGORIES = [
  { key: 'cleanliness', labelKey: 'hotel.cleanliness' },
  { key: 'location', labelKey: 'hotel.locationScore' },
  { key: 'staff', labelKey: 'hotel.staff' },
  { key: 'comfort', labelKey: 'hotel.comfort' },
  { key: 'valueForMoney', labelKey: 'hotel.value' }
];

const AddReviewModal = ({ propertyId, open, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showOptional, setShowOptional] = useState(false);

  const optionalCategories = useMemo(
    () =>
      OPTIONAL_CATEGORIES.map((item) => ({
        ...item,
        label: t(item.labelKey)
      })),
    [t]
  );

  useEffect(() => {
    if (!open) return undefined;
    setForm(EMPTY_FORM);
    setError(null);
    setShowOptional(false);
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.guestName.trim()) {
      setError(t('hotel.nameRequiredReview', 'Please enter your name.'));
      return;
    }
    if (!form.guestEmail.trim()) {
      setError(t('hotel.emailRequiredReview', 'Please enter your email.'));
      return;
    }
    if (!form.comment.trim()) {
      setError(t('hotel.commentRequired', 'Please write your review comment.'));
      return;
    }
    if (!form.rating || form.rating < 1) {
      setError(t('hotel.ratingOverallRequired', 'Please select an overall rating.'));
      return;
    }

    setSubmitting(true);
    try {
      const review = await submitPropertyReview(propertyId, form);
      onSuccess?.(review);
      onClose();
    } catch (err) {
      setError(formatReviewApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-modal-backdrop" onClick={submitting ? undefined : onClose} role="presentation">
      <div
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="review-modal__header">
          <h2 id="add-review-title">{t('hotel.reviewTitle', 'Write a review')}</h2>
          <button
            type="button"
            className="review-modal__close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('common.close', 'Close')}
          >
            <Icon name="x" size={20} />
          </button>
        </header>

        <form className="review-modal__form" onSubmit={handleSubmit} noValidate>
          {error && <p className="field-error review-modal__error">{error}</p>}

          <div className="review-modal__grid">
            <label className="review-modal__field">
              <span>{t('hotel.yourName', 'Your name')} {t('common.required', '*')}</span>
              <input
                type="text"
                value={form.guestName}
                onChange={(e) => setField('guestName')(e.target.value)}
                disabled={submitting}
                autoComplete="name"
                required
              />
            </label>
            <label className="review-modal__field">
              <span>{t('checkout.email', 'Email')} {t('common.required', '*')}</span>
              <input
                type="email"
                value={form.guestEmail}
                onChange={(e) => setField('guestEmail')(e.target.value)}
                disabled={submitting}
                autoComplete="email"
                required
              />
            </label>
          </div>

          <label className="review-modal__field">
            <span>{t('hotel.reviewTitleField', 'Review title')}</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setField('title')(e.target.value)}
              disabled={submitting}
              placeholder={t('hotel.summarizeStay', 'Summarize your stay')}
            />
          </label>

          <label className="review-modal__field">
            <span>{t('hotel.yourReview', 'Your review')} {t('common.required', '*')}</span>
            <textarea
              rows={4}
              value={form.comment}
              onChange={(e) => setField('comment')(e.target.value)}
              disabled={submitting}
              placeholder={t('hotel.tellExperience', 'Tell other guests about your experience')}
              required
            />
          </label>

          <div className="review-modal__field">
            <span>{t('hotel.overallRating', 'Overall rating')} {t('common.required', '*')}</span>
            <InteractiveStarRating
              value={form.rating}
              onChange={setField('rating')}
              disabled={submitting}
              label={t('hotel.overallRating', 'Overall rating')}
            />
          </div>

          <button
            type="button"
            className="review-modal__toggle-optional"
            onClick={() => setShowOptional((v) => !v)}
          >
            {showOptional
              ? t('hotel.hideDetailedRatings', 'Hide detailed ratings (optional)')
              : t('hotel.addDetailedRatings', 'Add detailed ratings (optional)')}
          </button>

          {showOptional && (
            <div className="review-modal__optional">
              {optionalCategories.map(({ key, label }) => (
                <div key={key} className="review-modal__optional-row">
                  <span>{label}</span>
                  <InteractiveStarRating
                    value={form[key]}
                    onChange={setField(key)}
                    size={18}
                    disabled={submitting}
                    label={label}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="review-modal__actions">
            <button type="button" className="link-button" onClick={onClose} disabled={submitting}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="book-button" disabled={submitting}>
              {submitting
                ? t('checkout.submitting', 'Submitting…')
                : t('hotel.submitReview', 'Submit review')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddReviewModal;
