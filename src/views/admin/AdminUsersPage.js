'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import {
  fetchUsers,
  roleBadgeClass,
  roleLabel,
  roleOptions
} from '../../api/usersApi';
import { useTranslation } from '../../context/I18nContext';
import { ApiError } from '../../components/shared/ApiStatus';
import { TableSkeleton } from '../../components/shared/LoadingSkeletons';
import AdminIconButton from '../../components/admin/AdminIconButton';
import Icon from '../../components/icons/Icon';

const PAGE_SIZE = 12;

const ROLE_LABEL_KEYS = {
  admin: 'pages.users.roleAdmin',
  staff: 'pages.users.roleStaff',
  customer: 'pages.users.roleCustomer'
};

function formatDate(value, emDash) {
  if (!value) return emDash;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return emDash;
  }
}

const AdminUsersPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const emDash = t('common.emDash', '—');

  const translateRole = useCallback(
    (role) => t(ROLE_LABEL_KEYS[role], roleLabel(role)),
    [t]
  );

  const roleFilters = [
    { value: '', label: t('pages.users.allRoles', 'All roles') },
    ...roleOptions().map((option) => ({
      value: option.value,
      label: translateRole(option.value)
    }))
  ];

  const statusFilters = [
    { value: '', label: t('pages.users.allStatuses', 'All statuses') },
    { value: 'active', label: t('common.active', 'Active') },
    { value: 'inactive', label: t('common.inactive', 'Inactive') }
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUsers({
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        page
      });
      setUsers(result.users);
      setTotal(result.total);
    } catch (err) {
      setError(err.message || t('pages.users.errorLoad', 'Failed to load users'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, page, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const UserStatusBadge = ({ isActive }) => (
    <span className={`owners-status owners-status--${isActive ? 'active' : 'inactive'}`}>
      <span aria-hidden="true" />
      {isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
    </span>
  );

  return (
    <div className="admin-page owners-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.users.title', 'Users')}</h2>
          <p>{t('pages.users.subtitle', 'Manage all platform users — admins, staff and customers.')}</p>
        </div>
        <AdminIconButton
          icon="refresh-cw"
          label={t('common.refresh', 'Refresh')}
          onClick={load}
          disabled={loading}
          loading={loading}
        />
      </div>

      <section className="admin-panel-card admin-service-filter-bar admin-users-filter-bar">
        <form className="form-group" onSubmit={handleSearch}>
          <label htmlFor="users-search">{t('pages.users.searchLabel', 'Search users')}</label>
          <div className="admin-audit-search-row">
            <input
              id="users-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('pages.users.searchPlaceholder', 'Name, email or phone...')}
            />
            <button type="submit" className="admin-btn admin-btn-secondary admin-btn-sm">
              {t('common.search', 'Search')}
            </button>
          </div>
        </form>
        <div className="form-group">
          <label htmlFor="users-role-filter">{t('pages.users.roleFilter', 'Filter by role')}</label>
          <select
            id="users-role-filter"
            className="admin-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {roleFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="users-status-filter">{t('pages.users.statusFilter', 'Filter by status')}</label>
          <select
            id="users-status-filter"
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusFilters.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </section>

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <TableSkeleton rows={6} />}

      {!loading && !error && users.length === 0 && (
        <div className="admin-panel-card admin-empty-state">
          <h3>{t('pages.users.emptyTitle', 'No users found')}</h3>
          <p>
            {total === 0
              ? t('pages.users.noRegistered', 'No users registered yet.')
              : t('pages.users.noMatch', 'No users match your filters.')}
          </p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {t('pages.users.count', '{{count}} users', { count: total })}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('pages.users.user', 'User')}</th>
                  <th>{t('pages.users.role', 'Role')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>{t('pages.users.properties', 'Properties')}</th>
                  <th>{t('pages.users.bookings', 'Bookings')}</th>
                  <th>{t('pages.users.lastLogin', 'Last login')}</th>
                  <th>{t('pages.users.created', 'Created')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/admin/users/${user.id}`} className="admin-user-link">
                        <strong>{user.fullName || user.email}</strong>
                        {user.fullName && <small>{user.email}</small>}
                      </Link>
                    </td>
                    <td>
                      <span className={roleBadgeClass(user.role)}>
                        {translateRole(user.role)}
                      </span>
                    </td>
                    <td><UserStatusBadge isActive={user.isActive} /></td>
                    <td>{user.ownedPropertiesCount}</td>
                    <td>{user.bookingCount}</td>
                    <td className="admin-cell-muted">{formatDate(user.lastLogin, emDash)}</td>
                    <td className="admin-cell-muted">{formatDate(user.createdAt, emDash)}</td>
                    <td className="admin-actions-cell">
                      <AdminIconButton
                        icon="eye"
                        label={t('pages.users.viewUser', 'View user')}
                        variant="primary"
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <Icon name="chevron-left" size={14} /> {t('common.previous', 'Previous')}
              </button>
              <span className="admin-pagination-info">
                {t('common.pageOf', 'Page {{page}} of {{totalPages}}', { page, totalPages })}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.next', 'Next')} <Icon name="chevron-right" size={14} />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AdminUsersPage;
