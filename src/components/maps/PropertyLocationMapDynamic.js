'use client';

import dynamic from 'next/dynamic';

const PropertyLocationMap = dynamic(() => import('@/components/hotel/PropertyLocationMap'), {
  ssr: false,
  loading: () => <div className="hotel-map-loading">Loading map…</div>
});

export default PropertyLocationMap;
