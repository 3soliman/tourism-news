import AdminAddHotelPage from '@/views/admin/AdminAddHotelPage';

export const metadata = { title: 'Add property', robots: { index: false } };

export default function AdminNewHotelRoute() {
  return <AdminAddHotelPage />;
}
