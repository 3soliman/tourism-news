'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link } from '@/lib/router-compat';
import {
  fetchAdminProperties,
  deleteProperty
} from '../../api/propertiesApi';
import { useHotels } from '../../context/HotelsContext';
import { useTranslation } from '../../context/I18nContext';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import { BRAND } from '../../config/brand';
import StarRating from '../../components/icons/StarRating';
import AdminIconButton from '../../components/admin/AdminIconButton';
import Icon from '../../components/icons/Icon';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import { hotelPublicUrl } from '../../utils/publicHost';
import { filterAdminProperties } from '../../utils/adminListFilters';

const AdminHotelsListPage = () => {
  const { t } = useTranslation();
  const { refresh: refreshGuestHotels } = useHotels();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const notify = useNotifications();

  const filteredProperties = useMemo(
    () => filterAdminProperties(properties, searchQuery),
    [properties, searchQuery]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminProperties();
      setProperties(list);
    } catch (err) {
      setError(err.message || t('pages.hotels.errorLoad', 'Failed to load properties'));
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    await load();
    await refreshGuestHotels();
  };

  const handlePermanentDelete = async (hotel = permanentDeleteTarget) => {
    if (!hotel) return;
    setDeletingId(hotel.id);
    setDeleteError(null);
    try {
      await deleteProperty(hotel.id);
      await handleRefresh();
      notify.success(t('pages.hotels.deleteSuccess', 'Property deleted successfully'), { message: hotel.name });
      setPermanentDeleteTarget(null);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setDeleteError(message);
      notify.error(t('pages.hotels.deleteError', 'Failed to delete property'), { message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.hotels.title', 'My properties')}</h2>
          <p>{t('pages.hotels.subtitle', 'Manage your properties — edit or delete from the list below')}</p>
        </div>
        <div className="admin-header-actions">
          <AdminIconButton
            icon="refresh-cw"
            label={t('common.refresh', 'Refresh')}
            onClick={handleRefresh}
            disabled={loading}
            loading={loading}
          />
          <Link to="/admin/hotels/new" className="admin-btn admin-btn-primary link-with-icon">
            <Icon name="plus" size={16} />
            <span>{t('pages.hotels.addProperty', 'Add property')}</span>
          </Link>
        </div>
      </div>

      {deleteError && (
        <div className="admin-alert admin-alert-error">
          <strong>{t('pages.hotels.errorAction', 'Action failed')}</strong>
          <pre>{deleteError}</pre>
        </div>
      )}

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <ApiLoading message={t('pages.hotels.loading', 'Loading your properties…')} variant="table" />}

      {!loading && !error && properties.length === 0 && (
        <div className="visual-empty-state">
          <div className="visual-empty-state-icon">
            <Icon name="building-2" size={24} />
          </div>
          <h3>{t('pages.hotels.emptyTitle', 'No properties yet')}</h3>
          <p>{t('pages.hotels.emptyDesc', 'Create your first property to list it on {{brand}}.', { brand: BRAND.name })}</p>
          <Link to="/admin/hotels/new" className="admin-btn admin-btn-primary link-with-icon admin-empty-action">
            <Icon name="plus" size={16} />
            <span>{t('pages.hotels.emptyAction', 'Add your first property')}</span>
          </Link>
        </div>
      )}

      {!loading && !error && properties.length > 0 && (
        <section className="admin-panel-card">
          <div className="admin-amenities-toolbar">
            <label className="admin-search-field">
              <Icon name="search" size={16} />
              <span className="sr-only">{t('pages.hotels.searchLabel', 'Search properties')}</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('pages.hotels.searchPlaceholder', 'Name, city, address, or ID')}
              />
            </label>
          </div>
          <p className="admin-list-count">
            {searchQuery.trim()
              ? t('pages.hotels.countFiltered', '{{filtered}} of {{total}} properties', {
                  filtered: filteredProperties.length,
                  total: properties.length
                })
              : t('pages.hotels.count', '{{count}} properties found', { count: properties.length })}
          </p>
          {filteredProperties.length === 0 ? (
            <div className="admin-amenities-empty admin-amenities-empty--compact">
              <h3>{t('pages.hotels.noMatchTitle', 'No properties match your search')}</h3>
              <p>{t('pages.hotels.noMatchDesc', 'Try a different name, city, address, or ID.')}</p>
            </div>
          ) : (
          <div className="admin-hotels-table-wrap">
            <table className="admin-table admin-hotels-table">
              <thead>
                <tr>
                  <th>{t('common.property', 'Property')}</th>
                  <th>{t('common.type', 'Type')}</th>
                  <th>{t('pages.hotels.location', 'Location')}</th>
                  <th>{t('pages.hotels.stars', 'Stars')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((hotel) => (
                  <tr key={hotel.id}>
                    <td>
                      <div className="admin-hotel-cell">
                        <div
                          className="admin-hotel-thumb"
                          style={{
                            backgroundImage: hotel.image ? `url(${hotel.image})` : undefined,
                            backgroundColor: hotel.image ? undefined : '#e7e5e4'
                          }}
                        />
                        <div>
                          <strong>{hotel.name}</strong>
                          <span className="admin-hotel-id">{t('common.idPrefix', 'ID:')} {hotel.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{hotel.propertyType || t('common.emDash', '—')}</td>
                    <td>
                      {hotel.city}, {hotel.country}
                      <br />
                      <small>{hotel.address}</small>
                    </td>
                    <td><StarRating value={hotel.stars} size={14} /></td>
                    <td>
                      <span className={`badge ${hotel.isActive !== false ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {hotel.isActive !== false
                          ? t('pages.hotels.active', 'Active')
                          : t('pages.hotels.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="admin-actions-cell">
                      <div className="admin-icon-actions">
                        <AdminIconButton
                          to={`/admin/properties/${hotel.id}`}
                          icon="pencil"
                          label={t('pages.hotels.edit', 'Edit property')}
                          variant="primary"
                        />
                        <AdminIconButton
                          href={hotelPublicUrl(hotel.subdomain) || `/hotel/${hotel.id}`}
                          icon="external-link"
                          label={t('pages.hotels.viewGuest', 'View on guest site')}
                          target="_blank"
                          rel="noreferrer"
                        />
                        <AdminIconButton
                          icon="trash-2"
                          label={t('pages.hotels.delete', 'Delete property')}
                          variant="danger"
                          onClick={() => setPermanentDeleteTarget(hotel)}
                          disabled={deletingId === hotel.id}
                          loading={deletingId === hotel.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </section>
      )}
      <ConfirmDialog
        open={Boolean(permanentDeleteTarget)}
        title={t('pages.hotels.confirmDeleteTitle', 'Delete property?')}
        message={permanentDeleteTarget
          ? t('pages.hotels.confirmDeleteMsg', '"{{name}}" will be permanently removed. This cannot be undone.', { name: permanentDeleteTarget.name })
          : ''}
        confirmLabel={t('pages.hotels.confirmDeleteBtn', 'Delete property')}
        loading={Boolean(deletingId)}
        onCancel={() => setPermanentDeleteTarget(null)}
        onConfirm={() => handlePermanentDelete()}
      />
    </div>
  );
};

export default AdminHotelsListPage;
