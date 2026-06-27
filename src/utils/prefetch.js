const idle = (task) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 1600 });
  } else {
    window.setTimeout(task, 80);
  }
};

export function prefetchAdminSetupData() {
  idle(async () => {
    try {
      const [
        propertiesApi,
        amenitiesApi,
        categoriesApi,
        servicesApi,
        roomsApi
      ] = await Promise.all([
        import('../api/propertiesApi'),
        import('../api/propertyAmenitiesApi'),
        import('../api/serviceCategoriesApi'),
        import('../api/propertyServicesApi'),
        import('../api/roomTypesApi')
      ]);
      await Promise.allSettled([
        propertiesApi.fetchAdminProperties(),
        amenitiesApi.fetchPropertyAmenities({ activeOnly: true }),
        categoriesApi.fetchServiceCategories({ activeOnly: true }),
        servicesApi.fetchPropertyServices(),
        roomsApi.fetchRoomTypes()
      ]);
    } catch {
      // Prefetch is opportunistic.
    }
  });
}

export function prefetchGuestSearchData(ensureLoaded) {
  idle(() => {
    ensureLoaded?.();
  });
}
