import AdminHotelsListPage from '@/views/admin/AdminHotelsListPage';

export const metadata = { title: 'Properties', robots: { index: false } };

export default function AdminHotelsRoute() {
  return <AdminHotelsListPage />;
}
