import { Suspense } from 'react';
import HotelDetailPage from '@/views/HotelDetailPage';
import LoadingExperience from '@/components/shared/LoadingExperience';
import { fetchPropertyServer } from '@/lib/server/properties';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const hotel = await fetchPropertyServer(id);
    if (!hotel) return { title: 'Hotel not found' };
    const city = hotel.city ? `, ${hotel.city}` : '';
    return {
      title: `${hotel.name}${city}`,
      description: (hotel.description || hotel.shortDescription || '').slice(0, 160),
      openGraph: {
        title: hotel.name,
        description: hotel.description?.slice(0, 200),
        images: hotel.image ? [{ url: hotel.image }] : []
      },
      alternates: {
        canonical: `/hotel/${id}`
      }
    };
  } catch {
    return { title: 'Hotel details' };
  }
}

export default async function HotelPage({ params }) {
  const { id } = await params;
  let initialHotel = null;
  try {
    initialHotel = await fetchPropertyServer(id);
  } catch {
    initialHotel = null;
  }

  return (
    <Suspense fallback={<LoadingExperience />}>
      <HotelDetailPage initialHotel={initialHotel} />
    </Suspense>
  );
}
