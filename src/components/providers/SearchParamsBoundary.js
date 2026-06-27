'use client';

import { Suspense } from 'react';
import LoadingExperience from '@/components/shared/LoadingExperience';

export default function SearchParamsBoundary({ children }) {
  return <Suspense fallback={<LoadingExperience />}>{children}</Suspense>;
}
