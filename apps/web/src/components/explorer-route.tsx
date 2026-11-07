'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExplorerSkeleton } from './page-skeleton';
import { builderUrl } from '@/lib/public-data';

const PropertyExperience = dynamic(
  () => import('./property-viewer/PropertyExperience'),
  { ssr: false, loading: ExplorerSkeleton },
);

export default function ExplorerRoute() {
  const params = useSearchParams();
  const slug = params.get('builder') || 'aethelgard';

  return (
    <div className="px-3 pb-4 pt-4 md:px-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Explore the architecture</h1>
          <p className="mt-1 text-xs text-on-surface-variant">
            Choose a floor, step inside, and make it your own.
          </p>
        </div>
        <Link
          className="text-xs text-on-surface-variant underline underline-offset-4 hover:text-primary"
          href={builderUrl('/explorer', slug)}
        >
          Explore interactive spatial twin
        </Link>
      </div>
      <PropertyExperience proceduralDemo />
    </div>
  );
}
