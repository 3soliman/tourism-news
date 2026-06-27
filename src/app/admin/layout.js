import ErrorBoundary from '@/components/shared/ErrorBoundary';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminProviders from '@/components/providers/AdminProviders';

export const dynamic = 'force-dynamic';

export default function AdminRootLayout({ children }) {
  return (
    <ErrorBoundary>
      <AdminProviders>
        <AdminLayout>{children}</AdminLayout>
      </AdminProviders>
    </ErrorBoundary>
  );
}
