'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from '@/lib/router-compat';
import HotelForm, { EMPTY_HOTEL_FORM } from '../../components/admin/hotel/HotelForm';
import OnboardingStepper from '../../components/admin/property/OnboardingStepper';
import {
  archiveProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  fetchPropertyById,
  fetchPropertySetupStatus,
  publishProperty,
  updatePropertyCoverImage,
  patchPropertyFields
} from '../../api/propertiesApi';
import { fetchPropertyAmenities } from '../../api/propertyAmenitiesApi';
import { createPropertyAmenity } from '../../api/propertyAmenitiesApi';
import {
  fetchPropertyImages,
  syncPropertyImages,
  deletePropertyImage,
  setPropertyCoverImage
} from '../../api/propertyImagesApi';
import {
  validateHotelForm,
  validateHotelStep,
  formatApiErrors,
  mapHotelToForm,
  resolveSaveError,
  presentHotelSaveErrors,
  HOTEL_WIZARD_TOTAL_STEPS,
  normalizeWizardResumeStep,
  resolveOptionalVideoUrl,
} from '../../utils/hotelPayload';
import {
  mapApiImagesToExisting,
  createPendingFromFile,
  revokePendingPreviews,
  setCoverImage,
  autoCoverIfNeeded
} from '../../utils/propertyImages';
import { createPropertyService } from '../../api/propertyServicesApi';
import { fetchServiceCategories, createServiceCategory } from '../../api/serviceCategoriesApi';
import { useHotels } from '../../context/HotelsContext';
import { EMPTY_CATEGORY_FORM, EMPTY_SERVICE_FORM } from '../../constants/serviceForm';
import { validatePropertyServiceForm } from '../../utils/serviceFormValidation';
import { ApiError, ApiLoading } from '../../components/shared/ApiStatus';
import QuickCreateModal from '../../components/admin/property/QuickCreateModal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { useNotifications } from '../../components/shared/notifications/NotificationProvider';
import PropertyWizardSummary from '../../components/admin/property/PropertyWizardSummary';
import { countPropertyImages } from '../../utils/propertyImages';
import Icon from '../../components/icons/Icon';
import { useTranslation } from '../../context/I18nContext';

const getFriendlySaveError = (err, fallback, options) => resolveSaveError(err, fallback, options).message;

const FIELD_LABEL_KEYS = {
  name: 'pages.addHotel.fields.name',
  property_type: 'pages.addHotel.fields.propertyType',
  stars: 'pages.addHotel.fields.stars',
  subdomain: 'pages.addHotel.fields.subdomain',
  email: 'pages.addHotel.fields.email',
  website: 'pages.addHotel.fields.website',
  country: 'pages.addHotel.fields.country',
  city: 'pages.addHotel.fields.city',
  address: 'pages.addHotel.fields.address',
  main_image: 'pages.addHotel.fields.mainImage',
  cover_image: 'pages.addHotel.fields.coverImage',
  amenities: 'pages.addHotel.fields.amenities',
  video_url: 'pages.addHotel.fields.videoLink',
};

const STEP_LABEL_KEYS = {
  1: 'pages.addHotel.steps.identity',
  2: 'pages.addHotel.steps.location',
  3: 'pages.addHotel.steps.photos',
  4: 'pages.addHotel.steps.amenities',
  5: 'pages.addHotel.steps.contact',
  6: 'pages.addHotel.steps.policies',
  7: 'pages.addHotel.steps.publish',
};

const AdminAddHotelPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const isOnboarding = !id;
  const totalStepsCount = HOTEL_WIZARD_TOTAL_STEPS;
  const navigate = useNavigate();
  const { refresh } = useHotels();
  const notify = useNotifications();

  const [step, setStep] = useState(() => {
    if (!isOnboarding) return 1;
    return 1;
  });
  const [form, setForm] = useState(EMPTY_HOTEL_FORM);
  const [errors, setErrors] = useState({});
  const [existingImages, setExistingImages] = useState([]);
  const [pendingImages, setPendingImages] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [saveAlert, setSaveAlert] = useState(null);
  const [success, setSuccess] = useState(null);
  const [amenitiesCatalog, setAmenitiesCatalog] = useState([]);
  const [amenitiesLoading, setAmenitiesLoading] = useState(true);
  const [amenitiesError, setAmenitiesError] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [pendingServices, setPendingServices] = useState([]);
  const [assignedServicesSummary, setAssignedServicesSummary] = useState([]);
  const [setupStatus, setSetupStatus] = useState(null);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [servicesRefreshKey, setServicesRefreshKey] = useState(0);
  const lastSavedVideoUrlRef = useRef('');
  const [quickModal, setQuickModal] = useState(null);
  const [quickAmenityForm, setQuickAmenityForm] = useState({ name: '', name_ar: '', is_active: true });
  const [quickCategoryForm, setQuickCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [quickServiceForm, setQuickServiceForm] = useState(EMPTY_SERVICE_FORM);
  const [quickErrors, setQuickErrors] = useState({});
  const [quickSubmitError, setQuickSubmitError] = useState(null);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const imageState = useMemo(
    () => ({ existingImages, pendingImages, deletedImageIds }),
    [existingImages, pendingImages, deletedImageIds]
  );
  const stepValidationOpts = useMemo(
    () => ({ isOnboarding }),
    [isOnboarding]
  );
  const currentStep = Math.max(1, Math.min(Number(step) || 1, totalStepsCount));

  const saveErrorOptions = useMemo(() => ({
    t,
    fieldLabelKeys: FIELD_LABEL_KEYS,
    stepLabelKeys: STEP_LABEL_KEYS,
    isOnboarding
  }), [t, isOnboarding]);

  const showSaveFieldErrors = useCallback((rawErrors, { fallbackMessage = '' } = {}) => {
    const presentation = presentHotelSaveErrors(rawErrors, {
      ...saveErrorOptions,
      fallbackMessage
    });
    if (Object.keys(presentation.fieldErrors).length) {
      setErrors((prev) => ({ ...prev, ...presentation.fieldErrors }));
      if (presentation.step) setStep(presentation.step);
    }
    setSaveAlert({
      title: t(presentation.titleKey, presentation.titleDefault),
      intro: presentation.intro,
      lines: presentation.lines,
      stepLabel: presentation.stepLabel
    });
    return presentation;
  }, [saveErrorOptions, t]);

  const clearSaveAlert = useCallback(() => setSaveAlert(null), []);

  const getFriendlyUploadError = (err, fallback) => resolveSaveError(err, fallback, saveErrorOptions).message;

  useEffect(() => {
    if (step !== currentStep) setStep(currentStep);
  }, [step, currentStep]);

  const onboardingSteps = useMemo(() => ([
    {
      id: 1,
      key: 'identity',
      title: t('pages.addHotel.steps.identity', 'Basic identity'),
      subtitle: t('pages.addHotel.steps.identitySub', 'Name and type')
    },
    {
      id: 2,
      key: 'location',
      title: t('pages.addHotel.steps.location', 'Location'),
      subtitle: t('pages.addHotel.steps.locationSub', 'Address and map')
    },
    {
      id: 3,
      key: 'photos',
      title: t('pages.addHotel.steps.photos', 'Photos & video'),
      subtitle: t('pages.addHotel.steps.photosSub', 'Cover and gallery')
    },
    {
      id: 4,
      key: 'amenities',
      title: t('pages.addHotel.steps.amenities', 'Amenities'),
      subtitle: t('pages.addHotel.steps.amenitiesSub', 'Guest features')
    },
    {
      id: 5,
      key: 'contact',
      title: t('pages.addHotel.steps.contact', 'Contact'),
      subtitle: t('pages.addHotel.steps.contactSub', 'Phone and social')
    },
    {
      id: 6,
      key: 'policies',
      title: t('pages.addHotel.steps.policies', 'Policies'),
      subtitle: t('pages.addHotel.steps.policiesSub', 'Check-in and rules')
    },
    {
      id: 7,
      key: 'publish',
      title: t('pages.addHotel.steps.publish', 'Review'),
      subtitle: t('pages.addHotel.steps.publishSub', 'Preview and save')
    },
  ]), [t]);

  const photoCount = useMemo(
    () => countPropertyImages(existingImages, pendingImages, deletedImageIds),
    [existingImages, pendingImages, deletedImageIds]
  );

  const stepErrorFlags = useMemo(() => {
    const flags = {};
    if (errors.name || errors.property_type || errors.stars || errors.subdomain) flags[1] = true;
    if (errors.country || errors.city || errors.address) flags[2] = true;
    if (errors.main_image || errors.cover_image || errors.video_url) flags[3] = true;
    if (errors.amenities) flags[4] = true;
    if (errors.email || errors.website) flags[5] = true;
    if (errors.check_in_time || errors.check_out_time || errors.cancellation_policy) flags[6] = true;
    return flags;
  }, [errors]);

  const loadAmenities = useCallback(async () => {
    setAmenitiesLoading(true);
    setAmenitiesError(null);
    try {
      const list = await fetchPropertyAmenities({ activeOnly: true });
      setAmenitiesCatalog(list);
    } catch (err) {
      setAmenitiesError(err.message || t('pages.amenities.errorLoad', 'Failed to load amenities'));
      setAmenitiesCatalog([]);
    } finally {
      setAmenitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAmenities();
  }, [loadAmenities]);

  const loadServiceCategories = useCallback(async () => {
    try {
      setServiceCategories(await fetchServiceCategories({ activeOnly: true }));
    } catch {
      setServiceCategories([]);
    }
  }, []);

  useEffect(() => {
    loadServiceCategories();
  }, [loadServiceCategories]);

  const reloadPropertyImagesFromApi = useCallback(async () => {
    if (!isEdit || !id) return;
    const images = await fetchPropertyImages(id);
    setExistingImages(mapApiImagesToExisting(images));
    setPendingImages((prev) => {
      revokePendingPreviews(prev);
      return [];
    });
    setDeletedImageIds([]);
  }, [id, isEdit]);

  useEffect(() => {
    if (!isEdit) return undefined;

    let cancelled = false;
    setLoadingProperty(true);
    setLoadError(null);

    Promise.all([
      fetchPropertyById(id),
      fetchPropertyImages(id),
      fetchPropertySetupStatus(id)
    ])
      .then(([property, images, setup]) => {
        if (cancelled) return;
        const nextForm = mapHotelToForm(property);
        if (nextForm) {
          setForm(nextForm);
          lastSavedVideoUrlRef.current = nextForm.video_url || '';
        }
        setExistingImages(mapApiImagesToExisting(images));
        setSetupStatus(setup);
        if (setup?.last_completed_step && !isOnboarding) {
          const resumeStep = normalizeWizardResumeStep(setup.last_completed_step, totalStepsCount);
          setStep(resumeStep);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || t('pages.addHotel.errorLoad', 'Failed to load property'));
      })
      .finally(() => {
        if (!cancelled) setLoadingProperty(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, isOnboarding, totalStepsCount]);

  const handleChange = useCallback((field, value) => {
    if (field === '_workspace_step') {
      const target = Number(value);
      if (target > step) {
        for (let s = step; s < target; s += 1) {
          const { valid, errors: stepErrors } = validateHotelStep(
            s,
            form,
            imageState,
            stepValidationOpts
          );
          if (!valid) {
            showSaveFieldErrors(stepErrors);
            setStep(s);
            return;
          }
        }
      }
      clearSaveAlert();
      setErrors({});
      setStep(target);
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    clearSaveAlert();
  }, [step, form, imageState, stepValidationOpts, showSaveFieldErrors, clearSaveAlert]);

  const handleLocationPick = useCallback((updates) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const next = { ...prev };
      ['country', 'city', 'address', 'latitude', 'longitude'].forEach((key) => {
        if (updates[key] !== undefined) next[key] = undefined;
      });
      return next;
    });
  }, []);

  const handleVideoUrlSave = useCallback(async (rawUrl) => {
    const trimmed = resolveOptionalVideoUrl(rawUrl);
    setForm((prev) => ({ ...prev, video_url: trimmed }));
    setErrors((prev) => ({ ...prev, video_url: undefined }));

    if (!isEdit || !id) return;
    if (trimmed === lastSavedVideoUrlRef.current) return;

    try {
      await patchPropertyFields(id, { video_url: trimmed });
      lastSavedVideoUrlRef.current = trimmed;
      notify.success(
        trimmed
          ? t('pages.addHotel.form.videoLinkSaved', 'Video link saved')
          : t('pages.addHotel.form.videoLinkCleared', 'Video link removed')
      );
    } catch (err) {
      notify.error(t('pages.addHotel.form.videoLinkSaveError', 'Could not save video link'), {
        message: getFriendlyUploadError(err, t('pages.addHotel.form.videoLinkSaveError', 'Could not save video link'))
      });
    }
  }, [getFriendlyUploadError, id, isEdit, notify, t]);

  const handleAddPropertyImageFiles = (files) => {
    if (!files.length) return;
    const added = files.map((file) => createPendingFromFile(file, { isCover: false }));

    setPendingImages((prev) => {
      const next = [...prev, ...added];
      const auto = autoCoverIfNeeded(existingImages, next, deletedImageIds);
      return auto.pendingImages;
    });
    setErrors((prev) => ({ ...prev, main_image: undefined }));
    notify.success(`${files.length} image${files.length === 1 ? '' : 's'} uploaded`, {
      message: 'Gallery updated. Save the property to persist changes.'
    });
  };

  const handleInvalidPropertyImageFiles = (count) => {
    notify.warning('Some images were not uploaded', {
      message: `${count} file${count === 1 ? '' : 's'} must be JPG, PNG, or WEBP.`
    });
  };

  const handleRemoveExistingImage = async (imageId) => {
    if (isEdit && id) {
      try {
        await deletePropertyImage(imageId);
        setExistingImages((prev) => prev.filter((img) => String(img.id) !== String(imageId)));
        setDeletedImageIds((prev) => prev.filter((itemId) => String(itemId) !== String(imageId)));
        setErrors((prev) => ({ ...prev, main_image: undefined }));
        notify.success(t('pages.addHotel.imageDeleted', 'Image removed'));
      } catch (err) {
        notify.error(t('pages.addHotel.imageDeleteError', 'Could not remove image'), {
          message: getFriendlyUploadError(err, t('pages.addHotel.imageDeleteError', 'Could not remove image'))
        });
      }
      return;
    }

    setDeletedImageIds((prev) => (prev.includes(imageId) ? prev : [...prev, imageId]));
    setErrors((prev) => ({ ...prev, main_image: undefined }));
  };

  const handleRemovePendingImage = (localId) => {
    setPendingImages((prev) => {
      const target = prev.find((img) => img.localId === localId);
      if (target?.preview?.startsWith('blob:')) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.localId !== localId);
    });
    setErrors((prev) => ({ ...prev, main_image: undefined }));
  };

  const handleUpdateExistingImage = (imageId, updates) => {
    setExistingImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, ...updates } : img))
    );
  };

  const handleUpdatePendingImage = (localId, updates) => {
    setPendingImages((prev) =>
      prev.map((img) => (img.localId === localId ? { ...img, ...updates } : img))
    );
  };

  const handleSetPropertyImageCover = async (key, type) => {
    const next = setCoverImage(existingImages, pendingImages, key, type);
    setExistingImages(next.existingImages);
    setPendingImages(next.pendingImages);
    setErrors((prev) => ({ ...prev, main_image: undefined }));

    if (!isEdit || !id || type !== 'existing') return;

    try {
      await setPropertyCoverImage(id, key);
      await reloadPropertyImagesFromApi();
      notify.success(t('pages.addHotel.coverSet', 'Cover image updated'));
    } catch (err) {
      await reloadPropertyImagesFromApi();
      notify.error(t('pages.addHotel.coverSetError', 'Could not set cover image'), {
        message: getFriendlyUploadError(err, t('pages.addHotel.coverSetError', 'Could not set cover image'))
      });
    }
  };

  const handleReorderPropertyImages = (orderedItems) => {
    const existingOrder = new Map();
    const pendingOrder = new Map();
    orderedItems.forEach((item, index) => {
      if (item.type === 'existing') existingOrder.set(item.id, index);
      if (item.type === 'pending') pendingOrder.set(item.localId, index);
    });

    setExistingImages((prev) =>
      [...prev]
        .map((img) =>
          existingOrder.has(img.id)
            ? { ...img, displayOrder: existingOrder.get(img.id), dirty: true }
            : img
        )
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    );
    setPendingImages((prev) =>
      [...prev]
        .map((img) =>
          pendingOrder.has(img.localId)
            ? { ...img, displayOrder: pendingOrder.get(img.localId) }
            : img
        )
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    );
  };

  const closeQuickModal = useCallback((force = false) => {
    if (quickSubmitting && !force) return;
    setQuickModal(null);
    setQuickErrors({});
    setQuickSubmitError(null);
  }, [quickSubmitting]);

  const openQuickAmenity = () => {
    setQuickAmenityForm({ name: '', name_ar: '', is_active: true });
    setQuickErrors({});
    setQuickSubmitError(null);
    setQuickModal('amenity');
  };

  const openQuickCategory = () => {
    setQuickCategoryForm(EMPTY_CATEGORY_FORM);
    setQuickErrors({});
    setQuickSubmitError(null);
    setQuickModal('category');
  };

  const openQuickService = () => {
    setQuickServiceForm({
      ...EMPTY_SERVICE_FORM,
      property: isEdit ? String(id) : '',
      category_id: serviceCategories[0]?.id || ''
    });
    setQuickErrors({});
    setQuickSubmitError(null);
    setQuickModal('service');
  };

  const handleQuickAmenitySubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!quickAmenityForm.name.trim()) nextErrors.name = 'Name is required';
    setQuickErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setQuickSubmitting(true);
    setQuickSubmitError(null);
    try {
      const created = await createPropertyAmenity(quickAmenityForm);
      await loadAmenities();
      setForm((prev) => ({
        ...prev,
        amenity_ids: [...new Set([...(prev.amenity_ids || []).map(Number), Number(created.id)])]
      }));
      notify.success('Amenity added successfully', {
        message: `${created.name} was selected for this property.`
      });
      closeQuickModal(true);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setQuickSubmitError(message);
      notify.error('Failed to create amenity', { message });
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleQuickCategorySubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!quickCategoryForm.name.trim()) nextErrors.name = 'Name is required';
    setQuickErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setQuickSubmitting(true);
    setQuickSubmitError(null);
    try {
      const created = await createServiceCategory(quickCategoryForm);
      await loadServiceCategories();
      setQuickServiceForm((prev) => ({ ...prev, category_id: created.id }));
      notify.success('Service category created successfully', {
        message: `${created.name} is ready for services.`
      });
      setQuickModal('service');
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setQuickSubmitError(message);
      notify.error('Failed to create service category', { message });
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleQuickServiceSubmit = async (event) => {
    event.preventDefault();
    const formForValidation = { ...quickServiceForm, property: isEdit ? String(id) : quickServiceForm.property };
    const nextErrors = validatePropertyServiceForm(formForValidation, { requireProperty: false });
    setQuickErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setQuickSubmitting(true);
    setQuickSubmitError(null);
    try {
      const serviceForm = { ...quickServiceForm, property: isEdit ? String(id) : '' };
      if (isEdit) {
        const created = await createPropertyService(serviceForm);
        setAssignedServicesSummary((prev) => [...prev, { name: created.name }]);
        setServicesRefreshKey((key) => key + 1);
        notify.success('Service created successfully', {
          message: `${created.name} was added to this property.`
        });
      } else {
        setPendingServices((prev) => [
          ...prev,
          {
            ...serviceForm,
            localId: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          }
        ]);
        notify.success('Service added', {
          message: `${quickServiceForm.name} will be created when the property is saved.`
        });
      }
      closeQuickModal(true);
    } catch (err) {
      const message = formatApiErrors(err.data) || err.message;
      setQuickSubmitError(message);
      notify.error('Failed to create service', { message });
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setForm(EMPTY_HOTEL_FORM);
    setErrors({});
    setPendingImages((prev) => {
      revokePendingPreviews(prev);
      return [];
    });
    setExistingImages([]);
    setDeletedImageIds([]);
    setPendingServices([]);
    setAssignedServicesSummary([]);
    clearSaveAlert();
    setSuccess(null);
  };

  const goNext = () => {
    const { valid, errors: stepErrors } = validateHotelStep(
      step,
      form,
      imageState,
      stepValidationOpts
    );
    if (!valid) {
      showSaveFieldErrors(stepErrors);
      return;
    }
    clearSaveAlert();
    setErrors({});
    setStep((s) => Math.min(s + 1, totalStepsCount));
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  const saveProperty = async (formData, activeOverride, { requirePhotos = false, requireAmenities = false, throughStep = null } = {}) => {
    const activeState = activeOverride !== undefined ? activeOverride : formData.is_active;
    const formWithActive = {
      ...formData,
      is_active: activeState,
      video_url: resolveOptionalVideoUrl(formData.video_url),
    };

    const validation = validateHotelForm(formWithActive, imageState, isOnboarding, {
      requirePhotos,
      requireAmenities,
      throughStep,
    });
    if (!validation.valid) {
      showSaveFieldErrors(validation.errors);
      throw new Error('Validation failed');
    }

    const property = isEdit
      ? await updateProperty(id, formWithActive)
      : await createProperty(formWithActive);

    lastSavedVideoUrlRef.current = String(formWithActive.video_url || '').trim();

    try {
      const { coverImageId } = await syncPropertyImages(property.id, {
        existingImages,
        pendingImages,
        deletedImageIds,
      });
      if (coverImageId) {
        try {
          await updatePropertyCoverImage(property.id, coverImageId);
        } catch (coverErr) {
          notify.warning(
            t('pages.addHotel.coverImageWarningTitle', 'Photos uploaded, but cover image was not linked'),
            {
              message: getFriendlyUploadError(
                coverErr,
                t('pages.addHotel.coverImageWarning', 'Open the property and set a cover photo manually.')
              )
            }
          );
        }
      }
      if (isEdit) {
        await reloadPropertyImagesFromApi();
      }
    } catch (err) {
      notify.warning(
        t('pages.addHotel.imagesUploadWarningTitle', 'Property saved, but images were not uploaded'),
        {
          message: getFriendlyUploadError(
            err,
            t('pages.addHotel.imagesUploadWarning', 'Please check the server upload folder and upload the images again from the property page.')
          )
        }
      );
    }

    if (!isEdit && pendingServices.length) {
      await Promise.all(
        pendingServices.map(({ localId, property: _p, ...serviceForm }) =>
          createPropertyService({ ...serviceForm, property: property.id })
        )
      );
    }
    return property;
  };

  const handleSubmit = async (isActiveOverride) => {
    clearSaveAlert();
    setSubmitting(true);
    const throughStep = isOnboarding ? currentStep : null;
    try {
      const property = await saveProperty(form, isActiveOverride, { throughStep });
      await refresh();
      notify.success(isEdit ? 'Property updated successfully' : 'Property created successfully', {
        message: property.name,
        action: {
          label: 'View property',
          onClick: () => window.open(`/hotel/${property.id}`, '_blank', 'noreferrer')
        }
      });
      if (!isEdit) {
        navigate(`/admin/hotels/${property.id}/edit`);
      } else {
        setForm((prev) => ({
          ...prev,
          publishing_status: property.publishingStatus || prev.publishing_status || 'draft'
        }));
        clearSaveAlert();
      }
    } catch (err) {
      if (err.message === 'Validation failed') return;
      const { fieldErrors, message } = resolveSaveError(
        err,
        t('pages.addHotel.saveErrorFriendly', 'Could not save the property. Please check the required fields and try again.'),
        saveErrorOptions
      );
      if (Object.keys(fieldErrors).length) {
        showSaveFieldErrors(fieldErrors);
      } else {
        setSaveAlert({
          title: t('pages.addHotel.saveErrorTitle', 'Could not save property'),
          intro: message,
          lines: [],
          stepLabel: ''
        });
      }
      notify.error(t('pages.addHotel.saveErrorTitle', 'Could not save property'), { message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setSubmitting(true);
    clearSaveAlert();
    try {
      await saveProperty(form, true, { requirePhotos: true, requireAmenities: true, throughStep: 4 });
      setForm((prev) => ({ ...prev, is_active: true, publishing_status: 'published' }));
      await refresh();

      const published = await publishProperty(id);
      setSetupStatus(await fetchPropertySetupStatus(id));
      notify.success('Property published', { message: published.name });
    } catch (err) {
      if (err.message === 'Validation failed') return;
      const { fieldErrors, message } = resolveSaveError(
        err,
        t('pages.addHotel.publishErrorFriendly', 'Could not publish the property. Please complete the required information and try again.'),
        saveErrorOptions
      );
      if (Object.keys(fieldErrors).length) {
        showSaveFieldErrors(fieldErrors);
      } else {
        setSaveAlert({
          title: t('pages.addHotel.saveErrorTitle', 'Could not save property'),
          intro: message,
          lines: [],
          stepLabel: ''
        });
      }
      notify.warning('Could not publish property', { message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this property? It will be hidden from guests but retained for records.')) return;
    setSubmitting(true);
    clearSaveAlert();
    try {
      await archiveProperty(id);
      notify.success('Property archived');
      navigate('/admin/hotels');
      await refresh();
    } catch (err) {
      const message = getFriendlySaveError(err, t('pages.addHotel.archiveErrorFriendly', 'Could not archive the property. Please try again.'), saveErrorOptions);
      setSaveAlert({
        title: t('pages.addHotel.saveErrorTitle', 'Could not save property'),
        intro: message,
        lines: [],
        stepLabel: ''
      });
      notify.error('Failed to archive property', { message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    clearSaveAlert();
    try {
      await deleteProperty(id);
      notify.success(t('pages.addHotel.deleteSuccess', 'Property deleted'));
      setDeleteConfirmOpen(false);
      navigate('/admin/hotels');
      await refresh();
    } catch (err) {
      const message = getFriendlySaveError(err, t('pages.addHotel.deleteErrorFriendly', 'Could not delete the property. Please try again.'), saveErrorOptions);
      setSaveAlert({
        title: t('pages.addHotel.deleteError', 'Failed to delete property'),
        intro: message,
        lines: [],
        stepLabel: ''
      });
      notify.error(t('pages.addHotel.deleteError', 'Failed to delete property'), { message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProperty) {
    return (
      <div className="admin-page">
        <ApiLoading message={t('pages.addHotel.loading', 'Loading property...')} variant="form" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-page">
        <ApiError message={loadError} onRetry={() => navigate(0)} />
        <Link to="/admin/hotels" className="admin-btn admin-btn-secondary">
          Back to properties
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="admin-page">
        <div className="admin-panel-card hotel-success-card">
          <h2>{isEdit ? 'Property updated successfully' : 'Property created successfully'}</h2>
          <p>
            <strong>{success.name}</strong> — {success.city}, {success.country}
          </p>
          <p className="admin-hint">ID: {success.id}</p>
          <div className="hotel-form-actions">
            <Link
              to={`/hotel/${success.id}`}
              className="admin-btn admin-btn-secondary"
              target="_blank"
              rel="noreferrer"
            >
              View on guest site
            </Link>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/hotels')}>
              My properties
            </button>
            {!isEdit && (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset}>
                Add another property
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page admin-property-wizard-page">
      <div className="admin-page-header admin-page-header-row">
        <div>
          <h2>{isEdit ? t('pages.addHotel.editTitle', 'Edit property') : t('pages.addHotel.createTitle', 'Add property')}</h2>
          <p>
            {isEdit
              ? t('pages.addHotel.editSubtitle', 'Update property details, media, and setup')
              : t('pages.addHotel.createSubtitleShort', 'Add the essentials first. You can complete the rest later.')}
          </p>
          {isOnboarding && (
            <p className="admin-hint admin-property-required-hint">
              {t('pages.addHotel.requiredFieldsHint', 'Required to save: property name, type, star rating, country, city, and address.')}
            </p>
          )}
          {isOnboarding && (
            <div className="admin-property-wizard-status" aria-live="polite">
              <span>{t('pages.addHotel.currentStep', 'Step {{step}} of {{total}}', { step: currentStep, total: totalStepsCount })}</span>
            </div>
          )}
        </div>
        <div className="admin-page-header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {isEdit && (
            <button
              type="button"
              className="admin-btn admin-btn-danger-outline link-with-icon"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={submitting}
            >
              <Icon name="trash-2" size={16} />
              <span>{t('pages.addHotel.delete', 'Delete property')}</span>
            </button>
          )}
          <Link to="/admin/hotels" className="admin-btn admin-btn-secondary link-with-icon">
            <Icon name="arrow-left" size={16} />
            <span>{t('pages.addHotel.backToList', 'Back to properties')}</span>
          </Link>
        </div>
      </div>

      {saveAlert && (
        <div className="admin-alert admin-alert-error admin-alert-error--human" role="alert">
          <strong>{saveAlert.title}</strong>
          {saveAlert.intro && <p>{saveAlert.intro}</p>}
          {saveAlert.lines.length > 0 && (
            <ul className="admin-alert-error-list">
              {saveAlert.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {saveAlert.stepLabel && (
            <p className="admin-hint">
              {t('pages.addHotel.validationGoToStep', 'Go to step «{{step}}» to complete them.', { step: saveAlert.stepLabel })}
            </p>
          )}
        </div>
      )}

      <div className="onboarding-layout onboarding-layout--focused">
        {isOnboarding && (
          <aside className="onboarding-layout__stepper">
            <OnboardingStepper
              steps={onboardingSteps}
              currentStep={currentStep}
              onStepClick={(id) => handleChange('_workspace_step', id)}
              compact
              stepErrors={stepErrorFlags}
            />
          </aside>
        )}

        <main className={`onboarding-layout__editor${!isOnboarding ? ' onboarding-layout__editor--full' : ''}`}>
          <div className="onboarding-editor-card">
            <HotelForm
              currentStep={currentStep}
              totalSteps={totalStepsCount}
              values={form}
              errors={errors}
              onChange={handleChange}
              onLocationPick={handleLocationPick}
              submitting={submitting}
              amenitiesCatalog={amenitiesCatalog}
              amenitiesLoading={amenitiesLoading}
              amenitiesError={amenitiesError}
              existingImages={existingImages}
              pendingImages={pendingImages}
              deletedImageIds={deletedImageIds}
              onAddPropertyImageFiles={handleAddPropertyImageFiles}
              onRemoveExistingImage={handleRemoveExistingImage}
              onRemovePendingImage={handleRemovePendingImage}
              onUpdateExistingImage={handleUpdateExistingImage}
              onUpdatePendingImage={handleUpdatePendingImage}
              onSetPropertyImageCover={handleSetPropertyImageCover}
              onReorderPropertyImages={handleReorderPropertyImages}
              onInvalidPropertyImageFiles={handleInvalidPropertyImageFiles}
              onVideoUrlSave={handleVideoUrlSave}
              onOpenQuickCreateAmenity={openQuickAmenity}
              isOnboarding={isOnboarding}
            />

            <div className="hotel-form-actions hotel-wizard-actions">
              {!isEdit && (
                <button type="button" className="admin-btn admin-btn-secondary" onClick={handleReset} disabled={submitting}>
                  {t('common.reset', 'Reset')}
                </button>
              )}

              <div className="hotel-wizard-nav">
                {currentStep > 1 && (
                  <button type="button" className="admin-btn admin-btn-secondary link-with-icon" onClick={goBack} disabled={submitting}>
                    <Icon name="arrow-left" size={16} />
                    <span>{t('common.previous', 'Previous')}</span>
                  </button>
                )}
                {currentStep < totalStepsCount && (
                  <button type="button" className="admin-btn admin-btn-primary link-with-icon" onClick={goNext} disabled={submitting}>
                    <span>{t('common.next', 'Next')}</span>
                    <Icon name="arrow-right" size={16} />
                  </button>
                )}
                {isOnboarding && currentStep < totalStepsCount && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                  >
                    {submitting ? t('pages.addHotel.saving', 'Saving...') : t('pages.addHotel.saveDraft', 'Save draft')}
                  </button>
                )}
                {!isOnboarding && (
                  <>
                    <button type="button" className="admin-btn admin-btn-secondary" onClick={() => handleSubmit()} disabled={submitting}>
                      {submitting ? t('common.saving', 'Saving...') : t('common.saveChanges', 'Save changes')}
                    </button>
                    {form.publishing_status !== 'published' && (
                      <button type="button" className="admin-btn admin-btn-primary" onClick={handlePublish} disabled={submitting}>
                        {t('pages.addHotel.publish', 'Publish property')}
                      </button>
                    )}
                  </>
                )}
                {isOnboarding && currentStep === totalStepsCount && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="admin-btn admin-btn-primary" onClick={() => handleSubmit(false)} disabled={submitting}>
                      {submitting ? t('pages.addHotel.saving', 'Saving...') : t('pages.addHotel.saveProperty', 'Save property')}
                    </button>
                  </div>
                )}
                {isEdit && (
                  <button type="button" className="admin-btn admin-btn-danger-outline" onClick={handleArchive} disabled={submitting} style={{ marginLeft: 'auto' }}>
                    <Icon name="archive" size={16} />
                    <span>{t('pages.addHotel.archive', 'Archive property')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        {isOnboarding && (
          <aside className="onboarding-layout__preview">
            <PropertyWizardSummary
              values={form}
              photoCount={photoCount}
              amenityCount={(form.amenity_ids || []).length}
              currentStep={currentStep}
              totalSteps={totalStepsCount}
            />
          </aside>
        )}
      </div>

      {quickModal === 'amenity' && (
        <QuickCreateModal
          title="Quick create amenity"
          description="Add an amenity and select it for this property."
          submitLabel="Create amenity"
          submitting={quickSubmitting}
          error={quickSubmitError}
          onSubmit={handleQuickAmenitySubmit}
          onClose={closeQuickModal}
        >
          <div className="form-group">
            <label htmlFor="quick-amenity-name">{t('pages.amenities.amenityName', 'Amenity name')} *</label>
            <input
              id="quick-amenity-name"
              value={quickAmenityForm.name}
              onChange={(event) => {
                setQuickAmenityForm((prev) => ({ ...prev, name: event.target.value }));
                setQuickErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={t('pages.amenities.namePlaceholder', 'e.g. Free WiFi')}
              autoFocus
            />
            {quickErrors.name && <span className="field-error">{quickErrors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="quick-amenity-name-ar">{t('pages.amenities.amenityNameAr', 'Amenity name (Arabic)')}</label>
            <input
              id="quick-amenity-name-ar"
              value={quickAmenityForm.name_ar}
              onChange={(event) => {
                setQuickAmenityForm((prev) => ({ ...prev, name_ar: event.target.value }));
              }}
              placeholder={t('pages.amenities.nameArPlaceholder', 'مثال: واي فاي مجاني')}
              dir="rtl"
            />
          </div>
          <label className="checkbox-label admin-service-checkbox-card">
            <input
              type="checkbox"
              checked={quickAmenityForm.is_active}
              onChange={(event) => setQuickAmenityForm((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            <span><strong>Active</strong><small>Available for property setup</small></span>
          </label>
        </QuickCreateModal>
      )}

      {quickModal === 'category' && (
        <QuickCreateModal
          title="Quick create service category"
          description="Create a category, then continue creating a service."
          submitLabel="Create category"
          submitting={quickSubmitting}
          error={quickSubmitError}
          onSubmit={handleQuickCategorySubmit}
          onClose={closeQuickModal}
        >
          <div className="form-group">
            <label htmlFor="quick-category-name">Category name *</label>
            <input
              id="quick-category-name"
              value={quickCategoryForm.name}
              onChange={(event) => {
                setQuickCategoryForm((prev) => ({ ...prev, name: event.target.value }));
                setQuickErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Transport"
              autoFocus
            />
            {quickErrors.name && <span className="field-error">{quickErrors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="quick-category-description">Description</label>
            <textarea
              id="quick-category-description"
              rows={3}
              value={quickCategoryForm.description}
              onChange={(event) => setQuickCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Optional internal description"
            />
          </div>
        </QuickCreateModal>
      )}

      {quickModal === 'service' && (
        <QuickCreateModal
          title="Quick create service"
          description="Add a service without leaving property setup."
          submitLabel="Create service"
          submitting={quickSubmitting}
          error={quickSubmitError}
          onSubmit={handleQuickServiceSubmit}
          onClose={closeQuickModal}
        >
          {serviceCategories.length === 0 ? (
            <div className="admin-alert admin-alert-error">
              <p>Create a service category first.</p>
              <button type="button" className="admin-btn admin-btn-secondary" onClick={openQuickCategory}>
                Create category
              </button>
            </div>
          ) : (
            <>
              <div className="hotel-form-grid">
                <div className="form-group">
                  <label htmlFor="quick-service-category">Category *</label>
                  <select
                    id="quick-service-category"
                    value={quickServiceForm.category_id}
                    onChange={(event) => {
                      setQuickServiceForm((prev) => ({ ...prev, category_id: event.target.value }));
                      setQuickErrors((prev) => ({ ...prev, category_id: undefined }));
                    }}
                  >
                    <option value="">Select category</option>
                    {serviceCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {quickErrors.category_id && <span className="field-error">{quickErrors.category_id}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="quick-service-name">Service name *</label>
                  <input
                    id="quick-service-name"
                    value={quickServiceForm.name}
                    onChange={(event) => {
                      setQuickServiceForm((prev) => ({ ...prev, name: event.target.value }));
                      setQuickErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    placeholder="e.g. Airport transfer"
                    autoFocus
                  />
                  {quickErrors.name && <span className="field-error">{quickErrors.name}</span>}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="quick-service-short">Short description</label>
                <input
                  id="quick-service-short"
                  value={quickServiceForm.short_description}
                  onChange={(event) => setQuickServiceForm((prev) => ({ ...prev, short_description: event.target.value }))}
                  placeholder="Shown to guests"
                />
              </div>
              <label className="checkbox-label admin-service-checkbox-card">
                <input
                  type="checkbox"
                  checked={quickServiceForm.is_active}
                  onChange={(event) => setQuickServiceForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                <span><strong>Active</strong><small>Available for this property</small></span>
              </label>
            </>
          )}
        </QuickCreateModal>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t('pages.addHotel.deleteTitle', 'Delete property?')}
        message={t(
          'pages.addHotel.deleteMsg',
          '"{{name}}" will be permanently removed. This cannot be undone.',
          { name: form.name || id }
        )}
        confirmLabel={t('pages.addHotel.deleteBtn', 'Delete property')}
        loading={submitting}
        onCancel={() => !submitting && setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default AdminAddHotelPage;
