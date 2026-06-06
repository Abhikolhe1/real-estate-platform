'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BuildingViewer from '@/components/building-viewer';
import { Icon } from '@iconify/react';

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

  // Navigation states
  const [viewMode, setViewMode] = useState<'building' | 'walkthrough'>(initialMode);
  const [activeFloor, setActiveFloor] = useState(3); // default floor
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  useEffect(() => {
    if (!sdkKey) {
      setError('Missing SDK authorization key (key parameter).');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`http://localhost:3001/sdk/embeds/resolve?apiKey=${sdkKey}&projectId=${projectId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Invalid SDK Key, unauthorized domain, or incorrect project ID.');
        }
        return res.json();
      })
      .then((resData) => {
        setTenantId(resData.tenantId);
        
        // Map resolved data arrays
        const resolvedModels = resData.data.map((item: any) => item.model);
        setModels(resolvedModels);

        const resolvedHotspots = resData.data.flatMap((item: any) => item.hotspots);
        setHotspots(resolvedHotspots);

        const resolvedTours = resData.data.flatMap((item: any) => item.tours);
        setTours(resolvedTours);

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Failed to resolve digital twin context.');
        setLoading(false);
      });
  }, [projectId, sdkKey]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0c0f16]">
        <Icon icon="eos-icons:loading" className="text-3xl text-[#00f5d4] animate-spin" />
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-6">Initializing Spatial Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#0c0f16] text-stone-200 p-6 text-center border border-red-500/20">
        <Icon icon="solar:shield-warning-bold-duotone" className="text-4xl text-red-400 mb-3" />
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">SDK Authorization Failure</h4>
        <p className="text-xs text-stone-400 mt-2 max-w-xs leading-relaxed">{error}</p>
      </div>
    );
  }

  // Filter spots and tours matching the current view mode model type
  const activeModelType = viewMode === 'building' ? 'exterior' : 'interior';
  const currentModel = models.find((m) => m.modelType === activeModelType);
  const currentModelId = currentModel?.id || '';

  const currentHotspots = hotspots.filter((h) => h.modelId === currentModelId);
  const currentTours = tours.filter((t) => t.modelId === currentModelId);

  return (
    <div className="relative w-screen h-screen bg-[#0c0f16]">
      {/* Top Header Controls */}
      <div className="absolute top-6 left-6 z-20 flex gap-2 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00f5d4] animate-pulse"></div>
          <span className="text-[9px] font-bold tracking-widest text-white uppercase">AETHER EMBED</span>
        </div>
        
        {viewMode === 'walkthrough' && activeRoom !== null && (
          <button
            onClick={() => setActiveRoom(null)}
            className="flex items-center gap-2 bg-black/75 hover:bg-black border border-white/10 px-4 py-2 rounded-full transition-all text-[10px] text-white font-bold uppercase"
          >
            <Icon icon="solar:arrow-left-bold-duotone" className="text-[#00f5d4]" />
            <span>Lobby</span>
          </button>
        )}

        {viewMode === 'walkthrough' && (
          <button
            onClick={() => { setViewMode('building'); setActiveRoom(null); }}
            className="flex items-center gap-2 bg-black/75 hover:bg-black border border-white/10 px-4 py-2 rounded-full transition-all text-[10px] text-white font-bold uppercase"
          >
            <Icon icon="solar:close-circle-bold-duotone" className="text-red-400" />
            <span>Exterior View</span>
          </button>
        )}

        {viewMode === 'building' && (
          <button
            onClick={() => setViewMode('walkthrough')}
            className="flex items-center gap-2 bg-[#00f5d4] hover:bg-[#00f5d4]/85 text-[#0c0f16] px-4 py-2 rounded-full transition-all text-[10px] font-bold uppercase shadow-lg shadow-[#00f5d4]/20"
          >
            <Icon icon="solar:wallpaper-bold-duotone" className="text-sm" />
            <span>Enter Walkthrough</span>
          </button>
        )}
      </div>

      {/* Primary Canvas Viewport */}
      <BuildingViewer
        activeFloor={activeFloor}
        viewMode={viewMode}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        isEmbedded={true}
        initialModels={models}
        initialHotspots={currentHotspots}
        initialTours={currentTours}
        initialTenantId={tenantId}
        projectId={projectId}
        sdkKey={sdkKey || ''}
      />

      {/* Floating Instructions prompt */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/10 text-white/70 text-[9px] font-bold tracking-wider pointer-events-none z-10 text-center select-none uppercase">
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
      <div className="flex flex-col justify-center items-center h-screen bg-[#0c0f16]">
        <Icon icon="eos-icons:loading" className="text-3xl text-[#00f5d4] animate-spin" />
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-6">Loading Experience Frame...</p>
      </div>
    }>
      <EmbedContent projectId={params.id} />
    </Suspense>
  );
}
