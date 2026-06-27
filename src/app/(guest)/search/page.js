import { Suspense } from 'react';
import SearchResultsPage from '@/views/SearchResultsPage';
import LoadingExperience from '@/components/shared/LoadingExperience';

export const metadata = {
  title: 'Search hotels',
  description: 'Compare hotels, prices, and availability across destinations.'
};

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingExperience />}>
      <SearchResultsPage />
    </Suspense>
  );
}
