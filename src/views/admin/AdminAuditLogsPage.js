'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AUDIT_ACTION_FILTER_KEYS,
  fetchAuditLogs,
  fetchAuditLogById,
  matchesAuditActionFilter,
  filterAuditLogs,
  formatAuditTimestamp,
  auditActionBadgeClass,
  getAuditPageFromPath
} from '../../api/auditLogsApi';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import AdminIconButton from '../../components/admin/AdminIconButton';
import { useAdmin } from '../../context/AdminContext';
import { useTranslation } from '../../context/I18nContext';

const PAGE_SIZE = 20;

function formatChangeValue(value, emDash) {
  if (value == null || value === '') return emDash;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

const AdminAuditLogsPage = () => {
  const { t } = useTranslation();
  const { adminUser, loaded: adminLoaded } = useAdmin();
  const isSystemAdmin = String(adminUser?.role || '').toLowerCase() === 'admin';
  const emDash = t('common.emDash', '—');

  const actionFilters = AUDIT_ACTION_FILTER_KEYS.map((item) => ({
    ...item,
    label: t(item.labelKey)
  }));

  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [nextPath, setNextPath] = useState(null);
  const [previousPath, setPreviousPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const load = useCallback(async ({ page: pageNumber = 1, force = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { logs: list, count, next, previous } = await fetchAuditLogs({
        page: pageNumber,
        pageSize: PAGE_SIZE,
        force
      });
      setLogs(list);
      setTotalCount(count ?? list.length);
      setNextPath(next);
      setPreviousPath(previous);
      setPage(pageNumber);
    } catch (err) {
      setError(err.message || t('pages.auditLogs.errorLoad', 'Failed to load audit logs'));
      setLogs([]);
      setTotalCount(0);
      setNextPath(null);
      setPreviousPath(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!adminLoaded || !isSystemAdmin) return;
    load({ page: 1, force: true });
  }, [adminLoaded, isSystemAdmin, load]);

  const filteredLogs = useMemo(
    () => filterAuditLogs(logs, { action: filterAction, query: searchQuery }),
    [logs, filterAction, searchQuery]
  );

  const actionCounts = useMemo(() => {
    const counts = { all: logs.length };
    AUDIT_ACTION_FILTER_KEYS.forEach(({ id }) => {
      if (id === 'all') return;
      counts[id] = logs.filter((log) => matchesAuditActionFilter(log, id)).length;
    });
    return counts;
  }, [logs]);

  const totalPages = Math.max(1, Math.ceil((totalCount || logs.length) / PAGE_SIZE));

  const toggleExpanded = async (logId) => {
    if (expandedId === logId) {
      setExpandedId(null);
      setDetail(null);
      setDetailError(null);
      return;
    }

    setExpandedId(logId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      setDetail(await fetchAuditLogById(logId, { force: true }));
    } catch (err) {
      setDetailError(err.message || t('pages.auditLogs.errorDetails', 'Could not load log details'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const goToPage = (targetPage) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return;
    setExpandedId(null);
    setDetail(null);
    load({ page: targetPage, force: true });
  };

  if (!adminLoaded) {
    return <ApiLoading message={t('common.loading', 'Loading...')} variant="table" />;
  }

  if (!isSystemAdmin) {
    return (
      <div className="admin-page admin-audit-logs-page">
        <ApiError
          message={t('pages.auditLogs.adminOnly', 'Audit logs are available to administrators only.')}
        />
      </div>
    );
  }

  return (
    <div className="admin-page admin-audit-logs-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.auditLogs.title', 'Audit trail')}</h2>
          <p>{t('pages.auditLogs.subtitle', 'Track admin and system activity across the platform')}</p>
        </div>
        <AdminIconButton
          icon="refresh-cw"
          label={t('common.refresh', 'Refresh')}
          onClick={() => load({ page, force: true })}
          disabled={loading}
          loading={loading}
        />
      </div>

      <section className="admin-panel-card admin-service-filter-bar admin-audit-filters">
        <form className="form-group admin-audit-search-form" onSubmit={handleSearchSubmit}>
          <label htmlFor="audit-search">{t('pages.auditLogs.search', 'Search')}</label>
          <div className="admin-audit-search-row">
            <input
              id="audit-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('pages.auditLogs.searchPlaceholder', 'User, entity, object ID, or change details')}
            />
            <button type="submit" className="admin-btn admin-btn-secondary admin-btn-sm">
              {t('common.search', 'Search')}
            </button>
          </div>
        </form>
      </section>

      <div className="admin-filters">
        {actionFilters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-filter-btn ${filterAction === item.id ? 'active' : ''}`}
            onClick={() => setFilterAction(item.id)}
          >
            {item.label} ({actionCounts[item.id] ?? 0})
          </button>
        ))}
      </div>

      {error && <ApiError message={error} onRetry={() => load({ page, force: true })} />}
      {loading && !error && <ApiLoading message={t('pages.auditLogs.loading', 'Loading audit logs...')} variant="table" />}

      {!loading && !error && filteredLogs.length === 0 && (
        <div className="admin-panel-card admin-empty-state">
          <h3>{t('pages.auditLogs.emptyTitle', 'No audit entries')}</h3>
          <p>
            {logs.length === 0
              ? t('pages.auditLogs.emptyAll', 'No activity has been recorded yet.')
              : t('pages.auditLogs.emptyFilter', 'No entries match your search or filter.')}
          </p>
        </div>
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {filteredLogs.length === 1
              ? t('pages.auditLogs.entry', '1 entry')
              : t('pages.auditLogs.entries', '{{count}} entries', { count: filteredLogs.length })}
            {filteredLogs.length !== logs.length && t('pages.auditLogs.ofLoaded', ' (of {{count}} loaded)', { count: logs.length })}
            {totalCount > logs.length && t('pages.auditLogs.ofTotal', ' · {{count}} total', { count: totalCount })}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table admin-table-wide admin-audit-table">
              <thead>
                <tr>
                  <th>{t('pages.auditLogs.time', 'Time')}</th>
                  <th>{t('pages.auditLogs.user', 'User')}</th>
                  <th>{t('pages.auditLogs.action', 'Action')}</th>
                  <th>{t('pages.auditLogs.entity', 'Entity')}</th>
                  <th>{t('pages.auditLogs.object', 'Object')}</th>
                  <th>{t('pages.auditLogs.details', 'Details')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td className="admin-audit-time">{formatAuditTimestamp(log.timestamp)}</td>
                      <td>
                        <strong>{log.actor.name}</strong>
                        {log.actor.email && (
                          <>
                            <br />
                            <small>{log.actor.email}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${auditActionBadgeClass(log.action)}`}>
                          {log.actionLabel}
                        </span>
                      </td>
                      <td>{log.entityType || emDash}</td>
                      <td>
                        <strong>{log.objectRepr || emDash}</strong>
                        {log.objectId && (
                          <>
                            <br />
                            <small>{t('common.idPrefix', 'ID:')} {log.objectId}</small>
                          </>
                        )}
                      </td>
                      <td className="admin-actions-cell">
                        <AdminIconButton
                          icon={expandedId === log.id ? 'eye-off' : 'eye'}
                          label={expandedId === log.id ? t('pages.auditLogs.hideDetails', 'Hide details') : t('pages.auditLogs.viewDetails', 'View details')}
                          variant="primary"
                          onClick={() => toggleExpanded(log.id)}
                        />
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="admin-booking-detail-row">
                        <td colSpan={6}>
                          <div className="admin-booking-detail admin-audit-detail">
                            {detailLoading && <ApiLoading message={t('pages.auditLogs.loadingDetails', 'Loading entry details...')} variant="form" />}
                            {detailError && !detailLoading && (
                              <p className="hotel-amenities-error-text">{detailError}</p>
                            )}
                            {!detailLoading && !detailError && detail && (
                              <>
                                <div className="admin-booking-detail-grid admin-audit-detail-grid">
                                  <div>
                                    <h4>{t('pages.auditLogs.entrySection', 'Entry')}</h4>
                                    <p><strong>{t('pages.auditLogs.logId', 'Log ID:')}</strong> {detail.id}</p>
                                    <p><strong>{t('pages.auditLogs.action', 'Action')}:</strong> {detail.actionLabel}</p>
                                    <p><strong>{t('pages.auditLogs.time', 'Time')}:</strong> {formatAuditTimestamp(detail.timestamp)}</p>
                                  </div>
                                  <div>
                                    <h4>{t('pages.auditLogs.actor', 'Actor')}</h4>
                                    <p><strong>{detail.actor.name}</strong></p>
                                    <p>{detail.actor.email || emDash}</p>
                                    {detail.actor.id && <p className="admin-hint">{t('pages.auditLogs.userId', 'User ID:')} {detail.actor.id}</p>}
                                  </div>
                                  <div>
                                    <h4>{t('pages.auditLogs.target', 'Target')}</h4>
                                    <p><strong>{detail.entityType || emDash}</strong></p>
                                    <p>{detail.objectRepr || emDash}</p>
                                    {detail.objectId && <p className="admin-hint">{t('pages.auditLogs.objectId', 'Object ID:')} {detail.objectId}</p>}
                                    {detail.ipAddress && <p className="admin-hint">{t('pages.auditLogs.ip', 'IP:')} {detail.ipAddress}</p>}
                                    {(detail.requestMethod || detail.requestPath) && (
                                      <p className="admin-hint">
                                        {t('pages.auditLogs.request', 'Request:')}{' '}
                                        {[detail.requestMethod, detail.requestPath].filter(Boolean).join(' ')}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {detail.notes && (
                                  <div className="admin-audit-notes">
                                    <h4>{t('pages.auditLogs.notes', 'Notes')}</h4>
                                    <p>{detail.notes}</p>
                                  </div>
                                )}

                                {detail.changes.length > 0 ? (
                                  <div className="admin-audit-changes">
                                    <h4>{t('pages.auditLogs.changes', 'Changes')}</h4>
                                    <table className="admin-table admin-audit-changes-table">
                                      <thead>
                                        <tr>
                                          <th>{t('pages.auditLogs.field', 'Field')}</th>
                                          <th>{t('pages.auditLogs.before', 'Before')}</th>
                                          <th>{t('pages.auditLogs.after', 'After')}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {detail.changes.map((change) => (
                                          <tr key={`${detail.id}-${change.field}`}>
                                            <td><strong>{change.field}</strong></td>
                                            <td><pre className="admin-audit-change-value">{formatChangeValue(change.before, emDash)}</pre></td>
                                            <td><pre className="admin-audit-change-value">{formatChangeValue(change.after, emDash)}</pre></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="admin-hint">{t('pages.auditLogs.noChanges', 'No field-level changes recorded for this entry.')}</p>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                disabled={!previousPath && page <= 1}
                onClick={() => goToPage(previousPath ? getAuditPageFromPath(previousPath) : page - 1)}
              >
                {t('common.previous', 'Previous')}
              </button>
              <span className="admin-pagination-meta">
                {t('pages.auditLogs.pageOf', 'Page {{page}} of {{total}}', { page, total: totalPages })}
              </span>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                disabled={!nextPath && page >= totalPages}
                onClick={() => goToPage(nextPath ? getAuditPageFromPath(nextPath) : page + 1)}
              >
                {t('common.next', 'Next')}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;
