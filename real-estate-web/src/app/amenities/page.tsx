'use client';

import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

export default function AmenitiesPage() {
  const indoorAmenities = [
    {
      icon: 'solar:dumbbell-bold-duotone',
      title: 'Somatic Wellness Gym',
      location: 'Level 41 East',
      desc: 'Technogym-integrated fitness studio equipped with custom biometric trackers and cold plunge setups.'
    },
    {
      icon: 'solar:wineglass-triangle-bold-duotone',
      title: 'Bespoke Cigar Lounge',
      location: 'Penthouse Club Lobby',
      desc: 'Rich walnut humidor arrays, plush leather seating, and custom ambient air filtration units.'
    },
    {
      icon: 'solar:videocamera-record-bold-duotone',
      title: 'Private Cinema Hall',
      location: 'Level 2',
      desc: '4K Dolby Atmos projection system with acoustic treatment and plush motorized recliners.'
    },
    {
      icon: 'solar:bath-bold-duotone',
      title: 'Aethelgard Spa & Sauna',
      location: 'Level 40',
      desc: 'Therapeutic massage rooms, steam chambers, and a Himalayan salt therapy room.'
    }
  ];

  const outdoorAmenities = [
    {
      icon: 'solar:swimming-bold-duotone',
      title: 'Infinity Oasis Pool',
      location: 'Level 42 Club',
      desc: 'A crystalline infinity pool flowing over basalt stone boundaries, reflecting sunset twilight skylines.'
    },
    {
      icon: 'solar:leaf-bold-duotone',
      title: 'Sky Garden Retreat',
      location: 'Multiple Levels',
      desc: 'High-altitude botanical gardens with meditation pods and panoramic city views.'
    },
    {
      icon: 'solar:course-up-bold-duotone',
      title: 'Rooftop Tennis Court',
      location: 'Top Floor',
      desc: 'Professional grade court with high-visibility lighting and wind-shielding glass walls.'
    },
    {
      icon: 'solar:user-speak-bold-duotone',
      title: 'Adventure Play Zone',
      location: 'Ground Floor Park',
      desc: 'Safe, rubberized flooring with creative play structures for children of all ages.'
    }
  ];

  useEffect(() => {
    gsap.fromTo('.anim-item',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );
  }, []);

  return (
    <div className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
      <header className="mb-20 text-center max-w-2xl mx-auto anim-item">
        <span className="font-label-caps text-primary tracking-[0.3em] uppercase text-[10px] block mb-3 font-bold">BESPOKE LIFE</span>
        <h1 className="font-display-xl text-4xl md:text-headline-lg font-light text-on-surface">Luxury Lifestyle & Amenities</h1>
        <p className="text-on-surface-variant font-body-md text-sm mt-4 leading-relaxed">
          Inspired by the philosophy of Quambiant, we offer over 80+ refined amenities designed for the modern connoisseur.
        </p>
      </header>

      <section className="mb-24">
        <div className="flex items-center gap-4 mb-12 anim-item">
          <h2 className="font-display-xl text-3xl font-light text-primary">Indoor Indulgences</h2>
          <div className="h-[1px] flex-1 bg-white/10"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {indoorAmenities.map((item, idx) => (
            <AmenityCard key={idx} item={item} />
          ))}
        </div>
      </section>

      <section className="mb-24">
        <div className="flex items-center gap-4 mb-12 anim-item">
          <h2 className="font-display-xl text-3xl font-light text-primary">Outdoor Immersions</h2>
          <div className="h-[1px] flex-1 bg-white/10"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {outdoorAmenities.map((item, idx) => (
            <AmenityCard key={idx} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AmenityCard({ item }: { item: any }) {
  return (
    <div className="glass-panel p-8 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-primary/30 transition-all duration-500 group anim-item min-h-[220px] relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <Icon icon={item.icon} className="text-4xl text-primary shrink-0 transition-transform duration-500 group-hover:scale-110" />
          <span className="font-label-caps text-[10px] text-on-surface-variant tracking-wider uppercase font-bold">{item.location}</span>
        </div>
        <h3 className="font-headline-md text-2xl text-on-surface mb-2 font-light group-hover:text-primary transition-colors">{item.title}</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed font-body-md">{item.desc}</p>
      </div>

      <div className="h-[1px] w-full bg-white/10 mt-6 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-primary w-0 group-hover:w-full transition-all duration-700"></div>
      </div>
    </div>
  );
}
