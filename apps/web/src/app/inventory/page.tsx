'use client';

import React, { useState, useEffect, useRef } from 'react';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

export default function InventoryPage() {
  const [activeTower, setActiveTower] = useState('Obsidian Tower');
  const [flatFilter, setFlatFilter] = useState('All');
  const [flatSelection, setFlatSelection] = useState<any>({
    number: '4201',
    type: '4 BHK Grand Penthouse',
    size: '4,850 sqft',
    price: '$1,850,000',
    status: 'Available'
  });

  const listRef = useRef<HTMLDivElement>(null);

  const towers = [
    { name: 'Obsidian Tower', description: 'Premium 3 & 4 BHK residences with skyline views.', status: '85% Sold' },
    { name: 'Aurum Penthouse Suites', description: 'Limited-edition bespoke double-height penthouses.', status: 'Limited' },
    { name: 'Aether Residences', description: 'Intelligent automation-first residences with wrap decks.', status: 'New Launch' }
  ];

  const inventory: Record<string, Array<{ number: string; type: string; size: string; price: string; status: 'Available' | 'Reserved' | 'Sold' }>> = {
    'Obsidian Tower': [
      { number: '4201', type: '4 BHK Grand Penthouse', size: '4,850 sqft', price: '$1,850,000', status: 'Available' },
      { number: '3802', type: '3 BHK Ultra Suite', size: '2,900 sqft', price: '$980,000', status: 'Reserved' },
      { number: '3501', type: '3 BHK Premier Room', size: '2,450 sqft', price: '$820,000', status: 'Available' },
      { number: '3002', type: '3 BHK Premier Room', size: '2,450 sqft', price: '$815,000', status: 'Sold' },
    ],
    'Aurum Penthouse Suites': [
      { number: 'PH-1', type: '5 BHK Duplex Penthouse', size: '6,200 sqft', price: '$3,200,000', status: 'Available' },
      { number: 'PH-2', type: '4 BHK Sky Mansion', size: '5,100 sqft', price: '$2,450,000', status: 'Reserved' },
    ],
    'Aether Residences': [
      { number: '2401', type: '3 BHK Smart Living', size: '2,200 sqft', price: '$780,000', status: 'Available' },
      { number: '2002', type: '3 BHK Smart Living', size: '2,200 sqft', price: '$775,000', status: 'Available' },
      { number: '1801', type: '2 BHK Smart Living', size: '1,650 sqft', price: '$590,000', status: 'Sold' },
    ]
  };

  useEffect(() => {
    gsap.fromTo('.anim-inv',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    if (listRef.current) {
      gsap.fromTo(listRef.current.children,
        { opacity: 0, scale: 0.98, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [activeTower, flatFilter]);

  const rawUnits = inventory[activeTower] || [];
  const filteredUnits = flatFilter === 'All'
    ? rawUnits
    : rawUnits.filter(u => u.type.toLowerCase().includes(flatFilter.toLowerCase()));

  return (
    <div className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
      <header className="mb-16 text-center max-w-2xl mx-auto">
        <span className="font-label-caps text-primary tracking-[0.3em] uppercase text-[10px] block mb-3">AVAILABILITY PLATFORM</span>
        <h1 className="font-display-xl text-4xl md:text-headline-lg font-light text-on-surface">Dynamic Inventory</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-4 leading-relaxed">
          Navigate through our diverse portfolio of luxury residences. Filter by configuration and explore real-time availability.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left Side: Tower Tabs & Filters */}
        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-4">
            <h3 className="font-label-caps text-xs text-on-surface-variant tracking-widest uppercase">SELECT PROJECT TOWER</h3>
            <div className="space-y-3">
              {towers.map((t) => (
                <div
                  key={t.name}
                  onClick={() => {
                    setActiveTower(t.name);
                    const units = inventory[t.name];
                    if (units && units.length > 0) setFlatSelection(units[0]);
                  }}
                  className={`p-5 border rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden ${
                    activeTower === t.name
                      ? 'bg-surface-container border-primary shadow-xl'
                      : 'bg-surface/20 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`font-headline-md text-lg ${activeTower === t.name ? 'text-primary' : 'text-on-surface'}`}>{t.name}</h4>
                      <p className="text-[10px] text-on-surface-variant mt-1 font-body-md line-clamp-1">{t.description}</p>
                    </div>
                    <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded ${activeTower === t.name ? 'bg-primary/20 text-primary' : 'bg-white/5 text-on-surface/40'}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-label-caps text-xs text-on-surface-variant tracking-widest uppercase">UNIT CONFIGURATION</h3>
            <div className="flex flex-wrap gap-2">
              {['All', 'Penthouse', 'Suite', 'Premier', 'Smart'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFlatFilter(filter)}
                  className={`px-4 py-2 text-[10px] font-label-caps tracking-widest border transition-all duration-300 rounded ${
                    flatFilter === filter
                      ? 'bg-primary text-on-primary border-primary font-bold shadow-lg shadow-primary/20'
                      : 'bg-white/5 border-white/10 text-on-surface hover:border-primary/50'
                  }`}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {flatSelection && (
            <div className="glass-panel p-6 border-primary/20 rounded-2xl mt-8 animate-[fadeInUp_0.5s_ease] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
              <h4 className="font-label-caps text-xs text-primary mb-6 tracking-widest uppercase font-bold">UNIT DETAILS: {flatSelection.number}</h4>
              <div className="space-y-4 text-sm font-body-md">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-on-surface-variant">Configuration</span>
                  <span className="text-on-surface font-semibold">{flatSelection.type}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-on-surface-variant">Carpet Area</span>
                  <span className="text-on-surface font-semibold">{flatSelection.size}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-on-surface-variant">Approx. Value</span>
                  <span className="text-primary font-bold">{flatSelection.price}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-on-surface-variant">Current Status</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                    flatSelection.status === 'Available' ? 'bg-green-500/15 text-green-400' : flatSelection.status === 'Reserved' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
                  }`}>{flatSelection.status}</span>
                </div>
              </div>

              {flatSelection.status === 'Available' && (
                <PremiumButton variant="primary" className="w-full mt-8 py-4 tracking-widest text-[10px] rounded-lg shadow-lg shadow-primary/20 uppercase font-bold">
                  RESERVE THIS UNIT
                </PremiumButton>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Units Grid */}
        <div className="lg:col-span-8 bg-surface-container/20 border border-white/5 backdrop-blur-xl p-8 rounded-2xl min-h-[600px]">
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
            <h3 className="font-label-caps text-xs text-on-surface-variant tracking-widest uppercase">AVAILABLE MATRICES</h3>
            <span className="text-[10px] text-on-surface/40 font-body-md">{filteredUnits.length} Units Found</span>
          </div>

          <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((unit) => (
                <div
                  key={unit.number}
                  onClick={() => setFlatSelection(unit)}
                  className={`p-6 rounded-xl border bg-surface/10 hover:bg-surface/30 transition-all duration-500 cursor-pointer group ${
                    flatSelection?.number === unit.number
                      ? 'border-primary shadow-2xl shadow-primary/10 bg-surface/40'
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-display-xl text-2xl text-on-surface group-hover:text-primary transition-colors">#{unit.number}</h4>
                    <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded tracking-widest ${
                      unit.status === 'Available' ? 'bg-green-500/10 text-green-400' : unit.status === 'Reserved' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>{unit.status}</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-on-surface font-semibold">{unit.type}</p>
                    <p className="text-[10px] text-on-surface-variant font-body-md">{unit.size}</p>
                  </div>

                  <div className="flex justify-between items-end mt-8 border-t border-white/5 pt-4">
                    <span className="text-[9px] text-on-surface/40 font-label-caps uppercase tracking-widest">Pricing From</span>
                    <span className="text-primary font-bold text-xl font-display-xl">{unit.price}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-32">
                <Icon icon="solar:box-minimalistic-bold-duotone" className="text-6xl text-white/5 mx-auto mb-4" />
                <p className="text-on-surface-variant text-sm font-body-md uppercase tracking-[0.2em]">No matching units found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
