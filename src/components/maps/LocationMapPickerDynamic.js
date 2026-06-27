'use client';

import dynamic from 'next/dynamic';

const LocationMapPicker = dynamic(() => import('@/components/admin/hotel/LocationMapPicker'), {
  ssr: false,
  loading: () => <div className="hotel-map-loading">Loading map…</div>
});

export default LocationMapPicker;
