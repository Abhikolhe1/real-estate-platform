import { Suspense } from 'react';
import DynamicPageRenderer from '@/components/dynamic-page-renderer';
import { PageSkeleton } from '@/components/page-skeleton';

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="Loading contact details" />}>
      <DynamicPageRenderer slug="contact" />
    </Suspense>
  );
}
