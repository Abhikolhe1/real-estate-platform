'use client';

import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';
import PremiumButton from '@/components/premium-button';
import Link from 'next/link';
import { paths } from '@/routes/paths';

export default function UnitDetailPage({ params }: { params: { id: string } }) {
  const unitId = params.id || '4201';

  useEffect(() => {
    gsap.fromTo('.anim-unit',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  return (
    <div className="pt-24 min-h-screen">
      {/* Cinematic Hero Gallery */}
      <section className="relative h-[70vh] w-full overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=2000" 
          alt="Penthouse Interior" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <div className="absolute bottom-12 left-6 md:left-margin-desktop anim-unit">
          <Link href={paths.inventory} className="flex items-center gap-2 text-primary font-label-caps text-[10px] tracking-widest mb-4 hover:gap-4 transition-all">
            <Icon icon="solar:alt-arrow-left-bold-duotone" />
            BACK TO INVENTORY
          </Link>
          <span className="bg-primary/20 text-primary px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase">Premium Suite</span>
          <h1 className="font-display-xl text-5xl md:text-7xl font-light text-white mt-4">Unit #{unitId}</h1>
          <p className="text-white/60 font-body-md text-lg mt-2">Sky Penthouse • Obsidian Tower • West Wing</p>
        </div>
      </section>

      <div className="px-6 md:px-margin-desktop max-w-container-max mx-auto py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Column: Details */}
          <div className="lg:col-span-8 space-y-16">
            <div className="anim-unit">
              <h2 className="font-display-xl text-3xl font-light mb-6">Architectural Narrative</h2>
              <p className="text-on-surface-variant font-body-md text-base leading-relaxed">
                The Sky Penthouse {unitId} is a masterwork of vertical living. Featuring double-height ceilings and a 270-degree panoramic view of the Hyderabad skyline, this residence is designed for those who demand absolute privacy and unparalleled luxury.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 anim-unit">
              <SpecItem icon="solar:maximize-bold-duotone" label="Carpet Area" value="4,850 Sq.Ft." />
              <Icon icon="solar:bedside-table-2-bold-duotone" className="hidden" /> {/* pre-load check */}
              <SpecItem icon="solar:bedside-table-bold-duotone" label="Bedrooms" value="4 Master" />
              <SpecItem icon="solar:bath-bold-duotone" label="Bathrooms" value="5 Ensuite" />
              <SpecItem icon="solar:clapperboard-edit-bold-duotone" label="View" value="Cityscape" />
            </div>

            <div className="anim-unit">
              <h2 className="font-display-xl text-3xl font-light mb-8">Technical Specifications</h2>
              <div className="space-y-4">
                <TechRow label="Flooring" value="Italian Statuario Marble in Living, Engineered Oak in Bedrooms" />
                <TechRow label="Home Automation" value="Control4 Integrated Lighting, Climate & Security" />
                <TechRow label="Kitchen" value="Poggenpohl Cabinetry with Miele Appliances" />
                <TechRow label="Glazing" value="Triple-glazed Low-E Schüco Windows" />
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Booking Card */}
          <div className="lg:col-span-4 anim-unit">
            <div className="glass-panel p-8 rounded-3xl border border-primary/20 sticky top-32 shadow-2xl overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl rounded-full"></div>
              
              <div className="mb-8">
                <span className="font-label-caps text-[10px] text-on-surface-variant tracking-widest uppercase block mb-2">Investment Value</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-primary font-display-xl text-4xl font-bold">$1,850,000</span>
                  <span className="text-on-surface-variant text-xs font-body-md">All-inclusive</span>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                  <Icon icon="solar:check-circle-bold-duotone" className="text-primary" />
                  <span>Immediate Possession available</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                  <Icon icon="solar:check-circle-bold-duotone" className="text-primary" />
                  <span>Customizable Interior Finishes</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                  <Icon icon="solar:check-circle-bold-duotone" className="text-primary" />
                  <span>3 Reserved Basement Parking</span>
                </div>
              </div>

              <Link href={paths.contact}>
                <PremiumButton variant="primary" className="w-full py-5 tracking-widest text-xs uppercase font-bold shadow-xl shadow-primary/20">
                  RESERVE UNIT NOW
                </PremiumButton>
              </Link>
              
              <button className="w-full mt-4 py-4 border border-white/10 text-on-surface font-label-caps text-[10px] tracking-widest rounded-xl hover:bg-white/5 transition-all">
                DOWNLOAD BROCHURE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="p-6 bg-surface-container/50 rounded-2xl border border-white/5 group hover:border-primary/30 transition-all duration-500">
      <Icon icon={icon} className="text-3xl text-primary mb-4 group-hover:scale-110 transition-transform" />
      <p className="font-label-caps text-[9px] text-on-surface-variant tracking-widest uppercase mb-1">{label}</p>
      <p className="font-headline-md text-lg text-on-surface font-light">{value}</p>
    </div>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between py-4 border-b border-white/5 gap-2">
      <span className="font-label-caps text-[11px] text-on-surface/40 tracking-widest uppercase">{label}</span>
      <span className="font-body-md text-sm text-on-surface">{value}</span>
    </div>
  );
}
