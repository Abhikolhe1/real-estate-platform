'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExplorerSkeleton } from './page-skeleton';
import { builderUrl } from '@/lib/public-data';

const PropertyExperience = dynamic(() => import('./property-viewer/PropertyExperience'), { ssr: false, loading: ExplorerSkeleton });
const LegacyExplorer = dynamic(() => import('./legacy-explorer'), { ssr: false, loading: ExplorerSkeleton });

export default function ExplorerRoute() {
  const params = useSearchParams();
  const slug = params.get('builder') || 'aethelgard';
  if (params.get('legacy') === '1') return <LegacyExplorer />;
  return <div className="px-3 pb-4 pt-4 md:px-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div><h1 className="text-lg font-semibold">Explore the architecture</h1><p className="mt-1 text-xs text-white/50">Choose a floor, step inside, and make it your own.</p></div>
      <Link className="text-xs text-white/55 underline underline-offset-4 hover:text-white" href={builderUrl('/explorer?legacy=1', slug)}>Advanced explorer</Link>
    </div>
    <PropertyExperience proceduralDemo />
  </div>;
}
