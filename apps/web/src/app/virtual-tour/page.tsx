import { Suspense } from 'react';
import DynamicPageRenderer from '@/components/dynamic-page-renderer';
import { PageSkeleton } from '@/components/page-skeleton';

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="Loading virtual tour" />}>
      <DynamicPageRenderer slug="virtual-tour" />
    </Suspense>
  );
}
