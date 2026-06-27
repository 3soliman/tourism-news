import React from 'react';
import Icon from '../icons/Icon';
import { useTranslation } from '../../context/I18nContext';
import BrandLogo from '../shared/BrandLogo';

const Header = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const userDisplayName = user?.full_name || user?.name || user?.email || t('common.guest', 'Guest');
  const userInitial = userDisplayName.trim().charAt(0).toUpperCase() || 'G';

  return (
    <header className="app-header">
      <div className="logo-container">
        <BrandLogo variant="full" size="header" />
      </div>
      {user && (
        <div className="user-info">
          <span className="user-account-badge" title={userDisplayName}>
            <span className="user-account-badge__initial" aria-hidden="true">
              {userInitial}
            </span>
            <span className="user-account-badge__name">{userDisplayName}</span>
          </span>
          <button type="button" onClick={onLogout} className="logout-btn">{t('common.logout', 'Logout')}</button>
        </div>
      )}
    </header>
  );
};

export default Header;
