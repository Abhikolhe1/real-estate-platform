'use client';

import React, { useState, useEffect } from 'react';
import PremiumButton from '@/components/premium-button';
import { gsap } from 'gsap';

export default function HomeView() {
  const [activeTower, setActiveTower] = useState('Tower A');
  const [flatSelection, setFlatSelection] = useState<any>(null);

  const towers = ['Tower A', 'Tower B', 'Tower C'];
  const flats = [
    { number: '101', type: '3 BHK', size: '1,840 sqft', price: '$240,000', status: 'Available' },
    { number: '102', type: '2 BHK', size: '1,250 sqft', price: '$180,000', status: 'Sold' },
    { number: '201', type: '4 BHK Penthouse', size: '3,200 sqft', price: '$450,000', status: 'Available' },
    { number: '202', type: '3 BHK', size: '1,840 sqft', price: '$242,000', status: 'Reserved' },
  ];

  useEffect(() => {
    gsap.fromTo('.anim-fade-up', 
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    );
  }, []);

  return (
    <div className="pt-20">
      {/* Hero section */}
      <section className="h-[90vh] flex flex-col justify-center items-center text-center px-6 relative bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0%,rgba(3,7,18,0)_60%)]">
        <span className="px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-bold uppercase tracking-wider mb-6 anim-fade-up">Now Launching: Marina Heights</span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-[1000px] leading-[1.1] bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent anim-fade-up">
          Immerse Yourself in Your Future Premium Living Space
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-[680px] mt-6 leading-relaxed anim-fade-up">
          Explore residential towers, review dynamic floor plans, and experience virtual walkthroughs powered by our real-time interactive engine.
        </p>

        <div className="mt-10 flex gap-4 anim-fade-up">
          <PremiumButton variant="primary">Start Walkthrough</PremiumButton>
          <PremiumButton variant="outline">Explore Inventory</PremiumButton>
        </div>
      </section>

      {/* Building explorer section */}
      <section className="py-24 px-12 md:px-20 bg-gray-950/50 border-t border-white/5">
        <div className="text-center mb-16 anim-fade-up">
          <h2 className="text-3xl md:text-4xl font-extrabold">Explore Building Configurations</h2>
          <p className="text-gray-400 text-sm mt-3">Select towers and review available flats dynamically in real-time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start anim-fade-up">
          {/* Tower Selector (Left) */}
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-xl p-8 rounded-2xl">
            <h3 className="text-lg font-bold mb-6">Choose Tower</h3>
            <div className="flex flex-col gap-3">
              {towers.map((tower) => (
                <button
                  key={tower}
                  onClick={() => setActiveTower(tower)}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-left border transition-all duration-300 ${
                    activeTower === tower
                      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.05]'
                  }`}
                >
                  🏢 {tower}
                </button>
              ))}
            </div>

            {flatSelection && (
              <div className="mt-8 pt-6 border-t border-white/5">
                <h4 className="text-purple-300 font-bold">Flat #{flatSelection.number} Details</h4>
                <div className="flex flex-col gap-2 mt-4 text-sm">
                  <p className="text-gray-400">Type: <span className="text-white font-semibold">{flatSelection.type}</span></p>
                  <p className="text-gray-400">Size: <span className="text-white font-semibold">{flatSelection.size}</span></p>
                  <p className="text-gray-400">Pricing: <span className="text-white font-semibold">{flatSelection.price}</span></p>
                  <p className="text-gray-400">Status: <span className={`font-bold ${flatSelection.status === 'Available' ? 'text-green-400' : 'text-red-400'}`}>{flatSelection.status}</span></p>
                </div>
                {flatSelection.status === 'Available' && (
                  <PremiumButton variant="primary" className="w-full mt-6 py-2 text-xs">Reserve Unit</PremiumButton>
                )}
              </div>
            )}
          </div>

          {/* Flats Grid (Right) */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 backdrop-blur-xl p-8 rounded-2xl">
            <h3 className="text-lg font-bold mb-6">Active Inventory for {activeTower}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flats.map((flat) => (
                <div
                  key={flat.number}
                  onClick={() => setFlatSelection(flat)}
                  className={`p-6 rounded-xl border bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 cursor-pointer ${
                    flatSelection?.number === flat.number
                      ? 'border-purple-500 shadow-md shadow-purple-500/10'
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Flat {flat.number}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      flat.status === 'Available' ? 'bg-green-500/10 text-green-400' : flat.status === 'Reserved' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>{flat.status}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-3">{flat.type} • {flat.size}</p>
                  <p className="text-purple-400 font-bold text-lg mt-2">{flat.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
