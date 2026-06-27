import AdminDashboardPage from '@/views/admin/AdminDashboardPage';

export const metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false }
};

export default function AdminDashboardRoute() {
  return <AdminDashboardPage />;
}
