import { Suspense } from 'react';
import LiveInventory from '@/components/live-inventory';
import { PageSkeleton } from '@/components/page-skeleton';
export default function UnitDetailPage({ params }: { params: { id: string } }) {
  return <Suspense fallback={<PageSkeleton label="Loading home details" />}><LiveInventory unitId={params.id} /></Suspense>;
}
