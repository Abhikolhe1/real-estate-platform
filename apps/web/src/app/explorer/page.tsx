import { Suspense } from 'react';
import ExplorerRoute from '@/components/explorer-route';
import { ExplorerSkeleton } from '@/components/page-skeleton';
export default function ExplorerPage() {
  return <Suspense fallback={<div className="p-4"><ExplorerSkeleton /></div>}><ExplorerRoute /></Suspense>;
}
