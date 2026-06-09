'use client';

import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

export default function LocationPage() {
  const [activeCategory, setActiveCategory] = useState('Connectivity');

  const categories = ['Connectivity', 'Education', 'Healthcare', 'Leisure'];

  const landmarkData: Record<string, Array<{ name: string; time: string; dist: string }>> = {
    'Connectivity': [
      { name: 'Financial District', time: '8 Mins', dist: '3.4 Kms' },
      { name: 'Gachibowli Junction', time: '10 Mins', dist: '4.5 Kms' },
      { name: 'Rajiv Gandhi Intl Airport', time: '25 Mins', dist: '28.6 Kms' },
    ],
    'Education': [
      { name: 'Oakridge International School', time: '5 Mins', dist: '1.8 Kms' },
      { name: 'ISB Hyderabad', time: '12 Mins', dist: '5.5 Kms' },
      { name: 'Delhi Public School', time: '8 Mins', dist: '3.2 Kms' },
    ],
    'Healthcare': [
      { name: 'AIG Hospitals', time: '12 Mins', dist: '5.2 Kms' },
      { name: 'Continental Hospitals', time: '10 Mins', dist: '4.8 Kms' },
      { name: 'Care Hospitals', time: '15 Mins', dist: '7.1 Kms' },
    ],
    'Leisure': [
      { name: 'IKEA Hyderabad', time: '18 Mins', dist: '8.4 Kms' },
      { name: 'Inorbit Mall', time: '20 Mins', dist: '9.2 Kms' },
      { name: 'Botanical Garden', time: '14 Mins', dist: '6.5 Kms' },
    ]
  };

  useEffect(() => {
    gsap.fromTo('.anim-loc',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, [activeCategory]);

  return (
    <div className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
      <header className="mb-16 text-center max-w-2xl mx-auto">
        <span className="font-label-caps text-primary tracking-[0.3em] uppercase text-[10px] block mb-3">GEOGRAPHIC EPICENTRE</span>
        <h1 className="font-display-xl text-4xl md:text-headline-lg font-light text-on-surface">Location & Neighborhood</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-4 leading-relaxed">
          Strategically located at the convergence of luxury and utility, ensuring you are always minutes away from what matters most.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Left column: Proximity details */}
        <div className="lg:col-span-5 space-y-8">
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-[10px] font-label-caps tracking-widest border transition-all duration-300 rounded ${
                  activeCategory === cat
                    ? 'bg-primary text-on-primary border-primary font-bold'
                    : 'bg-white/5 border-white/10 text-on-surface hover:border-primary/50'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {landmarkData[activeCategory].map((mark, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-4 hover:border-primary/50 transition-colors duration-300 anim-loc group">       
                <div>
                  <h4 className="font-body-md font-bold text-on-surface group-hover:text-primary transition-colors">{mark.name}</h4>
                  <p className="text-xs text-on-surface-variant mt-1 font-body-md">Distance: {mark.dist}</p>
                </div>
                <div className="text-right">
                  <span className="text-primary font-bold font-display-xl text-lg block">{mark.time}</span>
                  <span className="text-[10px] text-on-surface/40 font-label-caps uppercase tracking-wider">Drive Time</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 glass-panel border border-primary/20 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Icon icon="solar:star-bold-duotone" width="48" />
            </div>
            <h4 className="font-label-caps text-xs text-primary mb-3 tracking-widest font-bold">WHY THIS LOCATION?</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed font-body-md">
              Manikonda-Khajaguda hills are the new standard for luxury living in Hyderabad, offering elevated topography and pristine air quality while remaining adjacent to the Financial District.
            </p>
          </div>
        </div>

        {/* Right column: Interactive dark placeholder map */}
        <div className="lg:col-span-7 h-[600px] relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl glass-panel">
          <div className="absolute inset-0 bg-[#0f1115]">
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#1e2229 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-20 bg-primary/10 blur-[100px] rounded-full"></div>
                <div className="relative z-10 w-4 h-4 bg-primary rounded-full animate-ping"></div>
                <div className="relative z-10 w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)]"></div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-10 left-10 right-10 bg-surface/80 backdrop-blur-xl p-8 border border-white/10 rounded-2xl z-10 shadow-2xl">
            <div className="flex items-start gap-6">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Icon icon="solar:map-point-bold-duotone" className="text-4xl text-primary" />
              </div>
              <div>
                <h3 className="font-display-xl text-2xl font-light text-white mb-2">Aethelgard Site Office</h3>
                <p className="text-xs text-white/60 font-body-md max-w-sm leading-relaxed mb-6">
                  Khajaguda Hills Road, Near Financial District, Manikonda, Hyderabad, Telangana 500089.
                </p>
                <div className="flex gap-4">
                  <button className="px-8 py-3 bg-primary text-on-primary font-label-caps text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all duration-300 rounded-lg font-bold shadow-lg shadow-primary/20">
                    GET DIRECTIONS
                  </button>
                  <button className="px-8 py-3 border border-white/20 text-white font-label-caps text-[10px] tracking-widest hover:bg-white/5 transition-all duration-300 rounded-lg">
                    STREET VIEW
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
