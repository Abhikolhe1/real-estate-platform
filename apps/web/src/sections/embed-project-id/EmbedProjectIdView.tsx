'use client';

import { API_URL } from '@/config/api';
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ExplorerSkeleton } from '@/components/page-skeleton';
import { Icon } from '@iconify/react';

const BuildingViewer = dynamic(() => import('@/components/building-viewer'), {
  ssr: false,
  loading: ExplorerSkeleton,
});

interface EmbedProjectPageProps {
  params: {
    id: string; // Project ID
  };
}

function EmbedContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const sdkKey = searchParams.get('key');
  const initialMode = searchParams.get('mode') === 'walkthrough' ? 'walkthrough' : 'building';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolved backend configs
  const [tenantId, setTenantId] = useState<string>('');
  const [models, setModels] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [tours, setTours] = useState<any[]>([]);
  const [floorPlans, setFloorPlans] = useState<any[]>([]);

  // Navigation states
  const [viewMode, setViewMode] = useState<'building' | 'walkthrough'>(initialMode);
  const [activeFloor, setActiveFloor] = useState(3); // default floor
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const activeModelType = viewMode === 'building' ? 'exterior' : 'interior';
  const currentModelId = models.find((model) => model.modelType === activeModelType)?.id || '';
  const currentHotspots = useMemo(() => hotspots.filter((hotspot) => hotspot.modelId === currentModelId), [hotspots, currentModelId]);
  const currentTours = useMemo(() => tours.filter((tour) => tour.modelId === currentModelId), [tours, currentModelId]);

  useEffect(() => {
    if (!sdkKey) {
      setError('Missing SDK authorization key (key parameter).');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const controller = new AbortController();

    fetch(`${API_URL}/sdk/embeds/resolve?apiKey=${encodeURIComponent(sdkKey)}&projectId=${encodeURIComponent(projectId)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Invalid SDK Key, unauthorized domain, or incorrect project ID.');
        }
        return res.json();
      })
      .then((resData) => {
        if (controller.signal.aborted) return;
        setTenantId(resData.tenantId);

        // Map resolved data arrays
        const resolvedModels = resData.data.map((item: any) => item.model);
        setModels(resolvedModels);

        const resolvedHotspots = resData.data.flatMap((item: any) => item.hotspots);
        setHotspots(resolvedHotspots);

        const resolvedTours = resData.data.flatMap((item: any) => item.tours);
        setTours(resolvedTours);

        setFloorPlans(resData.floorPlans || []);

        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message || 'Failed to resolve digital twin context.');
        setLoading(false);
      });
    return () => controller.abort();
  }, [projectId, sdkKey]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#3A2E29]">
        <Icon icon="eos-icons:loading" className="text-3xl text-[#CAAD8E] animate-spin" />
        <p className="text-[10px] font-bold text-warm-stone uppercase tracking-widest mt-6">Initializing Spatial Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#3A2E29] text-warm-linen p-6 text-center border border-red-500/20">
        <Icon icon="solar:shield-warning-bold-duotone" className="text-4xl text-red-400 mb-3" />
        <h4 className="text-sm font-bold text-warm-cream uppercase tracking-wider">SDK Authorization Failure</h4>
        <p className="text-xs text-warm-stone mt-2 max-w-xs leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-[#3A2E29]">
      {/* Top Header Controls */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap gap-2 pointer-events-auto sm:top-6 sm:left-6 sm:right-6">
        <div className="bg-warm-brown/60 backdrop-blur-md px-4 py-2 rounded-full border border-warm-stone/25 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#CAAD8E]"></div>
          <span className="text-[9px] font-bold tracking-widest text-warm-cream uppercase">AETHER EMBED</span>
        </div>

        {viewMode === 'walkthrough' && activeRoom !== null && (
          <button
            onClick={() => setActiveRoom(null)}
            className="flex items-center gap-2 bg-warm-brown/75 hover:bg-warm-brown border border-warm-stone/25 px-4 py-2 rounded-full transition-colors text-[10px] text-warm-cream font-bold uppercase"
          >
            <Icon icon="solar:arrow-left-bold-duotone" className="text-[#CAAD8E]" />
            <span>Lobby</span>
          </button>
        )}

        {viewMode === 'walkthrough' && (
          <button
            onClick={() => { setViewMode('building'); setActiveRoom(null); }}
            className="flex items-center gap-2 bg-warm-brown/75 hover:bg-warm-brown border border-warm-stone/25 px-4 py-2 rounded-full transition-colors text-[10px] text-warm-cream font-bold uppercase"
          >
            <Icon icon="solar:close-circle-bold-duotone" className="text-red-400" />
            <span>Exterior View</span>
          </button>
        )}

        {viewMode === 'building' && (
          <button
            onClick={() => setViewMode('walkthrough')}
            className="flex items-center gap-2 bg-[#CAAD8E] hover:bg-[#CAAD8E]/85 text-[#3A2E29] px-4 py-2 rounded-full transition-colors text-[10px] font-bold uppercase shadow-lg shadow-[#CAAD8E]/20"
          >
            <Icon icon="solar:wallpaper-bold-duotone" className="text-sm" />
            <span>Enter Walkthrough</span>
          </button>
        )}
      </div>

      {/* Primary Canvas Viewport */}
      <BuildingViewer
        activeFloor={activeFloor}
        setActiveFloor={setActiveFloor}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        isEmbedded={true}
        initialModels={models}
        initialHotspots={currentHotspots}
        initialTours={currentTours}
        initialTenantId={tenantId}
        projectId={projectId}
        sdkKey={sdkKey || ''}
        layoutData={floorPlans[0]?.layoutData}
      />

      {/* Floating Instructions prompt */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-warm-brown/75 backdrop-blur-xl px-6 py-2.5 rounded-full border border-warm-stone/25 text-warm-cream/70 text-[9px] font-bold tracking-wider pointer-events-none z-10 text-center select-none uppercase">
        {viewMode === 'building' ? (
          "Drag to rotate twin • Scroll to zoom • Right-click drag to pan"
        ) : activeRoom ? (
          `Touring ${activeRoom} • Drag mouse to look around suite`
        ) : (
          "🚪 Click on any room door in the corridor to begin tour"
        )}
      </div>
    </div>
  );
}

export default function EmbedProjectPage({ params }: EmbedProjectPageProps) {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center h-screen bg-[#3A2E29]">
        <Icon icon="eos-icons:loading" className="text-3xl text-[#CAAD8E] animate-spin" />
        <p className="text-[10px] font-bold text-warm-stone uppercase tracking-widest mt-6">Loading Experience Frame...</p>
      </div>
    }>
      <EmbedContent projectId={params.id} />
    </Suspense>
  );
}
