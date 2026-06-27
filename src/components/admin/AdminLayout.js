'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from '@/lib/router-compat';
import { useAdmin } from '../../context/AdminContext';
import { useBooking } from '../../context/BookingContext';
import { useTranslation } from '../../context/I18nContext';
import { hasStoredAuth } from '../../api/authApi';
import { BRAND } from '../../config/brand';
import Icon from '../icons/Icon';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import BrandLogo from '../shared/BrandLogo';
import LoadingExperience from '../shared/LoadingExperience';
import { preloadRoute } from '@/lib/prefetch-route';
import { prefetchAdminSetupData } from '../../utils/prefetch';
import '../../styles/admin-panel.css';
import '../../styles/admin-ui.css';

const DESKTOP_DRAWER_MQ = '(min-width: 1024px)';

const STAFF_ALLOWED_PREFIXES = [
  '/admin/hotels',
  '/admin/properties',
  '/admin/rooms',
  '/admin/services',
  '/admin/availability-blocks',
  '/admin/bookings',
  '/admin/calendar',
  '/admin/reviews'
];

function canAccessPath(role, pathname) {
  if (role === 'admin') return true;
  if (role === 'staff') {
    return pathname === '/admin' || STAFF_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
  }
  return false;
}

const AdminLayout = ({ children }) => {
  const { adminUser, logout, propertyName, loaded } = useAdmin();
  const { logout: logoutGuestSession } = useBooking();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const accountMenuRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(DESKTOP_DRAWER_MQ).matches;
  });
  const [drawerOpen, setDrawerOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(DESKTOP_DRAWER_MQ).matches;
  });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((open) => !open), []);
  const closeAccountMenu = useCallback(() => setAccountMenuOpen(false), []);
  const toggleAccountMenu = useCallback(() => setAccountMenuOpen((open) => !open), []);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_DRAWER_MQ);
    const onChange = (e) => {
      setIsDesktop(e.matches);
      setDrawerOpen(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (isDesktop) return;
    closeDrawer();
  }, [location.pathname, closeDrawer, isDesktop]);

  useEffect(() => {
    closeAccountMenu();
  }, [location.pathname, closeAccountMenu]);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeDrawer();
    };

    if (!isDesktop) document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (!isDesktop) document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen, closeDrawer, isDesktop]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    const onPointerDown = (e) => {
      if (!accountMenuRef.current?.contains(e.target)) closeAccountMenu();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeAccountMenu();
    };

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [accountMenuOpen, closeAccountMenu]);

  const loadingMessages = [
    t('loading.workspace', 'Loading your workspace...'),
    t('loading.dashboard', 'Preparing dashboard...'),
    t('loading.bookings', 'Syncing bookings...')
  ];

  if (!loaded) return <LoadingExperience compact messages={loadingMessages} />;
  if (!adminUser || !hasStoredAuth()) return <Navigate to="/login" replace />;
  if (!['admin', 'staff'].includes(adminUser.role) || adminUser.is_active === false) {
    return <Navigate to="/login" replace />;
  }
  if (!canAccessPath(adminUser.role, location.pathname)) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = async () => {
    await logout();
    // The shared token causes BookingContext to hydrate the same staff user.
    // Clear both in-memory contexts so LoginPage cannot immediately redirect
    // the signed-out administrator to the customer bookings route.
    await logoutGuestSession();
    navigate('/login');
  };

  const navClass = ({ isActive }) => (isActive ? 'active' : '');
  const warmRoute = (path, prefetchSetup = false) => ({
    onMouseEnter: () => {
      preloadRoute(path);
      if (prefetchSetup) prefetchAdminSetupData();
    },
    onFocus: () => {
      preloadRoute(path);
      if (prefetchSetup) prefetchAdminSetupData();
    }
  });

  const shellClassName = [
    'admin-app',
    drawerOpen ? 'admin-drawer-open' : '',
    isDesktop ? 'admin-desktop' : '',
    isDesktop && !drawerOpen ? 'admin-sidebar-collapsed' : ''
  ].filter(Boolean).join(' ');

  const menuToggleLabel = isDesktop
    ? drawerOpen ? t('admin.collapseMenu', 'Collapse menu') : t('admin.expandMenu', 'Expand menu')
    : drawerOpen ? t('admin.closeMenu', 'Close menu') : t('admin.openMenu', 'Open menu');
  const adminDisplayName = adminUser.name || adminUser.full_name || adminUser.email || t('admin.roleFallback', 'Admin');
  const adminInitial = adminDisplayName.trim().charAt(0).toUpperCase() || 'A';
  const adminRoleLabel = {
    admin: t('admin.roleAdmin', 'Administrator'),
    staff: t('admin.roleStaff', 'Staff account')
  }[adminUser.role] || t('admin.roleStaff', 'Staff account');
  const isSystemAdmin = String(adminUser.role || '').toLowerCase() === 'admin';

  return (
    <div className={shellClassName}>
      <button
        type="button"
        className="admin-drawer-backdrop"
        aria-label={t('admin.closeMenu', 'Close menu')}
        onClick={closeDrawer}
      />

      <aside className="admin-sidebar admin-drawer" aria-hidden={!drawerOpen && !isDesktop}>
        <div className="admin-drawer-head">
          <Link to="/admin" className="admin-brand">
            <span className="admin-brand-mark" aria-hidden="true">
              <BrandLogo variant="icon" size="admin" />
            </span>
            <BrandLogo variant="full" size="admin" className="admin-brand-logo" />
          </Link>
          <button
            type="button"
            className="admin-sidebar-toggle"
            onClick={toggleDrawer}
            aria-expanded={drawerOpen}
            aria-label={menuToggleLabel}
            title={menuToggleLabel}
          >
            <Icon name={drawerOpen ? 'chevron-left' : 'chevron-right'} size={17} />
          </button>
        </div>

        <nav className="admin-nav" aria-label={t('admin.adminMenu', 'Admin menu')}>
          <div className="admin-nav-section">
            <p className="admin-nav-label">{t('admin.overview', 'Overview')}</p>
            <NavLink
              to="/admin"
              end
              className={navClass}
              aria-label={t('admin.dashboard', 'Dashboard')}
              title={t('admin.dashboard', 'Dashboard')}
              data-tooltip={t('admin.dashboard', 'Dashboard')}
              {...warmRoute('/admin')}
            >
              <Icon name="layout-dashboard" size={18} />
              <span>{t('admin.dashboard', 'Dashboard')}</span>
            </NavLink>
          </div>

          <div className="admin-nav-section">
            <p className="admin-nav-label">{t('admin.propertySetup', 'Property setup')}</p>
            <NavLink
              to="/admin/hotels"
              end
              className={navClass}
              aria-label={t('admin.properties', 'My properties')}
              title={t('admin.properties', 'My properties')}
              data-tooltip={t('admin.properties', 'My properties')}
              {...warmRoute('/admin/hotels', true)}
            >
              <Icon name="building-2" size={18} />
              <span>{t('admin.properties', 'My properties')}</span>
            </NavLink>
            <NavLink
              to="/admin/hotels/new"
              className={navClass}
              aria-label={t('admin.addProperty', 'Add property')}
              title={t('admin.addProperty', 'Add property')}
              data-tooltip={t('admin.addProperty', 'Add property')}
              {...warmRoute('/admin/hotels/new', true)}
            >
              <Icon name="plus" size={18} />
              <span>{t('admin.addProperty', 'Add property')}</span>
            </NavLink>
            {isSystemAdmin && (
              <>
                <NavLink
                  to="/admin/amenities"
                  className={navClass}
                  aria-label={t('admin.amenities', 'Amenities')}
                  title={t('admin.amenities', 'Amenities')}
                  data-tooltip={t('admin.amenities', 'Amenities')}
                  {...warmRoute('/admin/amenities', true)}
                >
                  <Icon name="check" size={18} />
                  <span>{t('admin.amenities', 'Amenities')}</span>
                </NavLink>
                <NavLink
                  to="/admin/service-categories"
                  className={navClass}
                  aria-label={t('admin.serviceCategories', 'Service categories')}
                  title={t('admin.serviceCategories', 'Service categories')}
                  data-tooltip={t('admin.serviceCategories', 'Service categories')}
                  {...warmRoute('/admin/service-categories', true)}
                >
                  <Icon name="clipboard-list" size={18} />
                  <span>{t('admin.serviceCategories', 'Service categories')}</span>
                </NavLink>
              </>
            )}
            <NavLink
              to="/admin/services"
              className={navClass}
              aria-label={t('admin.propertyServices', 'Property services')}
              title={t('admin.propertyServices', 'Property services')}
              data-tooltip={t('admin.propertyServices', 'Property services')}
              {...warmRoute('/admin/services', true)}
            >
              <Icon name="wallet" size={18} />
              <span>{t('admin.propertyServices', 'Property services')}</span>
            </NavLink>
            <NavLink
              to="/admin/rooms"
              className={navClass}
              aria-label={t('admin.roomTypes', 'Room types')}
              title={t('admin.roomTypes', 'Room types')}
              data-tooltip={t('admin.roomTypes', 'Room types')}
              {...warmRoute('/admin/rooms', true)}
            >
              <Icon name="bed-double" size={18} />
              <span>{t('admin.roomTypes', 'Room types')}</span>
            </NavLink>
          </div>

          {isSystemAdmin && (
            <div className="admin-nav-section">
              <p className="admin-nav-label">{t('admin.administration', 'Administration')}</p>
              <NavLink
                to="/admin/users"
                className={navClass}
                aria-label={t('admin.users', 'Users')}
                title={t('admin.users', 'Users')}
                data-tooltip={t('admin.users', 'Users')}
                {...warmRoute('/admin/users')}
              >
                <Icon name="users" size={18} />
                <span>{t('admin.users', 'Users')}</span>
              </NavLink>
              <NavLink
                to="/admin/audit-logs"
                className={navClass}
                aria-label={t('admin.auditLogs', 'Audit logs')}
                title={t('admin.auditLogs', 'Audit logs')}
                data-tooltip={t('admin.auditLogs', 'Audit logs')}
                {...warmRoute('/admin/audit-logs')}
              >
                <Icon name="history" size={18} />
                <span>{t('admin.auditLogs', 'Audit Logs')}</span>
              </NavLink>
            </div>
          )}
          {isSystemAdmin && (
            <div className="admin-nav-section">
              <p className="admin-nav-label">{t('admin.content', 'Content')}</p>
              <NavLink
                to="/admin/blog"
                className={navClass}
                aria-label={t('admin.blog', 'Blog')}
                title={t('admin.blog', 'Blog')}
                data-tooltip={t('admin.blog', 'Blog')}
                {...warmRoute('/admin/blog')}
              >
                <Icon name="file-text" size={18} />
                <span>{t('admin.blog', 'Blog')}</span>
              </NavLink>
              <NavLink
                to="/admin/blog/categories"
                className={navClass}
                aria-label={t('admin.blogCategories', 'Blog categories')}
                title={t('admin.blogCategories', 'Blog categories')}
                data-tooltip={t('admin.blogCategories', 'Blog categories')}
                {...warmRoute('/admin/blog/categories')}
              >
                <Icon name="folder" size={18} />
                <span>{t('admin.blogCategories', 'Blog categories')}</span>
              </NavLink>
              <NavLink
                to="/admin/seo"
                className={navClass}
                aria-label={t('admin.seo', 'SEO')}
                title={t('admin.seo', 'SEO')}
                data-tooltip={t('admin.seo', 'SEO')}
                {...warmRoute('/admin/seo')}
              >
                <Icon name="search" size={18} />
                <span>{t('admin.seo', 'SEO')}</span>
              </NavLink>
            </div>
          )}
          <div className="admin-nav-section">
            <p className="admin-nav-label">{t('admin.operations', 'Operations')}</p>
            <NavLink
              to="/admin/availability-blocks"
              className={navClass}
              aria-label={t('admin.availabilityBlocks', 'Availability blocks')}
              title={t('admin.availabilityBlocks', 'Availability blocks')}
              data-tooltip={t('admin.availabilityBlocks', 'Availability blocks')}
              {...warmRoute('/admin/availability-blocks')}
            >
              <Icon name="clock" size={18} />
              <span>{t('admin.availabilityBlocks', 'Availability blocks')}</span>
            </NavLink>
            <NavLink
              to="/admin/reviews"
              className={navClass}
              aria-label={t('admin.reviews', 'Reviews')}
              title={t('admin.reviews', 'Reviews')}
              data-tooltip={t('admin.reviews', 'Reviews')}
              {...warmRoute('/admin/reviews')}
            >
              <Icon name="star" size={18} />
              <span>{t('admin.reviews', 'Reviews')}</span>
            </NavLink>
            <NavLink
              to="/admin/bookings"
              className={navClass}
              aria-label={t('admin.bookings', 'Bookings')}
              title={t('admin.bookings', 'Bookings')}
              data-tooltip={t('admin.bookings', 'Bookings')}
              {...warmRoute('/admin/bookings')}
            >
              <Icon name="clipboard-list" size={18} />
              <span>{t('admin.bookings', 'Bookings')}</span>
            </NavLink>
            <NavLink
              to="/admin/calendar"
              className={navClass}
              aria-label={t('admin.calendar', 'Booking calendar')}
              title={t('admin.calendar', 'Booking calendar')}
              data-tooltip={t('admin.calendar', 'Booking calendar')}
              {...warmRoute('/admin/calendar')}
            >
              <Icon name="calendar" size={18} />
              <span>{t('admin.calendar', 'Booking calendar')}</span>
            </NavLink>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <div
            className={`admin-account-menu ${accountMenuOpen ? 'is-open' : ''}`}
            ref={accountMenuRef}
          >
            <button
              type="button"
              className="admin-account-trigger"
              onClick={toggleAccountMenu}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label={t('admin.openAccountMenu', 'Open account menu for {{name}}', { name: adminDisplayName })}
              title={adminDisplayName}
              data-tooltip={adminDisplayName}
            >
              <span className="admin-account-avatar" aria-hidden="true">
                {adminInitial}
              </span>
              <span className="admin-account-copy">
                <span className="admin-account-name">{adminDisplayName}</span>
                <span className="admin-account-role">{adminRoleLabel}</span>
              </span>
              <Icon name="chevron-down" size={16} className="admin-account-chevron" />
            </button>

            {accountMenuOpen && (
              <div className="admin-account-dropdown" role="menu">
                <NavLink to="/profile" role="menuitem" className="admin-account-menu-item">
                  <Icon name="user" size={16} />
                  <span>{t('admin.profile', 'Profile')}</span>
                </NavLink>
                <button
                  type="button"
                  role="menuitem"
                  className="admin-account-menu-item"
                  onClick={() => {
                    closeAccountMenu();
                    navigate('/profile');
                  }}
                >
                  <Icon name="settings" size={16} />
                  <span>{t('admin.settings', 'Account Settings')}</span>
                </button>
                {isSystemAdmin && (
                  <NavLink to="/admin/audit-logs" role="menuitem" className="admin-account-menu-item">
                    <Icon name="history" size={16} />
                    <span>{t('admin.auditTrail', 'Audit logs')}</span>
                  </NavLink>
                )}
                <NavLink to="/contact" role="menuitem" className="admin-account-menu-item">
                  <Icon name="circle-help" size={16} />
                  <span>{t('admin.help', 'Help')}</span>
                </NavLink>
                <button type="button" role="menuitem" className="admin-account-menu-item admin-account-menu-item--danger" onClick={handleLogout}>
                  <Icon name="log-out" size={16} />
                  <span>{t('admin.logout', 'Logout')}</span>
                </button>
              </div>
            )}
          </div>

          <NavLink
            to="/"
            className="admin-back-link"
            aria-label={t('admin.openGuestSite', 'Open guest site')}
            title={t('nav.guestSite', 'Guest site')}
            data-tooltip={t('nav.guestSite', 'Guest site')}
          >
            <Icon name="arrow-left" size={16} />
            <span>{t('nav.guestSite', 'Guest site')}</span>
          </NavLink>
        </div>
      </aside>

      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button
              type="button"
              className="admin-drawer-toggle"
              onClick={toggleDrawer}
              aria-expanded={drawerOpen}
              aria-label={menuToggleLabel}
            >
              <Icon name={drawerOpen ? 'x' : 'menu'} size={22} />
            </button>
            <div>
              <h1 className="admin-topbar-title">{t('admin.management', 'Property management')}</h1>
              <p className="admin-topbar-sub">{propertyName}</p>
            </div>
          </div>
          <div className="admin-topbar-end">
            <LanguageSwitcher variant="admin" />
          </div>
        </header>
        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
