'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import {
  fetchUserById,
  roleBadgeClass,
  roleLabel,
  roleOptions,
  activateUser,
  deactivateUser,
  changeUserRole,
  resetUserPassword
} from '../../api/usersApi';
import { useTranslation } from '../../context/I18nContext';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import AdminIconButton from '../../components/admin/AdminIconButton';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import Icon from '../../components/icons/Icon';

const ROLE_LABEL_KEYS = {
  admin: 'pages.users.roleAdmin',
  staff: 'pages.users.roleStaff',
  customer: 'pages.users.roleCustomer'
};

const AdminUserDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotifications();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  const emDash = t('common.emDash', '—');

  const formatDate = useCallback((value) => {
    if (!value) return emDash;
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(value));
    } catch {
      return emDash;
    }
  }, [emDash]);

  const translateRole = useCallback(
    (role) => t(ROLE_LABEL_KEYS[role], roleLabel(role)),
    [t]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await fetchUserById(id));
    } catch (err) {
      setError(err.message || t('pages.userDetail.errorLoad', 'Failed to load user'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleActivate = async () => {
    setActionLoading('activate');
    try {
      await activateUser(id);
      setUser((prev) => ({ ...prev, isActive: true }));
      notify.success(t('pages.userDetail.activateSuccess', 'User activated successfully'));
    } catch (err) {
      notify.error(err.message || t('pages.userDetail.activateError', 'Failed to activate user'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async () => {
    setActionLoading('deactivate');
    try {
      await deactivateUser(id);
      setUser((prev) => ({ ...prev, isActive: false }));
      notify.success(t('pages.userDetail.deactivateSuccess', 'User deactivated successfully'));
    } catch (err) {
      notify.error(err.message || t('pages.userDetail.deactivateError', 'Failed to deactivate user'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedRole || selectedRole === user.role) {
      setShowRolePicker(false);
      return;
    }
    setActionLoading('role');
    try {
      await changeUserRole(id, selectedRole);
      setUser((prev) => ({ ...prev, role: selectedRole, roleDisplay: selectedRole }));
      notify.success(t('pages.userDetail.roleChangeSuccess', 'Role changed to {{role}}', {
        role: translateRole(selectedRole)
      }));
      setShowRolePicker(false);
    } catch (err) {
      notify.error(err.message || t('pages.userDetail.roleChangeError', 'Failed to change role'));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) {
      notify.error(t('pages.userDetail.passwordMinLength', 'Password must be at least 8 characters'));
      return;
    }
    setActionLoading('password');
    try {
      await resetUserPassword(id, newPassword);
      notify.success(t('pages.userDetail.passwordResetSuccess', 'Password reset successfully'));
      setShowPasswordReset(false);
      setNewPassword('');
    } catch (err) {
      notify.error(err.message || t('pages.userDetail.passwordResetError', 'Failed to reset password'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <ApiLoading message={t('pages.userDetail.loading', 'Loading user details...')} variant="page" />;
  if (error) return <div className="admin-page"><ApiError message={error} onRetry={load} /></div>;
  if (!user) return null;

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <div className="admin-breadcrumb">
            <button type="button" className="admin-link-button" onClick={() => navigate('/admin/users')}>
              {t('pages.userDetail.breadcrumbUsers', 'Users')}
            </button>
            <span> / </span>
            <span>{user.fullName || user.email}</span>
          </div>
          <h2>{user.fullName || t('pages.userDetail.title', 'User')}</h2>
        </div>
        <AdminIconButton icon="refresh-cw" label={t('common.refresh', 'Refresh')} onClick={load} loading={loading} />
      </div>

      <div className="admin-detail-grid">
        <section className="admin-panel-card">
          <div className="admin-detail-card-header">
            <Icon name="user" size={20} />
            <h3>{t('pages.userDetail.profile', 'Profile')}</h3>
          </div>
          <dl className="admin-detail-list">
            <dt>{t('pages.userDetail.email', 'Email')}</dt><dd>{user.email}</dd>
            <dt>{t('pages.userDetail.phone', 'Phone')}</dt><dd>{user.phone || emDash}</dd>
            <dt>{t('pages.userDetail.role', 'Role')}</dt>
            <dd>
              <span className={roleBadgeClass(user.role)}>{translateRole(user.role)}</span>
            </dd>
            <dt>{t('pages.userDetail.status', 'Status')}</dt>
            <dd>
              <span className={`owners-status owners-status--${user.isActive ? 'active' : 'inactive'}`}>
                <span aria-hidden="true" />
                {user.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
              </span>
            </dd>
            <dt>{t('pages.userDetail.staffAccess', 'Staff access')}</dt>
            <dd>{user.isStaff ? t('common.yes', 'Yes') : t('common.no', 'No')}</dd>
            <dt>{t('pages.userDetail.superuser', 'Superuser')}</dt>
            <dd>{user.isSuperuser ? t('common.yes', 'Yes') : t('common.no', 'No')}</dd>
            <dt>{t('pages.userDetail.lastLogin', 'Last login')}</dt><dd>{formatDate(user.lastLogin)}</dd>
            <dt>{t('pages.userDetail.created', 'Created')}</dt><dd>{formatDate(user.createdAt)}</dd>
            <dt>{t('pages.userDetail.updated', 'Updated')}</dt><dd>{formatDate(user.updatedAt)}</dd>
          </dl>
        </section>

        <section className="admin-panel-card">
          <div className="admin-detail-card-header">
            <Icon name="zap" size={20} />
            <h3>{t('pages.userDetail.actions', 'Actions')}</h3>
          </div>
          <div className="admin-user-actions">
            {user.isActive ? (
              <button
                type="button"
                className="admin-btn admin-btn-danger admin-btn-block"
                onClick={() => setConfirmTarget('deactivate')}
                disabled={actionLoading === 'deactivate'}
              >
                {actionLoading === 'deactivate'
                  ? t('pages.userDetail.deactivating', 'Deactivating...')
                  : t('pages.userDetail.deactivateUser', 'Deactivate user')}
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-btn-block"
                onClick={handleActivate}
                disabled={actionLoading === 'activate'}
              >
                {actionLoading === 'activate'
                  ? t('pages.userDetail.activating', 'Activating...')
                  : t('pages.userDetail.activateUser', 'Activate user')}
              </button>
            )}

            {showRolePicker ? (
              <div className="admin-user-role-picker">
                <select
                  value={selectedRole || user.role}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="admin-input"
                >
                  {roleOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>{translateRole(opt.value)}</option>
                  ))}
                </select>
                <div className="admin-user-role-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={handleRoleChange}
                    disabled={actionLoading === 'role'}
                  >
                    {actionLoading === 'role'
                      ? t('pages.userDetail.saving', 'Saving...')
                      : t('pages.userDetail.save', 'Save')}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={() => setShowRolePicker(false)}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-block"
                onClick={() => { setSelectedRole(user.role); setShowRolePicker(true); }}
              >
                {t('pages.userDetail.changeRole', 'Change role')}
              </button>
            )}

            {showPasswordReset ? (
              <div className="admin-user-password-reset">
                <input
                  type="password"
                  placeholder={t('pages.userDetail.newPasswordPlaceholder', 'New password (min 8 chars)')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="admin-input"
                />
                <div className="admin-user-role-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={handlePasswordReset}
                    disabled={actionLoading === 'password'}
                  >
                    {actionLoading === 'password'
                      ? t('pages.userDetail.resetting', 'Resetting...')
                      : t('pages.userDetail.reset', 'Reset')}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={() => { setShowPasswordReset(false); setNewPassword(''); }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-block"
                onClick={() => setShowPasswordReset(true)}
              >
                {t('pages.userDetail.resetPassword', 'Reset password')}
              </button>
            )}
          </div>
        </section>
      </div>

      {user.ownedProperties.length > 0 && (
        <section className="admin-panel-card">
          <div className="admin-detail-card-header">
            <Icon name="building-2" size={20} />
            <h3>{t('pages.userDetail.ownedProperties', 'Owned properties ({{count}})', { count: user.ownedProperties.length })}</h3>
          </div>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('pages.userDetail.name', 'Name')}</th>
                  <th>{t('pages.userDetail.city', 'City')}</th>
                  <th>{t('pages.userDetail.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {user.ownedProperties.map((p) => (
                  <tr key={p.id}>
                    <td><a href={`/admin/properties/${p.id}`} className="admin-link">{p.name}</a></td>
                    <td>{p.city || emDash}</td>
                    <td>
                      <span className={`owners-status owners-status--${p.is_active ? 'active' : 'inactive'}`}>
                        {p.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {user.recentBookings.length > 0 && (
        <section className="admin-panel-card">
          <div className="admin-detail-card-header">
            <Icon name="clipboard-list" size={20} />
            <h3>{t('pages.userDetail.recentBookings', 'Recent bookings ({{count}})', { count: user.recentBookings.length })}</h3>
          </div>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('common.idPrefix', 'ID:').replace(':', '')}</th>
                  <th>{t('pages.userDetail.checkIn', 'Check-in')}</th>
                  <th>{t('pages.userDetail.checkOut', 'Check-out')}</th>
                  <th>{t('pages.userDetail.guests', 'Guests')}</th>
                  <th>{t('pages.userDetail.status', 'Status')}</th>
                  <th>{t('pages.userDetail.date', 'Date')}</th>
                </tr>
              </thead>
              <tbody>
                {user.recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td>{b.check_in || emDash}</td>
                    <td>{b.check_out || emDash}</td>
                    <td>{b.guests || emDash}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>{formatDate(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {confirmTarget === 'deactivate' && (
        <ConfirmDialog
          title={t('pages.userDetail.confirmDeactivateTitle', 'Deactivate user?')}
          message={t('pages.userDetail.confirmDeactivateMsg', 'Are you sure you want to deactivate {{name}}? They will not be able to log in.', {
            name: user.fullName || user.email
          })}
          confirmLabel={t('pages.userDetail.confirmDeactivateBtn', 'Deactivate')}
          danger
          onConfirm={async () => { setConfirmTarget(null); await handleDeactivate(); }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
};

export default AdminUserDetailPage;
