import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@/lib/router-compat';
import {
  fetchServiceCatalog,
  fetchPropertyServices,
  createPropertyService,
  deletePropertyService,
  cloneCatalogServiceToForm,
  getServiceCatalogKey,
  formatServicePrice
} from '../../../api/propertyServicesApi';
import { formatApiErrors } from '../../../utils/hotelPayload';
import SearchableMultiSelect from '../SearchableMultiSelect';
import { useNotifications } from '../../shared/notifications/NotificationProvider';
import { FormSkeleton } from '../../shared/LoadingSkeletons';

const newLocalId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const PropertyServicesWizardPanel = ({
  propertyId,
  pendingServices = [],
  onPendingServicesChange,
  onAssignedChange,
  disabled = false,
  refreshKey = 0
}) => {
  const [catalog, setCatalog] = useState([]);
  const [assignedServices, setAssignedServices] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [togglingKey, setTogglingKey] = useState(null);
  const catalogCacheRef = useRef(null);
  const catalogCacheKeyRef = useRef(null);
  const notify = useNotifications();

  const isDraftMode = !propertyId;

  const loadCatalog = useCallback(async () => {
    if (catalogCacheRef.current && catalogCacheKeyRef.current === refreshKey) {
      setCatalog(catalogCacheRef.current);
      return catalogCacheRef.current;
    }
    const list = await fetchServiceCatalog();
    catalogCacheRef.current = list;
    catalogCacheKeyRef.current = refreshKey;
    setCatalog(list);
    return list;
  }, [refreshKey]);

  const loadAssigned = useCallback(async (id) => {
    if (!id) {
      setAssignedServices([]);
      return [];
    }
    const list = await fetchPropertyServices({ propertyId: id });
    setAssignedServices(list);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setInitialLoading(true);
      setLoadError(null);
      try {
        await loadCatalog();
        if (!cancelled && propertyId) {
          await loadAssigned(propertyId);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.message || 'Failed to load services');
          setCatalog([]);
          setAssignedServices([]);
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [propertyId, loadCatalog, loadAssigned, refreshKey]);

  const assignedKeys = useMemo(() => {
    const keys = new Set();
    if (isDraftMode) {
      pendingServices.forEach((s) => keys.add(getServiceCatalogKey(s)));
    } else {
      assignedServices.forEach((s) => keys.add(getServiceCatalogKey(s)));
    }
    return keys;
  }, [isDraftMode, pendingServices, assignedServices]);

  const selectedCount = isDraftMode ? pendingServices.length : assignedServices.length;

  useEffect(() => {
    if (!onAssignedChange) return;
    const items = isDraftMode
      ? pendingServices.map((s) => ({ name: s.name }))
      : assignedServices.map((s) => ({ name: s.name }));
    onAssignedChange(items);
  }, [isDraftMode, pendingServices, assignedServices, onAssignedChange]);

  const isSelected = (item) => assignedKeys.has(getServiceCatalogKey(item));

  const selectedServiceIds = useMemo(() => {
    if (isDraftMode) {
      return pendingServices.map((s) => getServiceCatalogKey(s));
    }
    return assignedServices.map((s) => getServiceCatalogKey(s));
  }, [isDraftMode, pendingServices, assignedServices]);

  const catalogOptions = useMemo(
    () =>
      catalog.map((item) => ({
        ...item,
        id: getServiceCatalogKey(item),
        sublabel: `${item.categoryName || 'Uncategorized'} · ${formatServicePrice(item)}`
      })),
    [catalog]
  );

  const toggleService = async (item) => {
    if (disabled || togglingKey) return;

    const key = getServiceCatalogKey(item);
    const selected = isSelected(item);

    setActionError(null);

    if (isDraftMode) {
      if (selected) {
        onPendingServicesChange(pendingServices.filter((s) => getServiceCatalogKey(s) !== key));
      } else {
        const form = cloneCatalogServiceToForm(item);
        onPendingServicesChange([
          ...pendingServices,
          { ...form, localId: newLocalId(), catalogKey: key }
        ]);
      }
      return;
    }

    setTogglingKey(key);
    try {
      if (selected) {
        const toRemove = assignedServices.find((s) => getServiceCatalogKey(s) === key);
        if (toRemove) {
          await deletePropertyService(toRemove.id);
          setAssignedServices((prev) => prev.filter((s) => s.id !== toRemove.id));
          notify.success('Service removed successfully', { message: toRemove.name });
        }
      } else {
        const created = await createPropertyService(cloneCatalogServiceToForm(item, propertyId));
        setAssignedServices((prev) => [...prev, created]);
        notify.success('Service added successfully', { message: created.name });
      }
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message || 'Could not update services';
      setActionError(message);
      notify.error('Failed to update services', { message });
    } finally {
      setTogglingKey(null);
    }
  };

  if (initialLoading) {
    return <FormSkeleton fields={3} message="Loading services..." />;
  }

  if (loadError) {
    return <p className="hotel-amenities-error-text">{loadError}</p>;
  }

  if (catalog.length === 0) {
    return (
      <p className="hotel-form-field-group-hint">
        No services in the system yet. Create services first in{' '}
        <Link to="/admin/services" className="admin-inline-link">Property services</Link>
        , then return here to assign them to this property.
      </p>
    );
  }

  return (
    <div className="wizard-services-panel">
      {isDraftMode && (
        <p className="hotel-form-field-group-hint">
          Select services below. They will be linked to this property when you save at the end.
        </p>
      )}

      {actionError && (
        <div className="admin-alert admin-alert-error wizard-services-alert">
          <pre>{actionError}</pre>
        </div>
      )}

      <SearchableMultiSelect
        options={catalogOptions}
        selectedIds={selectedServiceIds}
        onToggle={(_id, opt) => toggleService(opt)}
        getOptionId={(opt) => opt.id}
        getOptionLabel={(opt) => opt.name}
        getOptionSublabel={(opt) => opt.sublabel}
        placeholder="Search services by name or category…"
        disabled={disabled}
        busyId={togglingKey}
        maxVisible={10}
        emptyText="No services match your search."
        hintText={`${selectedCount} linked to this property`}
      />

      <p className="hotel-form-field-group-hint">
        Need a new service?{' '}
        <Link to="/admin/services" className="admin-inline-link">Manage property services</Link>
      </p>
    </div>
  );
};

export default PropertyServicesWizardPanel;
