'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from '@/lib/router-compat';
import { useBooking } from '../../context/BookingContext';
import { useAdmin } from '../../context/AdminContext';
import { useHotels } from '../../context/HotelsContext';
import { useTranslation } from '../../context/I18nContext';
import { BRAND } from '../../config/brand';
import Icon from '../icons/Icon';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import BrandLogo from '../shared/BrandLogo';
import { preloadRoute } from '@/lib/prefetch-route';
import { prefetchGuestSearchData } from '../../utils/prefetch';
import { TRUST_PAGE_LINKS } from '@/config/trustPages';
import CookieConsent from '../shared/CookieConsent';

const navItems = [
  { to: '/', label: 'Home', icon: 'hotel', end: true },
  { to: '/search', label: 'Explore stays', shortLabel: 'Explore', icon: 'search', prefetchSearch: true },
  { to: '/blog', label: 'Blog', icon: 'file-text' },
  { to: '/my-bookings', label: 'My trips', icon: 'calendar' },
  { to: '/contact', label: 'Contact', icon: 'circle-help' }
];

const AppLayout = ({ children }) => {
  const { user, logout, cart } = useBooking();
  const { adminUser, logout: adminLogout } = useAdmin();
  const { ensureLoaded } = useHotels();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accountRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isAdmin = adminUser && ['admin', 'staff'].includes(adminUser.role);
  const effectiveUser = user || adminUser;
  
  const getTranslatedLabel = (label) => {
    if (label === 'Home') return t('nav.home', 'Home');
    if (label === 'Explore stays' || label === 'Explore') return t('nav.explore', 'Explore stays');
    if (label === 'My trips') return t('nav.trips', 'My trips');
    if (label === 'Contact') return t('nav.contact', 'Contact');
    if (label === 'Blog') return t('nav.blog', 'Blog');
    if (label === 'Admin Dashboard') return t('nav.adminDashboard', 'Admin Dashboard');
    return label;
  };

  const userDisplayName = effectiveUser?.full_name || effectiveUser?.name || effectiveUser?.email || t('common.guest');
  const userEmail = effectiveUser?.email || t('nav.travelerAccount');
  const userInitial = userDisplayName.trim().charAt(0).toUpperCase() || 'G';

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('guest-menu-open', mobileMenuOpen);
    return () => document.body.classList.remove('guest-menu-open');
  }, [mobileMenuOpen]);

  const allNavItems = React.useMemo(() => {
    const items = [...navItems];
    if (isAdmin) {
      items.push({ to: '/admin', label: 'Admin Dashboard', icon: 'shield', end: false });
    }
    return items;
  }, [isAdmin]);

  const handleLogout = async () => {
    setAccountOpen(false);
    setMobileMenuOpen(false);
    await logout();
    if (isAdmin) await adminLogout();
    navigate('/');
  };

  const closeMenus = useCallback(() => {
    setAccountOpen(false);
    setMobileMenuOpen(false);
  }, []);

  const warmRoute = (path, prefetchSearch = false) => ({
    onMouseEnter: () => {
      preloadRoute(path);
      if (prefetchSearch) prefetchGuestSearchData(ensureLoaded);
    },
    onFocus: () => {
      preloadRoute(path);
      if (prefetchSearch) prefetchGuestSearchData(ensureLoaded);
    }
  });

  const navClassName = ({ isActive }) => (isActive ? 'guest-nav-link is-active' : 'guest-nav-link');
  const mobileNavClassName = ({ isActive }) => (isActive ? 'guest-mobile-link is-active' : 'guest-mobile-link');
  const headerClassName = `app-header guest-header ${isScrolled ? 'is-scrolled' : ''}`;
  const supportPhone = BRAND.phones?.[0] || '';
  const supportEmail = BRAND.emails?.[0] || '';

  const renderNavLink = (item, className = navClassName) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={className}
      onClick={closeMenus}
      {...warmRoute(item.to, item.prefetchSearch)}
    >
      <Icon name={item.icon} size={14} />
      <span>{getTranslatedLabel(item.shortLabel || item.label)}</span>
    </NavLink>
  );

  return (
    <div className="App site-shell">
      <header className={headerClassName}>
        <div className="logo-container">
          <NavLink to="/" className="logo-link logo-link--brand" aria-label={BRAND.name}>
            <BrandLogo variant="full" size="header" priority />
            <BrandLogo variant="icon" size="header" />
          </NavLink>
        </div>

        <nav className="main-navigation guest-desktop-nav" aria-label={t('nav.travelerNav')}>
          {allNavItems.map((item) => renderNavLink(item))}
          {cart && (
            <NavLink to="/checkout" className="guest-nav-link cart-badge-nav" onClick={closeMenus} {...warmRoute('/checkout')}>
              <Icon name="credit-card" size={14} />
              <span>{t('nav.checkout', 'Checkout')}</span>
              <span className="guest-nav-count">1</span>
            </NavLink>
          )}
        </nav>

        <div className="guest-header-actions">
          <LanguageSwitcher />
          {effectiveUser ? (
            <div className={`guest-account ${accountOpen ? 'is-open' : ''}`} ref={accountRef}>
              <button
                type="button"
                className="guest-account-trigger"
                onClick={() => setAccountOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label={t('nav.openAccountMenu', null, { name: userDisplayName })}
              >
                <span className="user-account-badge__initial" aria-hidden="true">
                  {userInitial}
                </span>
                <span className="guest-account-copy">
                  <span className="user-account-badge__name">{userDisplayName}</span>
                  <small>{t('nav.travelerAccount')}</small>
                </span>
                <Icon name="chevron-down" size={14} className="guest-account-chevron" />
              </button>

              {accountOpen && (
                <div className="guest-account-menu" role="menu">
                  <div className="guest-account-menu-head">
                    <span className="guest-account-menu-avatar" aria-hidden="true">{userInitial}</span>
                    <div>
                      <strong>{userDisplayName}</strong>
                      <span>{userEmail}</span>
                    </div>
                  </div>
                  <NavLink to="/profile" role="menuitem" className="guest-account-menu-item" onClick={closeMenus} {...warmRoute('/profile')}>
                    <Icon name="user" size={16} />
                    <span>{t('nav.profile', 'My Profile')}</span>
                  </NavLink>
                  <NavLink to="/my-bookings" role="menuitem" className="guest-account-menu-item" onClick={closeMenus} {...warmRoute('/my-bookings')}>
                    <Icon name="calendar" size={16} />
                    <span>{t('nav.trips', 'My Trips')}</span>
                  </NavLink>
                  <button type="button" role="menuitem" className="guest-account-menu-item is-disabled" disabled>
                    <Icon name="star" size={16} />
                    <span>{t('nav.savedProperties', 'Saved Properties')}</span>
                  </button>
                  <NavLink to="/profile" role="menuitem" className="guest-account-menu-item" onClick={closeMenus} {...warmRoute('/profile')}>
                    <Icon name="settings" size={16} />
                    <span>{t('nav.settings', 'Settings')}</span>
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/admin" role="menuitem" className="guest-account-menu-item" onClick={closeMenus} {...warmRoute('/admin')}>
                      <Icon name="shield" size={16} />
                      <span>{t('nav.adminDashboard', 'Admin Dashboard')}</span>
                    </NavLink>
                  )}
                  <button type="button" role="menuitem" className="guest-account-menu-item is-danger" onClick={handleLogout}>
                    <Icon name="log-out" size={16} />
                    <span>{t('nav.signOut', 'Sign Out')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <NavLink to="/login" className="guest-sign-in" onClick={closeMenus} {...warmRoute('/login')}>
              <Icon name="user" size={14} />
              <span>{t('nav.signIn', 'Sign in')}</span>
            </NavLink>
          )}

          <button
            type="button"
            className="guest-menu-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="guest-mobile-menu"
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            <Icon name={mobileMenuOpen ? 'x' : 'menu'} size={20} />
          </button>
        </div>

        <div className={`guest-mobile-backdrop ${mobileMenuOpen ? 'is-open' : ''}`} aria-hidden="true" />
        <aside
          id="guest-mobile-menu"
          ref={mobileMenuRef}
          className={`guest-mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="guest-mobile-drawer-head">
            <BrandLogo variant="full" size="sm" className="guest-mobile-brand" />
            <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label={t('nav.closeMenu')}>
              <Icon name="x" size={20} />
            </button>
          </div>
          <nav className="guest-mobile-nav" aria-label={t('nav.mobileTravelerNav')}>
            {allNavItems.map((item) => renderNavLink(item, mobileNavClassName))}
            {cart && (
              <NavLink to="/checkout" className="guest-mobile-link" onClick={closeMenus} {...warmRoute('/checkout')}>
                <Icon name="credit-card" size={17} />
                <span>{t('nav.checkout', 'Checkout')}</span>
                <span className="guest-nav-count">1</span>
              </NavLink>
            )}
          </nav>
          <div className="guest-mobile-account">
            {effectiveUser ? (
              <>
                <div className="guest-mobile-user">
                  <span className="guest-account-menu-avatar" aria-hidden="true">{userInitial}</span>
                  <div>
                    <strong>{userDisplayName}</strong>
                    <span>{userEmail}</span>
                  </div>
                </div>
                <NavLink to="/profile" className="guest-mobile-action" onClick={closeMenus} {...warmRoute('/profile')}>
                  <Icon name="user" size={17} />
                  <span>{t('nav.profile', 'My Profile')}</span>
                </NavLink>
                <NavLink to="/profile" className="guest-mobile-action" onClick={closeMenus} {...warmRoute('/profile')}>
                  <Icon name="settings" size={17} />
                  <span>{t('nav.settings', 'Settings')}</span>
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className="guest-mobile-action" onClick={closeMenus} {...warmRoute('/admin')}>
                    <Icon name="shield" size={17} />
                    <span>{t('nav.adminDashboard', 'Admin Dashboard')}</span>
                  </NavLink>
                )}
                <button type="button" className="guest-mobile-action is-danger" onClick={handleLogout}>
                  <Icon name="log-out" size={17} />
                  <span>{t('nav.signOut', 'Sign Out')}</span>
                </button>
              </>
            ) : (
              <NavLink to="/login" className="guest-mobile-sign-in" onClick={closeMenus} {...warmRoute('/login')}>
                <Icon name="log-in" size={17} />
                <span>{t('nav.signIn', 'Sign in')}</span>
              </NavLink>
            )}
          </div>
        </aside>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section footer-section--brand">
            <div className="footer-brand-lockup">
              <BrandLogo variant="full" size="footer" />
            </div>
            <NavLink to="/search" className="footer-primary-link" {...warmRoute('/search', true)}>
              <span>{t('nav.explore', 'Explore stays')}</span>
              <Icon name="arrow-right" size={16} />
            </NavLink>
          </div>
          <div className="footer-section footer-section--links">
            <h4>{t('nav.discover', 'Discover')}</h4>
            <nav className="footer-link-grid" aria-label={t('nav.travelerNav')}>
              <NavLink to="/">{t('nav.home', 'Home')}</NavLink>
              <NavLink to="/search" {...warmRoute('/search', true)}>{t('nav.explore', 'All hotels')}</NavLink>
              <NavLink to="/blog" {...warmRoute('/blog')}>{t('nav.blog', 'Blog')}</NavLink>
              <NavLink to="/my-bookings" {...warmRoute('/my-bookings')}>{t('nav.trips', 'My trips')}</NavLink>
              <NavLink to="/contact" {...warmRoute('/contact')}>{t('nav.contact', 'Contact')}</NavLink>
              {isAdmin && <NavLink to="/admin" {...warmRoute('/admin')}>{t('nav.adminDashboard', 'Admin Dashboard')}</NavLink>}
            </nav>
          </div>
          <div className="footer-section footer-section--support">
            <h4>{t('nav.support', 'Support')}</h4>
            <p className="footer-contact-line">
              <Icon name="map-pin" size={18} />
              <span>{BRAND.address}</span>
            </p>
            {supportPhone && (
              <a className="footer-contact-line" href={`tel:${supportPhone.replace(/\s+/g, '')}`}>
                <Icon name="phone" size={18} />
                <span>{supportPhone}</span>
              </a>
            )}
            {supportEmail && (
              <a className="footer-contact-line" href={`mailto:${supportEmail}`}>
                <Icon name="mail" size={18} />
                <span>{supportEmail}</span>
              </a>
            )}
            <div className="footer-owner-link">
              <NavLink to="/login" {...warmRoute('/login')}>
                <Icon name="building-2" size={18} />
                <span>{t('nav.ownerPortal', 'Hotel owner portal')}</span>
              </NavLink>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <nav className="footer-legal-links" aria-label={t('trust.sectionTitle')}>
            {TRUST_PAGE_LINKS.map((item) => (
              <NavLink key={item.id} to={item.path} {...warmRoute(item.path)}>
                {t(`trust.${item.id}`)}
              </NavLink>
            ))}
          </nav>
          <p>{BRAND.copyright}</p>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
};

export default AppLayout;
