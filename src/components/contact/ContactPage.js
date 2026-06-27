'use client';

import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { useTranslation } from '../../context/I18nContext';
import Icon from '../icons/Icon';
import { apiPost } from '../../api/client';
import '../../App.css';

const ContactPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiPost('/contact-messages/', {
        full_name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      setSubmitted(true);

      setTimeout(() => {
        setFormData({ name: '', email: '', subject: '', message: '' });
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      setError(err.message || t('errors.unexpected'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-header">
        <h1>{t('contact.title', null, { brand: BRAND.name })}</h1>
        <p>{t('contact.subtitle')}</p>
      </div>

      <div className="contact-content">

        <div className="contact-info">
          <h2>{t('contact.getInTouch')}</h2>

          <div className="contact-details">

            <div className="contact-item">
              <div className="contact-icon">
                <Icon name="map-pin" size={26} />
              </div>

              <div>
                <h3>{t('contact.address')}</h3>
                <p>{BRAND.address}</p>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon">
                <Icon name="phone" size={26} />
              </div>

              <div>
                <h3>{t('contact.phone')}</h3>

                {Array.isArray(BRAND.phones)
                  ? BRAND.phones.map((phone) => (
                    <p key={phone}>{phone}</p>
                  ))
                  : (
                    <p>{BRAND.phone}</p>
                  )}
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon">
                <Icon name="mail" size={26} />
              </div>

              <div>
                <h3>{t('contact.email')}</h3>

                {Array.isArray(BRAND.emails)
                  ? BRAND.emails.map((email) => (
                    <p key={email}>{email}</p>
                  ))
                  : (
                    <p>{BRAND.email}</p>
                  )}
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon">
                <Icon name="clock" size={26} />
              </div>

              <div>
                <h3>{t('nav.support')}</h3>
                <p>{t('contact.customerService')}</p>
              </div>
            </div>

          </div>
        </div>

        <div className="contact-form-section">
          <h2>{t('contact.send')}</h2>

          {submitted ? (
            <div className="success-message">
              <div className="check-icon">
                <Icon name="check" size={40} />
              </div>

              <h3>{t('contact.thankYou')}</h3>

              <p>{t('contact.thankYouDesc')}</p>
            </div>
          ) : (
            <form
              className="contact-form"
              onSubmit={handleSubmit}
            >
              {error && (
                <div className="form-error">{error}</div>
              )}

              <div className="form-row">

                <div className="form-group">
                  <label htmlFor="name">{t('contact.name')}</label>

                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">{t('contact.email')}</label>

                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                  />
                </div>

              </div>

              <div className="form-group">
                <label htmlFor="subject">{t('contact.subject')}</label>

                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">{t('contact.message')}</label>

                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  rows="5"
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? t('contact.sending') : t('contact.send')}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

export default ContactPage;
