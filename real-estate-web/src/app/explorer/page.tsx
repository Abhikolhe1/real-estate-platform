'use client';

import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { paths } from '@/routes/paths';
import PremiumButton from '@/components/premium-button';
import BuildingViewer from '@/components/building-viewer';

export default function ExplorerPage() {
  const [activeFloor, setActiveFloor] = useState(9);
  const [viewMode, setViewMode] = useState<'building' | 'walkthrough'>('building');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isRotating, setIsNight] = useState(true);

  useEffect(() => {
    gsap.fromTo('.anim-explorer',
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 1.5, ease: 'expo.out' }
    );
  }, []);

  return (
    <div className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
      <header className="mb-12 text-center max-w-2xl mx-auto anim-explorer">
        <span className="font-label-caps text-primary tracking-[0.3em] uppercase text-[10px] block mb-3 font-bold">SPATIAL NAVIGATOR</span>
        <h1 className="font-display-xl text-4xl md:text-5xl font-light text-on-surface">3D Building Explorer</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-4 leading-relaxed">
          Interact with the architectural digital twin of Aethelgard. Select floors to view real-time availability and spatial compositions.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Floor Controls */}
        <div className="lg:col-span-2 flex flex-col gap-2 h-[600px] overflow-y-auto pr-4 scrollbar-hide anim-explorer">
          <h3 className="font-label-caps text-[10px] text-on-surface/40 mb-4 sticky top-0 bg-background py-2">SELECT FLOOR</h3>
          {[...Array(10)].map((_, i) => {
            const floor = 9 - i;
            return (
              <button
                key={floor}
                onClick={() => setActiveFloor(floor)}
                className={`py-3 px-4 rounded-lg border transition-all duration-300 font-display-xl text-sm ${
                  activeFloor === floor
                    ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20 scale-105 z-10'
                    : 'bg-surface/20 border-white/5 text-on-surface/60 hover:border-white/20'
                }`}
              >
                {floor === 0 ? 'G (Lobby)' : floor.toString().padStart(2, '0')}
              </button>
            );
          })}
        </div>

        {/* 3D Viewport */}
        <div className="lg:col-span-7 relative bg-surface-container/20 rounded-3xl border border-white/5 overflow-hidden anim-explorer group shadow-2xl">
          <BuildingViewer 
            activeFloor={activeFloor} 
            setActiveFloor={setActiveFloor}
            viewMode={viewMode} 
            setViewMode={setViewMode}
            activeRoom={activeRoom} 
            setActiveRoom={setActiveRoom} 
          />

          {/* Viewport UI - Top Left Status */}
          <div className="absolute top-6 left-6 flex gap-4 pointer-events-none z-10">
             <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${viewMode === 'building' ? 'bg-green-500' : 'bg-[#00f5d4]'}`}></div>
                <span className="text-[10px] font-label-caps tracking-widest font-bold text-white">
                  {viewMode === 'building' ? 'INTERACTIVE 3D TWIN' : activeRoom ? `${activeRoom.toUpperCase()} TOUR` : 'LOBBY CORRIDOR'}
                </span>
             </div>
          </div>

          {/* Viewport UI - Top Right Actions */}
          {viewMode === 'walkthrough' && (
            <div className="absolute top-6 right-6 flex gap-2 z-10">
              {activeRoom !== null && (
                <button
                  onClick={() => setActiveRoom(null)}
                  className="flex items-center gap-2 bg-black/75 hover:bg-black border border-white/10 px-4 py-2 rounded-full transition-all text-xs text-white"
                >
                  <Icon icon="solar:arrow-left-bold-duotone" className="text-[#00f5d4]" />
                  <span>Lobby</span>
                </button>
              )}
              <button
                onClick={() => { setViewMode('building'); setActiveRoom(null); }}
                className="flex items-center gap-2 bg-black/75 hover:bg-black border border-white/10 px-4 py-2 rounded-full transition-all text-xs text-white"
              >
                <Icon icon="solar:close-circle-bold-duotone" className="text-red-400" />
                <span>Exit Tour</span>
              </button>
            </div>
          )}

          {/* Bottom Prompt Helper */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-black/75 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-white/70 text-[9px] font-label-caps tracking-wider pointer-events-none z-10 text-center">
             {viewMode === 'building' ? (
               "Drag to rotate • Scroll to zoom • Right-click drag to pan"
             ) : activeRoom ? (
               `Touring ${activeRoom} • Drag to look around room`
             ) : (
               "🚪 Click on a colored flat door to enter and begin room tour"
             )}
          </div>
        </div>

        {/* Floor Details Panel */}
        <div className="lg:col-span-3 space-y-6 anim-explorer">
           <div className="glass-panel p-8 rounded-3xl border border-primary/20 shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 blur-2xl rounded-full"></div>
              <span className="font-label-caps text-[10px] text-primary tracking-widest uppercase font-bold block mb-4">
                {activeFloor === 0 ? 'GROUND LOBBY' : `FLOOR ${activeFloor.toString().padStart(2, '0')}`} ANALYTICS
              </span>
              
              <div className="space-y-6">
                <StatRow label="Total Units" value={activeFloor === 0 ? "01" : "03"} />
                <StatRow 
                  label="Available" 
                  value={activeFloor === 0 ? "00" : `0${(activeFloor % 3) + 1}`} 
                  color={activeFloor === 0 ? "text-red-400" : "text-green-400"} 
                />
                <StatRow label="Unit Types" value={activeFloor === 0 ? "Grand Reception" : "3 BHK Suites"} />
                <StatRow label="Avg. Height" value={`${(activeFloor * 3.3).toFixed(1)}m AGL`} />
              </div>

              <div className="mt-10 pt-10 border-t border-white/5 space-y-4">
                 {viewMode === 'building' ? (
                   <button
                     onClick={() => setViewMode('walkthrough')}
                     className="w-full py-4 tracking-widest text-[9px] uppercase font-bold bg-[#00f5d4] hover:bg-[#00f5d4]/85 text-[#0c0f16] border border-[#00f5d4] rounded-xl shadow-lg shadow-[#00f5d4]/20 transition-all flex items-center justify-center gap-2"
                   >
                     <Icon icon="solar:wallpaper-bold-duotone" className="text-sm" />
                     GO INSIDE FLAT TOUR
                   </button>
                 ) : (
                   <button
                     onClick={() => { setViewMode('building'); setActiveRoom(null); }}
                     className="w-full py-4 tracking-widest text-[9px] uppercase font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl transition-all flex items-center justify-center gap-2"
                   >
                     <Icon icon="solar:home-2-bold-duotone" className="text-sm text-[#00f5d4]" />
                     EXIT TO EXTERIOR
                   </button>
                 )}
                 <Link href={paths.inventory} className="block">
                    <PremiumButton variant="secondary" className="w-full py-4 tracking-widest text-[10px] uppercase font-bold">
                       VIEW FLOOR PLAN
                    </PremiumButton>
                 </Link>
              </div>
           </div>

           <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h4 className="font-label-caps text-[9px] text-on-surface/40 tracking-widest uppercase mb-4">ENVIRONMENTAL DATA</h4>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <Icon icon="solar:cloud-sun-bold-duotone" className="text-xl text-primary" />
                    <span className="text-xs font-body-md text-on-surface">28°C Clear</span>
                 </div>
                 <span className="text-[10px] text-on-surface-variant">Wind: 12km/h NW</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color = "text-on-surface" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
       <span className="text-xs font-body-md text-on-surface-variant">{label}</span>
       <span className={`font-display-xl text-lg font-bold ${color}`}>{value}</span>
    </div>
  );
}
