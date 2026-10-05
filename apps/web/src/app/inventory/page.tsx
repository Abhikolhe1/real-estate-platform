import { Suspense } from 'react';
import LiveInventory from '@/components/live-inventory';
import { PageSkeleton } from '@/components/page-skeleton';
export default function InventoryPage() {
  return <Suspense fallback={<PageSkeleton label="Loading available homes" />}><LiveInventory /></Suspense>;
}
