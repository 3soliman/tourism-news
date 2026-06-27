import AdminAddHotelPage from '@/views/admin/AdminAddHotelPage';

export const metadata = { title: 'Property', robots: { index: false } };

export default function AdminPropertyRoute() {
  return <AdminAddHotelPage />;
}
