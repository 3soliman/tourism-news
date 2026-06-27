'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { fetchAdminProperties } from '../../api/propertiesApi';
import { fetchRoomTypes } from '../../api/roomTypesApi';
import {
  fetchAvailabilityBlocks,
  fetchAvailabilityBlockById,
  createAvailabilityBlock,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
  mapAvailabilityBlockToForm
} from '../../api/availabilityBlocksApi';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import { formatApiErrors } from '../../utils/hotelPayload';
import {
  EMPTY_AVAILABILITY_BLOCK_FORM,
  BLOCK_REASON_OPTIONS
} from '../../constants/availabilityBlockForm';
import Icon from '../../components/icons/Icon';
import AdminIconButton from '../../components/admin/AdminIconButton';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import { useTranslation } from '../../context/I18nContext';

const AdminAvailabilityBlocksPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialPropertyFilter = searchParams.get('property') || '';
  const initialRoomFilter = searchParams.get('room_type') || '';

  const [blocks, setBlocks] = useState([]);
  const [properties, setProperties] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [filterPropertyId, setFilterPropertyId] = useState(initialPropertyFilter);
  const [filterRoomTypeId, setFilterRoomTypeId] = useState(initialRoomFilter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_AVAILABILITY_BLOCK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState(null);
  const notify = useNotifications();

  const loadMeta = useCallback(async () => {
    const [props, rooms] = await Promise.all([
      fetchAdminProperties(),
      fetchRoomTypes({ propertyId: filterPropertyId || undefined })
    ]);
    setProperties(props);
    setRoomTypes(rooms);
  }, [filterPropertyId]);

  const loadBlocks = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      let list = await fetchAvailabilityBlocks({
        roomTypeId: filterRoomTypeId || undefined,
        force
      });

      if (filterPropertyId && !filterRoomTypeId) {
        const rooms = await fetchRoomTypes({ propertyId: filterPropertyId });
        const roomIds = new Set(rooms.map((r) => r.id));
        list = list.filter((b) => roomIds.has(b.roomTypeId));
      }

      setBlocks(list);
    } catch (err) {
      setError(err.message || t('pages.availabilityBlocks.errorLoad', 'Failed to load availability blocks'));
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, [filterPropertyId, filterRoomTypeId]);

  const load = useCallback(async () => {
    try {
      await loadMeta();
    } catch (err) {
      setError(err.message || t('pages.availabilityBlocks.errorFormData', 'Failed to load form data'));
    }
    await loadBlocks({ force: true });
  }, [loadMeta, loadBlocks, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRoomTypes = useMemo(() => {
    if (!filterPropertyId) return roomTypes;
    return roomTypes.filter((r) => r.property === filterPropertyId);
  }, [roomTypes, filterPropertyId]);

  const roomTypeLabel = (id) =>
    roomTypes.find((r) => r.id === String(id))?.name || (id ? `#${id}` : '—');
  const reasonLabel = (value) =>
    t(`pages.availabilityBlocks.reasons.${value}`, BLOCK_REASON_OPTIONS.find((o) => o.value === value)?.label || value || '—');
  const reasonOptions = BLOCK_REASON_OPTIONS.map((option) => ({
    ...option,
    label: reasonLabel(option.value)
  }));

  const resetForm = () => {
    setForm(EMPTY_AVAILABILITY_BLOCK_FORM);
    setEditingId(null);
    setFormErrors({});
    setSubmitError(null);
  };

  const openCreateForm = () => {
    resetForm();
    if (filterRoomTypeId) {
      setForm((prev) => ({ ...prev, room_type: filterRoomTypeId }));
    }
    setShowForm(true);
  };

  const openEditForm = async (item) => {
    resetForm();
    setShowForm(true);
    setLoadingEditId(item.id);
    setSubmitError(null);
    try {
      const fresh = await fetchAvailabilityBlockById(item.id, { force: true });
      setEditingId(fresh.id);
      setForm(mapAvailabilityBlockToForm(fresh));
    } catch (err) {
      setSubmitError(formatApiErrors(err.data) || err.message || t('pages.availabilityBlocks.errorLoadBlock', 'Failed to load block'));
      setShowForm(false);
    } finally {
      setLoadingEditId(null);
    }
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = () => {
    const next = {};
    if (!form.room_type) next.room_type = t('pages.availabilityBlocks.roomTypeRequired', 'Room type is required');
    if (!form.start_date) next.start_date = t('pages.availabilityBlocks.startDateRequired', 'Start date is required');
    if (!form.end_date) next.end_date = t('pages.availabilityBlocks.endDateRequired', 'End date is required');
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      next.end_date = t('pages.availabilityBlocks.endDateAfterStart', 'End date must be on or after start date');
    }
    if (!form.blocked_units || Number(form.blocked_units) < 1) {
      next.blocked_units = t('pages.availabilityBlocks.unitsRequired', 'At least 1 unit must be blocked');
    }
    if (!form.reason) next.reason = t('pages.availabilityBlocks.reasonRequired', 'Reason is required');
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingId) {
        await updateAvailabilityBlock(editingId, form);
        notify.success(t('pages.availabilityBlocks.updateSuccess', 'Block updated successfully'));
      } else {
        await createAvailabilityBlock(form);
        notify.success(t('pages.availabilityBlocks.createSuccess', 'Block created successfully'));
      }
      closeForm();
      await loadBlocks({ force: true });
    } catch (err) {
      const fieldErrors = err.data && typeof err.data === 'object' ? err.data : null;
      if (fieldErrors && !fieldErrors.detail) {
        const mapped = {};
        Object.entries(fieldErrors).forEach(([key, val]) => {
          const field = key === 'room_type_id' ? 'room_type' : key;
          mapped[field] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFormErrors(mapped);
      }
      const message = formatApiErrors(err.data) || err.message;
      setSubmitError(message);
      notify.error(
        editingId
          ? t('pages.availabilityBlocks.updateError', 'Failed to update block')
          : t('pages.availabilityBlocks.createError', 'Failed to create block'),
        { message }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(t('pages.availabilityBlocks.confirmDeleteMsg', 'Delete block for "{{room}}" ({{start}} to {{end}})?', {
      room: item.roomTypeName || roomTypeLabel(item.roomTypeId),
      start: item.startDate,
      end: item.endDate
    }))) {
      return;
    }

    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await deleteAvailabilityBlock(item.id);
      if (editingId === item.id) closeForm();
      await loadBlocks({ force: true });
      notify.success(t('pages.availabilityBlocks.deleteSuccess', 'Block deleted successfully'));
    } catch (err) {
      setDeleteError(formatApiErrors(err.data) || err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handlePropertyFilterChange = async (e) => {
    const value = e.target.value;
    setFilterPropertyId(value);
    setFilterRoomTypeId('');
  };

  const handleRoomFilterChange = (e) => {
    setFilterRoomTypeId(e.target.value);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{t('pages.availabilityBlocks.title', 'Availability blocks')}</h2>
          <p>{t('pages.availabilityBlocks.subtitle', 'Block room inventory for maintenance or private holds')}</p>
        </div>
        <div className="admin-header-actions">
          <AdminIconButton icon="refresh-cw" label={t('common.refresh', 'Refresh')} onClick={load} disabled={loading} loading={loading} />
          <button
            type="button"
            className="admin-btn admin-btn-primary link-with-icon"
            onClick={() => (showForm ? closeForm() : openCreateForm())}
            disabled={filteredRoomTypes.length === 0}
          >
            <Icon name="plus" size={16} />
            <span>{showForm ? t('common.cancel', 'Cancel') : t('pages.availabilityBlocks.addBlock', 'Add block')}</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="admin-alert admin-alert-error">
          <pre>{deleteError}</pre>
        </div>
      )}

      <section className="admin-panel-card admin-service-filter-bar admin-availability-filters">
        <div className="form-group">
          <label htmlFor="filter-block-property">{t('pages.availabilityBlocks.filterProperty', 'Property')}</label>
          <select id="filter-block-property" value={filterPropertyId} onChange={handlePropertyFilterChange}>
            <option value="">{t('pages.availabilityBlocks.allProperties', 'All properties')}</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="filter-block-room">{t('pages.availabilityBlocks.filterRoomType', 'Room type')}</label>
          <select id="filter-block-room" value={filterRoomTypeId} onChange={handleRoomFilterChange}>
            <option value="">{t('pages.availabilityBlocks.allRoomTypes', 'All room types')}</option>
            {filteredRoomTypes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </section>

      {showForm && (
        <section className="admin-panel-card admin-service-form-card">
          <h3>{editingId ? t('pages.availabilityBlocks.editBlock', 'Edit block #{{id}}', { id: editingId }) : t('pages.availabilityBlocks.addAvailabilityBlock', 'Add availability block')}</h3>
          {loadingEditId && <ApiLoading message={t('pages.availabilityBlocks.loadingBlock', 'Loading block...')} variant="form" />}
          {submitError && (
            <div className="admin-alert admin-alert-error">
              <pre>{submitError}</pre>
            </div>
          )}
          <form onSubmit={handleSubmit} className="admin-service-form" noValidate>
            <fieldset disabled={submitting || !!loadingEditId}>
              <section className="admin-service-form-section">
                <h4 className="admin-service-form-section-title">{t('pages.availabilityBlocks.blockDetails', 'Block details')}</h4>
                <div className="admin-service-form-grid">
                  <div className="form-group">
                    <label htmlFor="ab-room-type">{t('pages.availabilityBlocks.roomTypeRequiredLabel', 'Room type *')}</label>
                    <select
                      id="ab-room-type"
                      value={form.room_type}
                      onChange={(e) => updateField('room_type', e.target.value)}
                    >
                      <option value="">{t('pages.availabilityBlocks.selectRoomType', 'Select room type')}</option>
                      {filteredRoomTypes.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    {formErrors.room_type && <span className="field-error">{formErrors.room_type}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="ab-units">{t('pages.availabilityBlocks.blockedUnitsRequiredLabel', 'Blocked units *')}</label>
                    <input
                      id="ab-units"
                      type="number"
                      min="1"
                      value={form.blocked_units}
                      onChange={(e) => updateField('blocked_units', e.target.value)}
                    />
                    {formErrors.blocked_units && <span className="field-error">{formErrors.blocked_units}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="ab-start">{t('pages.availabilityBlocks.startDateRequiredLabel', 'Start date *')}</label>
                    <input
                      id="ab-start"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => updateField('start_date', e.target.value)}
                    />
                    {formErrors.start_date && <span className="field-error">{formErrors.start_date}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="ab-end">{t('pages.availabilityBlocks.endDateRequiredLabel', 'End date *')}</label>
                    <input
                      id="ab-end"
                      type="date"
                      min={form.start_date || undefined}
                      value={form.end_date}
                      onChange={(e) => updateField('end_date', e.target.value)}
                    />
                    {formErrors.end_date && <span className="field-error">{formErrors.end_date}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="ab-reason">{t('pages.availabilityBlocks.reasonRequiredLabel', 'Reason *')}</label>
                    <select
                      id="ab-reason"
                      value={form.reason}
                      onChange={(e) => updateField('reason', e.target.value)}
                    >
                      {reasonOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {formErrors.reason && <span className="field-error">{formErrors.reason}</span>}
                  </div>
                  <div className="form-group admin-form-full">
                    <label htmlFor="ab-notes">{t('pages.availabilityBlocks.notes', 'Notes')}</label>
                    <textarea
                      id="ab-notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      placeholder={t('pages.availabilityBlocks.notesPlaceholder', 'Optional details for staff')}
                    />
                  </div>
                </div>
              </section>

              <section className="admin-service-form-section admin-service-form-section-options">
                <label className="checkbox-label admin-service-checkbox-card">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => updateField('is_active', e.target.checked)}
                  />
                  <span>
                    <strong>{t('common.active', 'Active')}</strong>
                    <small>{t('pages.availabilityBlocks.inactiveHint', 'Inactive blocks are ignored for availability')}</small>
                  </span>
                </label>
              </section>

              <div className="admin-service-form-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={closeForm} disabled={submitting}>
                  {t('common.cancel', 'Cancel')}
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting || !!loadingEditId}>
                  {submitting
                    ? t('common.saving', 'Saving…')
                    : editingId
                      ? t('common.saveChanges', 'Save changes')
                      : t('pages.availabilityBlocks.createBlock', 'Create block')}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      {error && <ApiError message={error} onRetry={load} />}
      {loading && !error && <ApiLoading message={t('pages.availabilityBlocks.loading', 'Loading blocks...')} variant="table" />}

      {!loading && !error && blocks.length === 0 && (
        <div className="visual-empty-state">
          <div className="visual-empty-state-icon">
            <Icon name="calendar" size={24} />
          </div>
          <h3>{t('pages.availabilityBlocks.emptyTitle', 'No availability blocks')}</h3>
          <p>{t('pages.availabilityBlocks.emptyDesc', 'Block dates when rooms are unavailable for maintenance or other reasons.')}</p>
          {filteredRoomTypes.length > 0 && (
            <button type="button" className="admin-btn admin-btn-primary link-with-icon admin-empty-action" onClick={openCreateForm}>
              <Icon name="plus" size={16} />
              <span>{t('pages.availabilityBlocks.emptyAction', 'Add first block')}</span>
            </button>
          )}
        </div>
      )}

      {!loading && !error && blocks.length > 0 && (
        <section className="admin-panel-card">
          <p className="admin-list-count">
            {t('pages.availabilityBlocks.count', '{{count}} blocks', { count: blocks.length })}
          </p>
          <div className="admin-hotels-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('pages.availabilityBlocks.roomType', 'Room type')}</th>
                  <th>{t('pages.availabilityBlocks.dates', 'Dates')}</th>
                  <th>{t('pages.availabilityBlocks.unitsBlocked', 'Units blocked')}</th>
                  <th>{t('pages.availabilityBlocks.reason', 'Reason')}</th>
                  <th>{t('pages.availabilityBlocks.notes', 'Notes')}</th>
                  <th>{t('common.status', 'Status')}</th>
                  <th>{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.roomTypeName || roomTypeLabel(item.roomTypeId)}</strong></td>
                    <td>{item.startDate} → {item.endDate}</td>
                    <td>{item.blockedUnits}</td>
                    <td>{reasonLabel(item.reason)}</td>
                    <td>{item.notes || t('common.emDash', '—')}</td>
                    <td>
                      <span className={`badge ${item.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {item.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </td>
                    <td className="admin-actions-cell">
                      <div className="admin-icon-actions">
                        <AdminIconButton
                          icon="pencil"
                          label={t('pages.availabilityBlocks.editAction', 'Edit block')}
                          variant="primary"
                          onClick={() => openEditForm(item)}
                          disabled={deletingId === item.id || loadingEditId === item.id}
                          loading={loadingEditId === item.id}
                        />
                        <AdminIconButton
                          icon="trash-2"
                          label={t('pages.availabilityBlocks.deleteAction', 'Delete block')}
                          variant="danger"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          loading={deletingId === item.id}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminAvailabilityBlocksPage;
