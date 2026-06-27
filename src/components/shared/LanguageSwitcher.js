import React from 'react';
import { useTranslation } from '../../context/I18nContext';
import Icon from '../icons/Icon';

const LanguageSwitcher = ({ variant = 'default' }) => {
  const { locale, changeLanguage, t } = useTranslation();

  const handleToggle = () => {
    changeLanguage(locale === 'en' ? 'ar' : 'en');
  };

  const isAr = locale === 'ar';
  const nextLabel = isAr ? t('language.english', 'English') : t('language.arabic', 'العربية');
  const switchLabel = isAr
    ? t('language.switchToEnglish', 'Switch to English')
    : t('language.switchToArabic', 'Switch to Arabic');

  return (
    <button
      type="button"
      className={`lang-switcher-btn lang-switcher-btn--${variant}`}
      onClick={handleToggle}
      aria-label={switchLabel}
      title={switchLabel}
    >
      <Icon name="languages" size={16} aria-hidden="true" />
      <span className="lang-switcher-btn__label">{nextLabel}</span>
    </button>
  );
};

export default LanguageSwitcher;
