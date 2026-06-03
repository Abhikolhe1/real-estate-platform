'use client';

import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@iconify/react';

export default function AboutPage() {
  useEffect(() => {
    gsap.fromTo('.anim-about',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: 'power3.out' }
    );
  }, []);

  return (
    <div className="pt-24 px-6 md:px-margin-desktop max-w-container-max mx-auto py-20 min-h-screen">
      {/* Hero Section */}
      <header className="mb-24 text-center max-w-3xl mx-auto anim-about">
        <span className="font-label-caps text-primary tracking-[0.3em] uppercase text-[10px] block mb-3 font-bold">OUR LEGACY</span>
        <h1 className="font-display-xl text-5xl md:text-7xl font-light text-on-surface leading-tight">Architecting the Future of Living</h1>
        <p className="text-on-surface-variant font-body-md text-lg mt-8 leading-relaxed">
          Aethelgard is not just a developer; we are a vision-driven collective dedicated to creating timeless monuments of luxury and sustainability.
        </p>
      </header>

      {/* Philosophy Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-center mb-32">
        <div className="relative aspect-square rounded-2xl overflow-hidden anim-about">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000" 
            alt="Architecture" 
            className="w-full h-full object-cover grayscale opacity-60 hover:grayscale-0 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
        </div>
        <div className="space-y-8 lg:pl-12 anim-about">
          <h2 className="font-display-xl text-4xl font-light text-primary">The Quambiant Philosophy</h2>
          <p className="text-on-surface-variant font-body-md text-base leading-relaxed">
            Inspired by the principles of <strong>Quality & Ambiance</strong>, our designs prioritize the human experience. Every curve, every material, and every ray of light is intentional.
          </p>
          <div className="space-y-6">
            <PhilosophyItem icon="solar:crown-bold-duotone" title="Uncompromising Quality" desc="Sourcing the finest materials globally to ensure structural and aesthetic longevity." />
            <PhilosophyItem icon="solar:leaf-bold-duotone" title="Sustainable Innovation" desc="IGBC Platinum-compliant designs that respect the environment and your future." />
            <PhilosophyItem icon="solar:heart-bold-duotone" title="Client-Centricity" desc="Bespoke services tailored to the lifestyle of the modern connoisseur." />
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="mb-32">
        <div className="text-center mb-16 anim-about">
          <h2 className="font-display-xl text-4xl font-light">A Journey of Excellence</h2>
        </div>
        <div className="space-y-12 max-w-4xl mx-auto">
          <TimelineItem year="2012" title="The Foundation" desc="Aethelgard was established with a mission to redefine the urban skyline." />
          <TimelineItem year="2016" title="First Landmark" desc="Completion of 'The Obsidian Towers', setting a new benchmark for luxury in the Financial District." />
          <TimelineItem year="2020" title="Green Innovation Award" desc="Recognized for the first fully solar-powered residential complex in the region." />
          <TimelineItem year="2024" title="The Future: Aethelgard Hillside" desc="Launching our most ambitious project yet, a convergence of nature and high-tech living." />
        </div>
      </section>

      {/* Awards Section */}
      <section className="bg-surface-container/30 backdrop-blur-xl p-12 md:p-20 rounded-3xl border border-white/5 text-center anim-about">
        <h2 className="font-display-xl text-3xl font-light mb-12">Recognitions & Awards</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          <AwardItem icon="solar:star-bold-duotone" label="Best Luxury Project" year="2023" />
          <AwardItem icon="solar:medal-ribbon-bold-duotone" label="Sustainable Design" year="2022" />
          <AwardItem icon="solar:globus-bold-duotone" label="International Prestige" year="2021" />
          <AwardItem icon="solar:cup-bold-duotone" label="Developer of Year" year="2024" />
        </div>
      </section>
    </div>
  );
}

function PhilosophyItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex gap-5 group">
      <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all duration-500 shrink-0">
        <Icon icon={icon} className="text-2xl" />
      </div>
      <div>
        <h4 className="font-headline-md text-xl text-on-surface mb-1 font-light">{title}</h4>
        <p className="text-xs text-on-surface-variant leading-relaxed font-body-md">{desc}</p>
      </div>
    </div>
  );
}

function TimelineItem({ year, title, desc }: { year: string; title: string; desc: string }) {
  return (
    <div className="flex gap-8 group anim-about">
      <div className="text-primary font-display-xl text-2xl font-bold pt-1 shrink-0 w-20">{year}</div>
      <div className="border-l border-white/10 pl-8 pb-8 group-last:pb-0 relative">
        <div className="absolute left-[-5px] top-2 w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]"></div>
        <h4 className="font-headline-md text-xl text-on-surface mb-2 font-light">{title}</h4>
        <p className="text-sm text-on-surface-variant leading-relaxed font-body-md">{desc}</p>
      </div>
    </div>
  );
}

function AwardItem({ icon, label, year }: { icon: string; label: string; year: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Icon icon={icon} className="text-4xl text-primary/50 mb-2" />
      <p className="font-label-caps text-[10px] tracking-widest uppercase font-bold text-on-surface">{label}</p>
      <p className="text-xs text-primary font-display-xl">{year}</p>
    </div>
  );
}
