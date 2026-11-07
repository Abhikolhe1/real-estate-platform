import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ExplorerSkeleton } from '@/components/page-skeleton';

const ApprovedTwinView = dynamic(
  () => import('@/sections/canonical-twin/ApprovedTwinView'),
  {
    ssr: false,
    loading: () => <ExplorerSkeleton />,
  },
);

export default function TwinPage() {
  return (
    <Suspense fallback={<ExplorerSkeleton />}>
      <ApprovedTwinView />
    </Suspense>
  );
}
